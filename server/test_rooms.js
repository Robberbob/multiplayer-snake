'use strict';
const { rooms, createRoom, joinRoom, leaveRoom } = require('./rooms');

// Minimal mock WebSocket.
const mockWS = () => ({ readyState: 1 });

console.log('--- Smoke test: room lifecycle ---\n');

// ---- Create a room ----
const name = createRoom();
console.log(`Created: ${name}`);
console.assert(Object.keys(rooms).length === 1, 'Expected 1 room after creation');
console.assert(typeof rooms[name].players === 'object', 'Room has players map');
console.assert(rooms[name].playerCount === 0, 'New room is empty');

// ---- Join players ----
const r1 = joinRoom(name, mockWS());
const r2 = joinRoom(name, mockWS());
console.log(`Joined: ${r1.playerId} (slot ${r1.slot}), ${r2.playerId} (slot ${r2.slot})`);
console.assert(r1.slot === 0 && r2.slot === 1, 'Slots assigned in order');
console.assert(rooms[name].playerCount === 2, 'Room player count is 2');

// ---- Leave one player ----
leaveRoom(r1.playerId, mockWS());
console.log(`Left: ${r1.playerId}`);
console.assert(Object.keys(rooms[name].players).length === 1, 'One player remains');
console.assert(rooms[name].playerCount === 1, 'Player count is 1');

// ---- Leave last player -> room destroyed ----
leaveRoom(r2.playerId, mockWS());
console.log(`Left: ${r2.playerId}`);
console.assert(!rooms[name], 'Empty room was destroyed');
console.assert(Object.keys(rooms).length === 0, 'No rooms remain');

// ---- Max-rooms guard ----
const config = require('./config.json');
const origMaxRooms = config.maxRooms;
config.maxRooms = 1;

createRoom(); // first room — ok
try {
  createRoom(); // second — should throw
  console.assert(false, 'Expected Error on max rooms');
} catch (e) {
  console.assert(e.message === 'Maximum rooms reached', `Correct error: ${e.message}`);
}

// Restore.
config.maxRooms = origMaxRooms;

console.log('\nAll checks passed.');
