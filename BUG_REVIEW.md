# Multiplayer Snake — Bug Review (feat/multiplayer)

- **Repository:** https://github.com/Robberbob/multiplayer-snake.git
- **Branch:** feat/multiplayer
- **Commit:** d240668da71026fa5145c025cdc06c0c4be870fa
- **Date:** 2026-06-15

**Scope and methodology:**
This review is a merged, deduplicated summary of per-area audits performed on the multiplayer feature branch. The following areas were audited:

- Lobby & UI flow (lobby_ui.md)
- Networking & sync (network_sync.md)

The following intended audit areas did not produce reports and are considered incomplete:

- Game logic
- Input / key handling
- Dedicated security deep-dive (security-relevant findings are included below as identified during the lobby/network audits)
- General / cross-cutting notes

Findings are grouped by severity, each with file path(s), description, rationale, and a concise suggested fix.

---

## BLOCKER (must fix before shipping)

### B1: Prototype pollution via roomName in joinRoom

- **Severity:** BLOCKER
- **File:** server/rooms.js:72
- **Description:** `joinRoom` uses the client-supplied `roomName` directly as a property key on the shared `rooms` object. An attacker can send crafted names like `"__proto__"` or `"constructor"`.
- **Why it’s a bug:** Classic JavaScript prototype pollution vector; can lead to DoS, behavior changes across all modules using plain objects.
- **Suggested fix:**
  - Validate roomName: allow only alphanumeric + spaces (e.g., `/^[A-Za-z0-9 ]+$/`).
  - Preferably use `Object.create(null)` for the rooms container or a `Map` to avoid prototype issues entirely.

### B2: Lobby hidden before join succeeds → orphaned, unrecoverable UI

- **Severity:** BLOCKER
- **File:** client/js/lobby.js:57–58
- **Description:** `joinRoom(roomName)` hides the lobby immediately before sending the join request. If the room is full, invalid, or there’s a network error, the lobby disappears and no game view appears — user sees only canvas/menu with no controls or feedback.
- **Why it’s a bug:** UI becomes unrecoverable without reload; user cannot tell what went wrong or get back to lobby.
- **Suggested fix:**
  - Do not hide lobby until server confirms join (e.g., on `welcome`/`joined_room`).
  - Or: if early hide is kept, add fallback: show error and re-show lobby on failure or timeout.
- **Status:** FIXED ✓
- **Fix applied:** Added error handler + 3s recovery timeout in lobby.js; added recovery timer cleanup in game.js _initMultiplayerGame.

### B3: Heartbeat terminates clients without cleaning game state → zombie players
- **Status:** FIXED ✓ (added ws._joinedPlayerId on WS object; inline leaveRoom() before ws.terminate() in heartbeat handler)

- **Severity:** BLOCKER
- **File:** server/index.js:489–499
- **Description:** The heartbeat marks `ws.isAlive = false` then calls `ws.terminate()`, relying on the `'close'` handler to call `leaveRoom()` and clean up. If `terminate()` is called before or without a reliable `'close'` event, the player remains in `room.players`.
- **Why it’s a bug:** Zombie players occupy slots, appear in snapshots/broadcasts, can’t be controlled; over time rooms fill and capacity is exhausted.
- **Suggested fix:**
  - In the heartbeat handler, before calling `ws.terminate()`, also inline the cleanup that `'close'` does: call `leaveRoom(joinedPlayerId)` (or expose a helper) so state is cleaned regardless of event timing.
- **Status:** FIXED ✓
- **Fix applied:** Added ws._joinedPlayerId on WS object; inline leaveRoom() before ws.terminate() in heartbeat handler.

### B4: Client wipes all handlers on disconnect; reconnect leaves client deaf
- **Status:** FIXED ✓ (removed self._handlers = {} from onclose - handlers now persist across reconnects)

