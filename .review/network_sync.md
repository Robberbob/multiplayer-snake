# Multiplayer Networking & Sync Audit — review-findings

- **Scope:** server/index.js, server/rooms.js, server/game-sync.js, client/js/network.js
- **Branch / commit:** feat/multiplayer / d240668da71026fa5145c025cdc06c0c4be870fa (read-only)
- **Focus areas:** race conditions on join/leave, disconnect cleanup, broadcast correctness, duplicate/missing snapshots, room capacity enforcement, reconnection robustness, server/client state consistency.
- **Confidence level:** high — all four files read fully; cross-file logic traced end-to-end.

---

## BLOCKER (must fix before shipping)

### B1: Server heartbeat terminates clients without cleaning game state if close event fails to fire

- **File:** server/index.js:489-499
- **Why it’s a bug:** The heartbeat marks `ws.isAlive = false`, then calls `ws.terminate()`. It relies on the `'close'` handler (line 473) to call `leaveRoom()` and clean up the player from room state. But:
  - If `terminate()` is called while the close event hasn't fired yet, there's a window where the socket is dead but the player still exists in `room.players`.
  - Under stress or with certain ws library behaviors (e.g., abrupt termination), the `'close'` event might not emit reliably. This leaves zombie players: they occupy slots, are included in snapshots/broadcasts, and can't be controlled, but never leave. Over time this fills rooms and exhausts capacity.
- **Suggested fix:**
  - In the heartbeat handler, before calling `ws.terminate()`, also inline the cleanup that the `'close'` handler does: call `leaveRoom(joinedPlayerId)` (or expose a helper) so state is cleaned regardless of event timing.
  - Alternatively, attach a one-shot listener on 'close' inside the heartbeat to guarantee cleanup.

### B2: Client wipes all handlers on disconnect; reconnect leaves client effectively deaf

- **File:** client/js/network.js:63-71
- **Why it’s a bug:** On `onclose`, `self._handlers = {}` clears every registered callback. The comment says "The multiplayer init routine will re-register them on the next welcome message," but:
  - There is no guarantee that the server sends another 'welcome' after reconnect (it only does for new joinRoom/createroom). If it doesn't, handlers never come back — the client is connected but ignores all messages.
  - Even if a welcome is sent, any handler registered dynamically after initial setup (e.g., by other modules) may not be re-registered by that init routine. So those channels go dead permanently.
  - Result: after one network glitch or page background/foreground cycle, the client stops responding to positions, deaths, chat, etc. This is catastrophic for a multiplayer game.
- **Suggested fix:**
  - Either:
    - Don't wipe handlers on reconnect; preserve them and let the game layer decide what's stale via server messages (e.g., new playerId).
    - Or keep only the handler-wipe behavior but provide a public `restoreHandlers()` method that the multiplayer init code calls after reconnection, ensuring all known event types are re-registered.

### B3: Reconnect creates a fresh player with no welcome guarantee — client may never know its identity

- **File:** client/js/network.js:77-79 + server/index.js joinroom handler
- **Why it’s a bug:** On reconnect, `self.connect()` opens a new WebSocket but does NOT send any 'joinroom' or re-auth message. The server treats this as a brand-new anonymous connection. If the game layer doesn't independently trigger a joinRoom after reconnect (and handlers are wiped — see B2), then:
  - Server never sends 'welcome'.
  - Client never learns its playerId, color, room, etc.
  - Player is effectively invisible and unplayable until manually re-joining via UI, if at all.
- **Suggested fix:**
  - On reconnect, the client should either:
    - Persist last-known `roomName`/`playerId` in memory or localStorage and send a 'rejoin' message; or
    - At minimum trigger its joinRoom logic immediately after `onopen` if it was previously in a room.

---

## MAJOR (wrong behavior, should be fixed before release)

### M1: Double-join to same room creates ghost players

