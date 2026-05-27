'use strict';
const { processTurn, buildSnapshot, shouldBroadcastSnapshot } = require('./game-sync');
const { rooms } = require('./rooms');

// ---------------------------------------------------------------------------
// Helper: create a mock room with one player (or more if needed).
// ---------------------------------------------------------------------------
function makeRoom(name) {
  rooms[name] = {
    players: {
      'p1': { id: 'p1', color: '#ff0000', x: 5, y: 5, direction: 'right', alive: true, score: 10 }
    },
    food: [{ x: 8, y: 5, type: 'normal' }],
    tickCount: 9,
    broadcast: function(msg) { this._lastMsg = msg; }   // test harness stub
  };
}

// ---------------------------------------------------------------------------
// Tests — cell anchoring tolerance
// ---------------------------------------------------------------------------
const roomName = 'test-room';
makeRoom(roomName);
const room = rooms[roomName];

// Valid turn (within tolerance of 1)
let ok = processTurn(room, 'p1', 'down', 5, 5);
console.assert(ok === true, 'Valid turn accepted');

// Out-of-tolerance cell (distance 5 > tolerance 1)
ok = processTurn(room, 'p1', 'down', 10, 10);
console.assert(ok === false, 'Out-of-tolerance rejected');

// Edge-of-tolerance: exactly within tolerance should pass (use non-reversing direction).
ok = processTurn(room, 'p1', 'left', 6, 5);   // |6-5| = 1 <= tolerance 1; left ≠ opposite of down
console.assert(ok === true, 'Edge-of-tolerance accepted');

// ---------------------------------------------------------------------------
// Tests — 180-degree reversal blocking
// ---------------------------------------------------------------------------
// Player is now going 'left' after the last accepted turn above.
ok = processTurn(room, 'p1', 'right', 5, 5); // right reverses left → blocked
console.assert(ok === false, '180° reversal (left→right) blocked');

// Perpendicular direction should be fine.
ok = processTurn(room, 'p1', 'up', 5, 5);     // up ≠ opposite of left
console.assert(ok === true, 'Perpendicular turn accepted');

// ---------------------------------------------------------------------------
// Tests — dead player rejection
// ---------------------------------------------------------------------------
room.players['p1'].alive = false;
ok = processTurn(room, 'p1', 'right', 5, 5);
console.assert(ok === false, 'Dead player turn rejected');

// Non-existent player ID
ok = processTurn(room, 'ghost', 'right', 5, 5);
console.assert(ok === false, 'Non-existent player rejected');

// ---------------------------------------------------------------------------
// Tests — snapshot broadcast decision
// ---------------------------------------------------------------------------
room.tickCount = 9;
room.players['p1'].alive = true; // bring the player back for snapshot tests
console.assert(shouldBroadcastSnapshot(room) === false, 'tick 9 → no snapshot (interval=10)');

room.tickCount = 10;
const snap = buildSnapshot(room);
console.assert(snap.type === 'snapshot', 'Snapshot type correct');
console.assert(snap.players.length > 0, 'Snapshot has players');

// Dead player excluded from snapshot.
room.players['p1'].alive = false;
const snap2 = buildSnapshot(room);
console.assert(snap2.players.length === 0, 'Dead player excluded from snapshot');

// ---------------------------------------------------------------------------
// Tests — broadcast stub received the right message shape
// ---------------------------------------------------------------------------
makeRoom('broadcast-room');
const br = rooms['broadcast-room'];
processTurn(br, 'p1', 'down', 5, 5);
console.assert(br._lastMsg.type === 'turn', 'Broadcast stub got turn message');
console.assert(br._lastMsg.playerId === 'p1', 'Broadcast stub has correct playerId');

// ---------------------------------------------------------------------------
// Cleanup (optional — doesn't affect the process exit)
// ---------------------------------------------------------------------------
delete rooms[roomName];
delete rooms['broadcast-room'];

console.log('All game-sync checks passed.');
