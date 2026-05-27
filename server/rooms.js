'use strict';
const path = require('path');
const config = require(path.join(__dirname, 'config.json'));

// Greek-letter pool for auto-generated room names.
const ROOM_GREEK = [
  'alpha','beta','gamma','delta',
  'epsilon','zeta','eta','theta','iota','kappa',
  'lambda','mu','nu','xi','omicron','pi',
  'rho','sigma','tau','upsilon'
];

// rooms[name] -> { name, map, players: {}, food: [], tickTimer, spawnTimers, colorIndex, playerCount }
const rooms = {};

/**
 * Pick a Greek-letter room name that isn't already taken.
 */
function generateRoomName() {
  const used = new Set(Object.keys(rooms));
  for (let i = 0; i < ROOM_GREEK.length; i++) {
    if (!used.has(ROOM_GREEK[i])) return 'Room ' + ROOM_GREEK[i];
  }
  // Fallback: numbered name.
  return 'Room ' + (Object.keys(rooms).length + 1);
}

/**
 * Create a new room and return its name.
 * Throws if max rooms already exist.
 */
function createRoom() {
  const currentCount = Object.keys(rooms).length;
  if (currentCount >= config.maxRooms) {
    throw new Error('Maximum rooms reached');
  }

  const name = generateRoomName();
  rooms[name] = {
    name,
    map: null,          // game map data populated by the engine later
    players: {},        // playerId -> player state
    food: [],           // food items on the board
    tickTimer: null,    // interval handle for room tick loop
    spawnTimers: [],    // periodic spawn handles (food, obstacles, etc.)
    colorIndex: 0,      // tracks which colour to assign next player
    playerCount: 0      // number of active players in this room
  };

  return name;
}

/**
 * Assign the lowest available slot number (0-based) in a room.
 */
function pickSlot(room) {
  const taken = new Set(
    Object.values(room.players).map(p => p.slot)
  );
  for (let i = 0; i < config.playersPerRoom; i++) {
    if (!taken.has(i)) return i;
  }
  throw new Error('No available slots');
}

/**
 * Add a player to the named room.
 * Returns `{ playerId, slot }`.
 * Throws if room doesn't exist or is full.
 */
function joinRoom(roomName, ws) {
  const room = rooms[roomName];
  if (!room) throw new Error('Room not found: ' + roomName);

  // Check capacity (slot-based; pickSlot throws if none available).
  const slot = pickSlot(room);

  const playerId = `p_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  room.players[playerId] = {
    id: playerId,
    ws,
    slot,
    colorIndex: room.colorIndex++,
    alive: true,
    score: 0
  };
  room.playerCount++;

  return { playerId, slot };
}

/**
 * Remove a player from their current room.
 * If the room becomes empty it is destroyed (timers cleared).
 */
function leaveRoom(playerId, ws) {
  // Locate the room this player belongs to.
  let target = null;
  for (const name of Object.keys(rooms)) {
    if (rooms[name].players[playerId]) {
      target = rooms[name];
      break;
    }
  }

  if (!target) return; // Player not in any room — nothing to do.

  delete target.players[playerId];
  target.playerCount--;

  // Room empty -> destroy it and clean up timers.
  if (target.playerCount <= 0) {
    if (target.tickTimer) clearInterval(target.tickTimer);
    for (const t of target.spawnTimers) clearInterval(t);
    delete rooms[target.name];
  }
}

module.exports = {
  rooms,
  createRoom,
  joinRoom,
  leaveRoom,
  generateRoomName
};