- **File:** server/index.js:358-392
- **Why it’s a bug:** If the client sends two 'joinroom' messages for the SAME room name in quick succession (e.g., due to network retry or race between UI and auto-join), the handler at line 374 skips `leaveRoom` because `joinedRoomName === roomName`, then calls `joinRoom()` again, creating a second player entry with a new playerId.
  - The previous joinedPlayerId is overwritten locally but its entry remains in `room.players`.
  - That ghost player:
    - Occupies a slot (capacity leak).
    - Appears in broadcasts and snapshots.
    - Can be killed/collided-with, affecting game state unfairly.
- **Suggested fix:**
  - At the top of the 'joinroom' handler, if `joinedPlayerId` is already set for this connection:
    - Either refuse to re-join (send an error).
    - Or explicitly call `leaveRoom(joinedPlayerId)` first, even when target room is the same.

### M2: createroom handler never sets joinedRoomName — moves/chat silently fail

- **File:** server/index.js:432-459
- **Why it’s a bug:** After creating and joining a new room, `joinedPlayerId` is set (line 445), but `joinedRoomName` is NOT updated. All subsequent 'move' and 'chat' handlers (lines 396-418) look up `rooms[joinedRoomName]`. Since joinedRoomName still holds its old value (often null or a prior room name), those messages either:
  - Use the wrong room, or
  - Find no room at all and silently drop.
  - Result: players who used 'createroom' cannot move or chat until they re-join another room via joinroom.
- **Suggested fix:**
  - Add `joinedRoomName = newName;` after line 445 in the createroom handler.

### M3: broadcastRoom fallback can cause duplicate messages

