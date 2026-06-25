# Lobby & UI Flow Audit Findings

- **Scope:** lobby creation/join flows, room list handling, lobby ↔ game transitions, and related network wiring.
- **Branch / commit:** feat/multiplayer @ d240668da71026fa5145c025cdc06c0c4be870fa
- **Files reviewed:**
  - client/js/lobby.js
  - client/index.html
  - server/rooms.js (lobby-relevant portions)
  - client/js/network.js (lobby-relevant messages and handlers)
- **Confidence level:** High for correctness issues in lobby flow; medium where behavior depends on game.js integration (not fully reviewed here).

---

## BLOCKER

### B1: Prototype-pollution / arbitrary key via roomName in joinRoom

- **File:** server/rooms.js:72
- **Description:** `joinRoom` uses the client-supplied `roomName` directly as a property key on the shared `rooms` object (`const room = rooms[roomName]`). If an attacker sends a crafted room name like `"__proto__"` or `"constructor"`, they can modify the prototype of all objects in this process.
- **Why it’s a bug:** Classic JavaScript prototype pollution vector. Can lead to DoS, behavior changes across all modules that use plain objects.
- **Suggested fix:**
  - Validate roomName: allow only alphanumeric + spaces (e.g., `/^[A-Za-z0-9 ]+$/`).
  - Optionally use `Object.create(null)` for the rooms container or a Map to avoid prototype-related issues entirely.

### B2: Lobby can be hidden before join succeeds → orphaned UI state

- **File:** client/js/lobby.js:57–58
- **Description:** `joinRoom(roomName)` hides the lobby (`this.hide()`) before sending the join request to the server. If:
  - the room is full,
  - the name is invalid,
  - or there’s a network error,
  then the lobby disappears and no game view appears — user sees only canvas/menu with no controls or feedback.
- **Why it’s a bug:** The UI becomes unrecoverable without reload. User cannot tell what went wrong or get back to the lobby.
- **Suggested fix:**
  - Do not hide lobby until server confirms join (e.g., on `welcome`/`joined_room`).
  - Or: if you keep early hide, add a fallback: show an error message and re-show lobby if join fails or times out.

---

## MAJOR

### M1: Inconsistent network reference in joinRoom vs createRoom

- **File:** client/js/lobby.js:52–58
- **Description:** 
  - `createRoom()` uses `this.network.createRoom()`.
  - `joinRoom(roomName)` uses `this.game.network.joinRoom(roomName)`.
- **Why it’s a bug:** If `this.network` and `this.game.network` are not guaranteed to be the exact same instance, join messages may go out on a different (possibly stale or disconnected) socket. This is fragile, inconsistent, and hard to debug; future refactors can break silently.
- **Suggested fix:**
  - Use a single canonical reference: `this.network.joinRoom(roomName)` in both cases.
  - Ensure LobbyController is constructed with the same network instance used by game.js.

### M2: Direct overwrite of lobby handlers on network object (race/overwrite risk)

- **File:** client/js/lobby.js:28–35
- **Description:** LobbyController assigns directly to `this.network.onRooms` and `this.network.onRoomCreated` instead of using the existing event system (`network.on(...)`). If another module also sets these properties, it overwrites the previous handler.
- **Why it’s a bug:** Creates a hidden race condition: whichever code runs last wins; others’ handlers silently stop working (e.g., analytics, logging, or future features). Also mixes two different patterns in network.js (event list vs direct property), which is error-prone.
- **Suggested fix:**
  - Use the event-based pattern consistently: `this.network.on('room_created', ...)` and `this.network.on('rooms', ...)`.
  - Preferably via `_wireLobbyHandlers` instead of ad-hoc assignments.

### M3: _wireLobbyHandlers defined but never invoked → dead code / wiring confusion

- **File:** client/js/network.js:158–168
- **Description:** The method `_wireLobbyHandlers()` sets up `on('rooms')` and `on('room_created')` callbacks, but there is no call to it in network.js or lobby.js. Lobby currently bypasses this by writing directly to `network.onRooms`.
- **Why it’s a bug:** This dead code implies an incomplete integration: if someone removes the direct assignments thinking `_wireLobbyHandlers` does the job, lobby stops working. It’s a maintenance hazard and indicates a broken wiring contract between modules.
- **Suggested fix:**
  - Either call `_wireLobbyHandlers()` from `network.prototype.connect` after open (or from LobbyController constructor), or remove it if unused.

### M4: Room list can go stale; no refresh-on-interaction guard

- **File:** client/js/lobby.js:38–49
- **Description:** 
  - `show()` calls `loadRooms()` once when lobby is displayed. After that, there’s no periodic refresh or refresh-on-focus. If the server state changes (rooms fill, empty, or are deleted), the list becomes stale until the user leaves and reopens the lobby.