- **Severity:** BLOCKER
- **File:** client/js/network.js:63–71
- **Description:** On `onclose`, `self._handlers = {}` clears every registered callback. There is no guarantee the server sends another 'welcome' after reconnect to re-trigger handler registration; dynamically added handlers may never be restored.
- **Why it’s a bug:** After one network glitch or tab background/foreground cycle, the client stops responding to positions, deaths, chat, etc. Catastrophic for multiplayer.
- **Suggested fix:**
  - Either:
    - Don’t wipe handlers on reconnect; preserve them and let game layer decide what’s stale via server messages (e.g., new playerId).
    - Or keep the wipe but provide a public `restoreHandlers()` method that the multiplayer init code calls after reconnection, ensuring all known event types are re-registered.
- **Status:** FIXED ✓
- **Fix applied:** Removed self._handlers = {} from onclose — handlers now persist across reconnects.

### B5: Reconnect creates fresh connection with no welcome guarantee — client may never know its identity

- **Severity:** BLOCKER
- **File:** client/js/network.js:77–79 + server/index.js (joinroom handler)
- **Description:** On reconnect, `self.connect()` opens a new WebSocket but does NOT send any 'joinroom' or re-auth message. The server treats it as anonymous; if game layer doesn’t independently trigger joinRoom after reconnect, the server never sends 'welcome', and client never learns playerId/color/room.
- **Why it’s a bug:** Player becomes invisible and unplayable until manually rejoining via UI (if at all).
- **Suggested fix:**
  - On reconnect, either:
    - Persist last-known `roomName`/`playerId` in memory or localStorage and send a 'rejoin' message; or
    - At minimum trigger its joinRoom logic immediately after `onopen` if it was previously in a room.
- **Status:** FIXED ✓
- **Fix applied:** Auto-rejoin last room on reconnect (network.js); updated game.js welcome guard to allow re-init when playerId differs.

---

## MAJOR (wrong behavior; should be fixed before release)

### M1: Double-join to same room creates ghost players

- **Severity:** MAJOR
- **File:** server/index.js:358–392
- **Description:** If the client sends two 'joinroom' messages for the same room quickly (e.g., due to network retry), the handler skips `leaveRoom` because `joinedRoomName === roomName`, then calls `joinRoom()` again with a new playerId. The previous player entry remains in `room.players`.
- **Why it’s a bug:** Ghost player occupies a slot, appears in broadcasts/snapshots, can be killed/collided-with; capacity leak and unfair gameplay impact.
- **Suggested fix:**
  - If `joinedPlayerId` is already set for this connection:
    - Either refuse to re-join (send an error), or
    - Explicitly call `leaveRoom(joinedPlayerId)` first, even when target room is the same.
- **Status:** FIXED ✓
- **Fix applied:** Always call leaveRoom() before joinRoom even for same-room double joins, preventing ghost player entries.

### M2: createroom handler never sets joinedRoomName — moves/chat silently fail

- **Severity:** MAJOR
- **File:** server/index.js:432–459
- **Description:** After creating and joining a new room, `joinedPlayerId` is set but `joinedRoomName` is not updated. Subsequent 'move' and 'chat' handlers use `rooms[joinedRoomName]`, which may be null or an old value; messages are silently dropped or routed to wrong room.
- **Why it’s a bug:** Players who used 'createroom' cannot move or chat until they rejoin another room via joinroom.
- **Suggested fix:**
  - Add `joinedRoomName = newName;` after setting `joinedPlayerId` in the createroom handler.
- **Status:** FIXED ✓
- **Fix applied:** Added missing joinedRoomName = newName; in createroom handler after setting joinedPlayerId.

### M3: broadcastRoom fallback can cause duplicate messages

- **Severity:** MAJOR
- **File:** server/index.js:146–156 and server/game-sync.js:18–31
- **Description:** Both modules define their own `broadcastRoom`. In index.js, for each alive player with a valid socket it sends via safeSend; if socket missing but room.broadcast exists, it calls room.broadcast. If room.broadcast is wired to all players, those same players can receive messages twice (once individually and once via broadcast).
- **Why it’s a bug:** Duplicate messages on the wire depending on how room.broadcast is implemented; clients may process events multiple times.
- **Suggested fix:**
  - Unify into a single `broadcastRoom` implementation. If room.broadcast exists, use it exclusively; don’t mix per-player sends with a global fallback in the same loop.