- **File:** server/index.js:146-156 and server/game-sync.js:18-31
- **Why it’s a bug:** Both modules define their own `broadcastRoom`. In index.js version, for each alive player:
  - If they have a valid socket → send via safeSend.
  - Else if room.broadcast exists → call room.broadcast(msg).
  - But room.broadcast is expected to broadcast to ALL players (it's a convenience/fallback), not just the ones without sockets. So any time some players lack sockets, you get:
    - Individual sends for socket-having players.
    - Plus a blanket broadcast that may re-send to those same players.
  - This creates duplicate messages depending on how room.broadcast is wired (e.g., test harness or future adapter).
- **Suggested fix:**
  - Unify into a single broadcastRoom implementation.
  - If room.broadcast exists, use it exclusively; don't mix per-player sends with a global fallback in the same loop.

### M4: Room auto-creation race between ensureRoom and joinroom creates orphan rooms

- **File:** server/index.js:327-340 (ensureRoom) + 358-392 (joinroom handler)
- **Why it’s a bug:** On new connection, `ensureRoom()` is called immediately. If no rooms exist, it creates one and stores its name in joinedRoomName — but does NOT join the player to that room. Later, when the client sends 'joinroom' for some other (non-existent) name:
  - The handler sees the requested room doesn't exist → auto-creates a NEW room at line 363.
  - Now there are two rooms; one is empty and will never be used unless another join targets it by luck.
  - Over time this wastes resources (timers, intervals) and confuses clients that see extra rooms in getRooms responses.
- **Suggested fix:**
  - Either:
    - Have ensureRoom actually join the player to the created room; or
    - Don't create rooms in ensureRoom at all — let joinroom be the sole entry point for room creation.

### M5: processTurn broadcasts even when direction hasn't changed

- **File:** server/game-sync.js:54-63
- **Why it’s a bug (operational):** Every accepted turn is broadcast, including redundant ones where the client sends the same direction again. This isn't a correctness issue but adds unnecessary network load and processing on all clients — especially problematic if one client spams moves.
- **Suggested fix:**
  - Only set `p.direction` and broadcast when it differs from the current value.

---

## HIGH (important robustness/security issues)

### H1: No rate limiting or move throttling — easy to abuse

- **File:** server/index.js:395-408 (move handler)
- **Why it’s a bug:** A client can send 'move' messages as fast as the WebSocket allows. The cell anchoring check (`turnTolerance`) and 180° reversal guard are correctness checks, not rate limits. An abusive or buggy client could:
  - Flood other clients with turn broadcasts.
  - Consume server CPU on validation per message.
- **Suggested fix:**
  - Track last move timestamp per player; ignore moves faster than a minimum interval (e.g., TICK_MS / 2).

### H2: processTurn uses game-sync's broadcastRoom while index.js has its own — subtle divergence in behavior

- **File:** server/game-sync.js:18-31 vs server/index.js:146-156
- **Why it’s a bug:** Two different `broadcastRoom` implementations exist. The one in game-sync:
  - Does raw `socket.send(data)` with try/catch.
  - Uses the same alive-filtering logic but no readyState check (relies on catch).
  - Has its own fallback to room.broadcast.
  - index.js broadcastRoom uses safeSend with readyState guard and different fallback behavior.
  - If a player's socket is in an inconsistent state (e.g., CLOSING), one path may send while the other doesn't, causing some clients to miss turn broadcasts but still receive position updates — desync risk.
- **Suggested fix:**
  - Export a single broadcastRoom from game-sync and import it into index.js; remove the duplicate in index.js.

### H3: Player identity is tied only to socket; reconnect loses everything

- **File:** server/rooms.js:78 (playerId generation) + client/js/network.js
- **Why it’s a bug:** playerId is generated as `p_<timestamp>_<random>` on join — there's no persistent user ID. On reconnect:
  - New socket → new playerId → old player entry deleted via leaveRoom → all score, length, body lost.
  - No mechanism for rejoining under the same identity.
  - This is fine for a casual game but should be called out: it means "disconnect = death + reset" with no warning to other players.
- **Suggested fix (if persistent identity desired):**
  - Use an auth token or username in playerId generation so reconnects can restore the same player entry instead of creating a new one.

---

## MINOR (should be addressed; low blast radius)

### N1: getRooms and createRoom use 'type' while joinroom uses 'action' — protocol inconsistency

- **File:** client/js/network.js:120-155
- sendJSON for joinroom uses `{ action: 'joinroom', ... }`.
- getRooms uses `{ type: 'getrooms' }`.
- createRoom uses `{ type: 'createroom' }`.
- Server accepts both via `obj.action || obj.type`, but the inconsistency is confusing and error-prone. Standardize on one field name.

### N2: Hardcoded port in client doesn't match server config source of truth

- **File:** client/js/network.js:25
- Port 18081 is hardcoded in both places, which currently matches config.json. But if config changes, the JS must be updated separately. Derive from a shared config or environment variable where possible.

### N3: No explicit handling for 'positions' and 'snapshot' messages in network.js public API

- **File:** client/js/network.js
- The network layer provides sendJSON/on but no convenience methods (e.g., onPositions, onSnapshot). Consumers must wire these manually via `.on('positions', ...)`. Not a bug per se, but increases the chance of missed handlers after reconnect (see B2/B3).

### N4: Snapshot interval and turnTolerance are config-driven but not validated at startup

- **File:** server/game-sync.js:87-89 + server/index.js:401-404
- If `config.snapshotInterval` is 0, shouldBroadcastSnapshot would always return true (division/mod by zero avoided but `% 0` yields NaN in JS, so it'd be false — still confusing). If turnTolerance is negative or absurdly large, turns are accepted from any cell. A startup validation pass would prevent silent misconfiguration.

---

## NIT (cosmetic / maintainability)

- **NI1:** Two different `broadcastRoom` functions with near-identical logic should be a single shared utility.
- **NI2:** Comments like "Players may use either ws or socket" appear in both index.js and game-sync.js — suggest centralizing that abstraction.
- **NI3:** randomFreeCell() (index.js:56) has an early-break bug inside its nested loops (breaks the inner for, not the outer); it can return a cell occupied by another snake's body. Low impact because collisions are checked later, but should be fixed for correctness and performance.

---

End of audit.