- **Why it’s a bug:** Users may attempt to join rooms that are now full or gone; no feedback mechanism is in place to correct this mismatch.
- **Suggested fix:**
  - Periodically refresh (e.g., every 3–5 seconds while lobby is visible).
  - Or at least re-fetch rooms on each lobby show and when the user clicks “Join” (if server rejects due to full/missing room, refresh list + show message).

### M5: No error handling / feedback for createRoom or getRooms failures

- **File:** client/js/lobby.js:51–53; client/js/network.js:140–155
- **Description:** 
  - `createRoom()` sends a createroom message but never checks the response. If the server rejects it (max rooms, internal error), lobby just sits there with no feedback.
  - `getRooms()` similarly has no timeout or failure handling; if server is slow/unreachable, user sees empty/stale list indefinitely.
- **Why it’s a bug:** Silent failures degrade UX and can trap users in an ambiguous state (did my room create? why isn’t anything happening?).
- **Suggested fix:**
  - Wire handlers for error-type messages from the server into lobby-status.
  - Add timeouts: if no rooms response within N seconds, show “Unable to load rooms” instead of blank list.

### M6: Socket reconnect wipes all handlers → possible lobby/game desync

- **File:** client/js/network.js:71
- **Description:** On `onclose`, `self._handlers = {};` clears all registered callbacks. After reconnection, if the server still considers this client in a room (e.g., welcome was previously sent), but handlers are wiped and never re-bound correctly, the client will silently ignore game messages while thinking it’s back in lobby or menu.
- **Why it’s a bug:** Race between reconnect and state reconciliation: user can be “ghosted” — connected on server, ignored by client — with no way to recover except reload.
- **Suggested fix:**
  - On reconnect (in `onopen`), emit a custom event like `'reconnected'` so game.js/lobby.js can re-register handlers and request current state.
  - Or preserve handler sets across reconnects instead of wiping them unconditionally.

---

## MINOR

### S1: No null / type guard in renderRoomList(rooms)

- **File:** client/js/lobby.js:64
- **Description:** `rooms.forEach(...)` assumes rooms is always an array. If the server sends a malformed message (null, object, etc.), this throws and can break lobby rendering entirely.
- **Why it’s a bug:** Unhandled TypeError on unexpected input; lobby becomes unusable until reload.
- **Suggested fix:**
  - Guard: `if (!Array.isArray(rooms)) { rooms = []; }` before forEach.

### S2: Player ID collision risk in joinRoom

- **File:** server/rooms.js:78
- **Description:** Player IDs are generated with `Date.now()` and a short random segment. Under high load (many joins per ms), collisions become possible; if two players get the same ID, one overwrites the other’s entry.
- **Why it’s a bug:** Can cause silent player replacement or disconnection confusion in multiplayer rooms.
- **Suggested fix:**
  - Use a more robust ID generator: crypto.randomUUID() (if available) or a longer random suffix; e.g., `p_${Date.now().toString(36)}_${crypto.randomUUID?.()?.replace(/-/g,'') ?? Math.random().toString(36).slice(2,10)}`.

### S3: Buttons not disabled while connecting / reconnecting

- **File:** client/index.html + lobby.js
- **Description:** “Create Room” and join buttons are always enabled. If the WebSocket is still connecting or in a reconnect window, clicks result in silent no-op (logged only to console).
- **Why it’s a bug:** Users can click with no feedback; feels broken rather than “connecting.”
- **Suggested fix:**
  - Disable lobby action buttons when `network.connected === false` and re-enable on connect.

### S4: Exposed rooms object via module.exports

- **File:** server/rooms.js:120–126
- **Description:** The internal `rooms` map is exported directly, allowing any caller to mutate it arbitrarily (e.g., delete rooms, inject players).
- **Why it’s a bug:** Breaks encapsulation; increases risk of accidental corruption or race conditions from other modules.
- **Suggested fix:**
  - Export only functions and provide an accessor like `getRoom(name)` / `listRooms()` instead of exposing the raw object.

---

## NIT

### N1: Lobby uses innerHTML for room rows → minor security/perf concern

- **File:** client/js/lobby.js:67–71
- **Description:** Room names are interpolated directly into HTML via template literals and `innerHTML`. If server ever echoes back user-controlled strings (e.g., custom room names), this becomes an XSS vector. Currently safe, but fragile.
- **Why it’s a bug:** Not exploitable today with auto-generated Greek-letter names, but any future change allowing arbitrary room names would immediately introduce XSS via this pattern.
- **Suggested fix:**
  - Use `document.createElement` / `textContent` for user-displayed values instead of innerHTML interpolation.

### N2: No visual distinction between lobby and game menus on failure

- **File:** client/index.html + lobby.js
- **Description:** The lobby div is nested inside the main menu. If lobby is hidden but game init fails, there’s no clear path back to a functional UI state; user sees static canvas/menu with no context.
- **Why it’s a bug:** Not fatal, but poor UX and hard to diagnose in production.
- **Suggested fix:**
  - Add a small “Back to Lobby” or “Return to Menu” button that appears on game init failure or timeout.