- **Status:** FIXED ✓
- **Fix applied:** Removed room.broadcast() fallback from broadcastRoom in both server/index.js and server/game-sync.js.

### M4: Room auto-creation race between ensureRoom and joinroom creates orphan rooms

- **Severity:** MAJOR
- **File:** server/index.js:327–340 (ensureRoom) + 358–392 (joinroom handler)
- **Description:** On new connection, `ensureRoom()` is called immediately. If no rooms exist, it creates one and stores its name in joinedRoomName but does NOT join the player. Later, when client sends 'joinroom' for a different non-existent name, a NEW room is created. The first is empty and unused unless another join targets it by luck.
- **Why it’s a bug:** Wastes resources (timers/intervals), confuses clients that see extra rooms in getRooms responses.
- **Suggested fix:**
  - Either:
    - Have `ensureRoom` actually join the player to the created room; or
    - Don’t create rooms in ensureRoom at all — let joinroom be the sole entry point for room creation.
- **Status:** FIXED ✓
- **Fix applied:** Removed entire ensureRoom() function — joinroom handler already auto-creates non-existent rooms, preventing orphan empty rooms.

### M5: No rate limiting / move throttling — easy to abuse

- **Severity:** MAJOR
- **File:** server/index.js:395–408 (move handler)
- **Description:** A client can send 'move' messages as fast as the WebSocket allows. The cell anchoring check and 180° reversal guard are correctness checks, not rate limits. An abusive or buggy client could flood other clients with turn broadcasts and consume server CPU on validation per message.
- **Why it’s a bug:** Trivial to abuse; impacts all players in room via extra network load and processing.
- **Suggested fix:**
  - Track last move timestamp per player; ignore moves faster than a minimum interval (e.g., TICK_MS / 2).
- **Status:** FIXED ✓
- **Fix applied:** Added per-player lastMoveTime tracking; move handler silently drops moves faster than TICK_MS/2 (25ms).

### M6: Two divergent broadcastRoom implementations → subtle desync risk

- **Severity:** MAJOR
- **File:** server/game-sync.js:18–31 vs server/index.js:146–156
- **Description:** Two different `broadcastRoom` functions exist with different send semantics. game-sync uses raw `socket.send(data)` with try/catch and no readyState check; index.js uses safeSend with readyState guard. If a socket is in CLOSING, one path may send while the other doesn’t → some clients miss turn broadcasts but still receive position updates.
- **Why it’s a bug:** Desync risk: different paths handle edge cases differently for same room.
- **Suggested fix:**
  - Export a single `broadcastRoom` from game-sync and import into index.js; remove the duplicate in index.js.

### M7: Player identity tied only to socket — reconnect loses everything, no warning

- **Severity:** MAJOR (design concern)
- **File:** server/rooms.js:78 + client/js/network.js
- **Description:** playerId is generated as `p_<timestamp>_<random>` on join with no persistent user ID. On reconnect: new socket → new playerId → old player entry deleted via leaveRoom → all score, length, body lost, with no mechanism for rejoining under same identity and no warning to others.
- **Why it’s a bug:** For casual use acceptable in principle, but currently "disconnect = death + reset" happens silently; combined with B4/B5 this makes the game feel broken on brief network issues.
- **Suggested fix (if persistent identity desired):**
  - Use an auth token or username in playerId generation so reconnects can restore the same player entry instead of creating a new one.

### M8: Inconsistent protocol fields — 'type' vs 'action' across messages

- **Severity:** MAJOR (maintainability / correctness)
- **File:** client/js/network.js:120–155 + server/index.js
- **Description:** sendJSON for joinroom uses `{ action: 'joinroom', ... }`, while getRooms uses `{ type: 'getrooms' }` and createRoom uses `{ type: 'createroom' }`. Server accepts both via `obj.action || obj.type`, but the inconsistency is confusing, error-prone, and invites bugs.
- **Why it’s a bug:** Increases risk of misrouting or silent drops if any handler only checks one field; makes protocol harder to maintain.
- **Suggested fix:**
  - Standardize on one field name (e.g., `type`) across all message types client→server and server→client.

### M9: Inconsistent network reference in joinRoom vs createRoom

- **Severity:** MAJOR
- **File:** client/js/lobby.js:52–58
- **Description:** `createRoom()` uses `this.network.createRoom()`, but `joinRoom(roomName)` uses `this.game.network.joinRoom(roomName)`. If these are not guaranteed to be the same instance, join messages may go out on a different (possibly stale/disconnected) socket.
- **Why it’s a bug:** Fragile wiring; future refactors can break silently; hard to debug.
- **Suggested fix:**
  - Use a single canonical reference: `this.network.joinRoom(roomName)` in both cases, ensuring LobbyController is constructed with the same network instance used by game.js.

### M10: Direct overwrite of lobby handlers on network object (race/overwrite risk)

- **Severity:** MAJOR
- **File:** client/js/lobby.js:28–35
- **Description:** LobbyController assigns directly to `this.network.onRooms` and `this.network.onRoomCreated` instead of using the existing event system (`network.on(...)`). If another module also sets these properties, it overwrites previous handlers.
- **Why it’s a bug:** Hidden race condition: whichever code runs last wins; others’ handlers silently stop working.
- **Suggested fix:**
  - Use the event-based pattern consistently: `this.network.on('room_created', ...)` and `this.network.on('rooms', ...)`, preferably via `_wireLobbyHandlers`.

### M11: _wireLobbyHandlers defined but never invoked → dead code / wiring confusion

- **Severity:** MAJOR
- **File:** client/js/network.js:158–168
- **Description:** `_wireLobbyHandlers()` sets up `on('rooms')` and `on('room_created')`, but there is no call to it. Lobby currently bypasses this by writing directly to `network.onRooms`. If someone removes the direct assignments assuming `_wireLobbyHandlers` does the job, lobby stops working.
- **Why it’s a bug:** Maintenance hazard; broken wiring contract between modules.
- **Suggested fix:**
  - Either call `_wireLobbyHandlers()` from `network.prototype.connect` after open (or LobbyController constructor), or remove it if unused.

### M12: Room list can go stale; no refresh-on-interaction guard

- **Severity:** MAJOR
- **File:** client/js/lobby.js:38–49
- **Description:** `show()` calls `loadRooms()` once when lobby is displayed. No periodic refresh or refresh-on-focus exists. If server state changes (rooms fill, empty, deleted), the list becomes stale until user leaves and reopens lobby.
- **Why it’s a bug:** Users may attempt to join rooms that are now full/gone; no feedback mechanism corrects this mismatch.
- **Suggested fix:**
  - Periodically refresh (e.g., every 3–5 seconds while lobby is visible), or at minimum re-fetch on each lobby show and when user clicks "Join" if server rejects due to full/missing room.

### M13: No error handling / feedback for createRoom or getRooms failures

- **Severity:** MAJOR
- **File:** client/js/lobby.js:51–53; client/js/network.js:140–155
- **Description:** `createRoom()` sends a createroom message but never checks the response. If server rejects (max rooms, internal error), lobby just sits there with no feedback. `getRooms()` similarly has no timeout or failure handling.
- **Why it’s a bug:** Silent failures degrade UX; users can be stuck in an ambiguous state ("did my room create?").
- **Suggested fix:**
  - Wire handlers for error-type messages from server into lobby-status element. Add timeouts: if no rooms response within N seconds, show "Unable to load rooms" instead of blank list.

### M14: processTurn broadcasts even when direction hasn't changed

- **Severity:** MAJOR (operational)
- **File:** server/game-sync.js:54–63
- **Description:** Every accepted turn is broadcast, including redundant ones where client sends the same direction again. Not a correctness issue but adds unnecessary network load and processing on all clients — especially problematic if one client spams moves.
- **Why it’s a bug:** Unnecessary bandwidth and CPU; becomes impactful under abuse or many players.
- **Suggested fix:**
  - Only set `p.direction` and broadcast when it differs from the current value.

### M15: Hardcoded port in client doesn’t match server config source of truth

- **Severity:** MAJOR (operational)
- **File:** client/js/network.js:25
- **Description:** Port 18081 is hardcoded in both places; if config changes, JS must be updated separately.
- **Why it’s a bug:** Operational risk: configuration drift between server and client.
- **Suggested fix:**
  - Derive from a shared config or environment variable where possible (e.g., embedded at build time).

### M16: No explicit handling for 'positions' and 'snapshot' messages in network.js public API

- **Severity:** MAJOR (maintainability)
- **File:** client/js/network.js
- **Description:** The network layer provides sendJSON/on but no convenience methods (e.g., onPositions, onSnapshot). Consumers must wire these manually via `.on('positions', ...)`. Increases the chance of missed handlers after reconnect.
- **Why it’s a bug:** Adds wiring complexity and fragility; ties into B4/B5 reconnection issues.
- **Suggested fix:**
  - Add convenience methods or typed handler helpers for core multiplayer events (positions, snapshot, etc.).

### M17: Snapshot interval and turnTolerance are config-driven but not validated at startup

- **Severity:** MAJOR (robustness)
- **File:** server/game-sync.js:87–89 + server/index.js:401–404
- **Description:** If `config.snapshotInterval` is 0, `% 0` yields NaN in JS → shouldBroadcastSnapshot always false. If turnTolerance is negative or absurdly large, turns are accepted from any cell. No startup validation pass exists.
- **Why it’s a bug:** Silent misconfiguration can break game sync and movement logic.
- **Suggested fix:**
  - Add a startup validation routine that checks critical config values and fails fast with clear errors if out of reasonable range.

---

## MINOR (should be addressed; low blast radius)

### S1: No null / type guard in renderRoomList(rooms)

- **Severity:** MINOR
- **File:** client/js/lobby.js:64
- **Description:** `rooms.forEach(...)` assumes rooms is always an array. If server sends a malformed message (null, object), this throws and can break lobby rendering entirely.
- **Why it’s a bug:** Unhandled TypeError on unexpected input; lobby unusable until reload.
- **Suggested fix:**
  - Guard: `if (!Array.isArray(rooms)) { rooms = []; }` before forEach.

### S2: Player ID collision risk in joinRoom

- **Severity:** MINOR
- **File:** server/rooms.js:78
- **Description:** Player IDs are generated with `Date.now()` and a short random segment. Under high load (many joins per ms), collisions become possible; if two players get the same ID, one overwrites the other’s entry.
- **Why it’s a bug:** Can cause silent player replacement or disconnection confusion in multiplayer rooms.
- **Suggested fix:**
  - Use a more robust generator: `crypto.randomUUID()` (if available) or a longer random suffix; e.g., `p_${Date.now().toString(36)}_${randomSegment}` with at least 8 chars of randomness.

### S3: Buttons not disabled while connecting / reconnecting

- **Severity:** MINOR
- **File:** client/index.html + lobby.js
- **Description:** "Create Room" and join buttons are always enabled. If WebSocket is still connecting or in a reconnect window, clicks result in silent no-op (logged only to console).
- **Why it’s a bug:** Users can click with no feedback; feels broken rather than "connecting."
- **Suggested fix:**
  - Disable lobby action buttons when `network.connected === false` and re-enable on connect.

### S4: Exposed rooms object via module.exports

- **Severity:** MINOR
- **File:** server/rooms.js:120–126
- **Description:** The internal `rooms` map is exported directly, allowing any caller to mutate it arbitrarily (delete rooms, inject players).
- **Why it’s a bug:** Breaks encapsulation; increases risk of accidental corruption or race conditions from other modules.
- **Suggested fix:**
  - Export only functions and provide accessors like `getRoom(name)` / `listRooms()` instead of exposing the raw object.

### S5: randomFreeCell() has early-break bug in nested loops

- **Severity:** MINOR
- **File:** server/index.js:56 (approx)
- **Description:** `randomFreeCell()` uses a break inside its inner loop; it breaks only that inner for, not the outer. This means after finding an occupied cell in one row, it continues scanning subsequent rows instead of restarting the random selection. It can return a cell occupied by another snake’s body. Collisions are checked later so impact is limited, but logic is wrong and performance degrades on crowded boards.
- **Why it’s a bug:** Incorrect control flow; can place food on existing bodies unnecessarily; slower than intended.
- **Suggested fix:**
  - Use labeled break or restructure loops so that when an occupied cell is found the entire attempt aborts and a new random cell is chosen.

---

## NIT / STYLE (cosmetic, maintainability, low risk)

### N1: Lobby uses innerHTML for room rows → minor XSS fragility

- **Severity:** NIT
- **File:** client/js/lobby.js:67–71
- **Description:** Room names are interpolated directly into HTML via template literals and `innerHTML`. Currently safe (auto-generated Greek-letter names), but if server ever echoes user-controlled strings, this becomes an immediate XSS vector.
- **Why it’s a bug:** Not exploitable today; fragile pattern that will break badly when requirements change.
- **Suggested fix:**
  - Use `document.createElement` / `textContent` for user-displayed values instead of innerHTML interpolation.

### N2: No visual distinction between lobby and game menus on failure

- **Severity:** NIT
- **File:** client/index.html + lobby.js
- **Description:** Lobby div is nested inside main menu. If lobby is hidden but game init fails, there’s no clear path back to a functional UI state; user sees static canvas/menu with no context.
- **Why it’s a bug:** Not fatal, but poor UX and hard to diagnose in production.
- **Suggested fix:**
  - Add a small "Back to Lobby" or "Return to Menu" button that appears on game init failure or timeout.

### N3: Two broadcastRoom functions with near-identical logic should be unified

- **Severity:** NIT (maintainability)
- **File:** server/index.js + server/game-sync.js
- **Description:** Duplicate, near-identical `broadcastRoom` implementations; already flagged as MAJOR M6 for behavioral divergence, but even ignoring that, maintaining two copies is error-prone.
- **Suggested fix:**
  - Centralize into a single shared utility (see M3/M6).

### N4: Scattered comments about ws/socket handling should be centralized

- **Severity:** NIT
- **File:** server/index.js + server/game-sync.js
- **Description:** Comments like "Players may use either ws or socket" appear in multiple files. Centralizing this abstraction and documentation would reduce confusion.
- **Suggested fix:**
  - Define a single, well-documented send/broadcast abstraction instead of repeating explanations inline.

---

## Recommended next steps (prioritized)

1. Fix BLOCKERs first — they will make the multiplayer feature unstable or unrecoverable:
   - B4/B5: Reconnection is fundamentally broken; fix handler wipe and identity loss.
   - B3: Ensure heartbeat always cleans game state to prevent zombie players.
   - B2: Don’t hide lobby before server confirms join.
   - B1: Defend against prototype pollution in roomName handling.

2. Address MAJOR correctness issues (M1–M8):
   - M2 is a quick fix and currently blocks movement/chat for createRoom users.
   - M1, M4 reduce ghost players and orphan rooms.
   - M3/M6 unify broadcastRoom to eliminate desync risk.
   - M5 adds rate limiting to protect against abuse.

3. Address MAJOR robustness / wiring issues (M9–M17):
   - Standardize protocol fields (M8).
   - Fix lobby network reference and handler wiring (M9/M10/M11).
   - Add error feedback for createRoom/getRooms failures (M13).
   - Validate config at startup (M17).

4. Tidy MINOR issues (S1–S5) in a follow-up pass:
   - Input guards, ID collision risk, button states, encapsulation of rooms object, and randomFreeCell loop fix.

5. Apply NIT/style improvements (N1–N4):
   - Safer DOM rendering, clearer failure UI, centralizing repeated utilities/comments.

6. Run dedicated audits for currently incomplete areas:
   - Game logic (collision, scoring, turn handling).
   - Input / key handling races and edge cases.
   - Security deep-dive beyond prototype pollution (auth, message validation, etc.).
