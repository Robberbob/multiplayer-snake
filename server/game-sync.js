'use strict';
const path = require('path');
const config = require(path.join(__dirname, 'config.json'));

/**
 * Validate that the reported cell position is within tolerance of the player's
 * actual position.  This prevents clients from sending turns anchored to a stale
 * or adversarial cell coordinate.
 */
function validateTurn(player, reportedX, reportedY, tolerance) {
  return Math.abs(reportedX - player.x) <= tolerance &&
         Math.abs(reportedY - player.y) <= tolerance;
}

/**
 * Send a JSON message to every alive player in the room via their WebSocket.
 */
function broadcastRoom(room, msg) {
  const data = JSON.stringify(msg);
  for (const p of Object.values(room.players)) {
    if (!p.alive) continue;
    // Players may use either `ws` or `socket` as the connection handle.
    const socket = p.ws || p.socket;
    if (socket && typeof socket.send === 'function') {
      try { socket.send(data); } catch (_) {}
    }
  }
}

/**
 * Process an incoming turn from a client.  Validates cell anchoring, blocks
 * 180-degree reversal, then records the new direction and broadcasts to all
 * clients in the room.
 *
 * @returns {boolean} true if the turn was accepted.
 */
function processTurn(room, playerId, direction, cellX, cellY) {
  const p = room.players[playerId];
  if (!p || !p.alive) return false;

  // Validate cell anchoring against config.turnTolerance
  if (!validateTurn(p, cellX, cellY, config.turnTolerance)) {
    console.warn(`[game-sync] Turn from ${playerId} rejected: cell out of tolerance`);
    return false;
  }

  // Prevent 180-degree reversal
  const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
  if (opposites[direction] === p.direction) return false;

  p.direction = direction;

  // Broadcast to all clients in room
  broadcastRoom(room, {
    type: 'turn',
    playerId: p.id,
    direction,
    cellX,
    cellY
  });
  return true;
}

/**
 * Serialize the full state of every alive player plus food positions into a
 * snapshot message for broadcasting.
 */
function buildSnapshot(room) {
  return {
    type: 'snapshot',
    tick: room.tickCount,
    players: Object.values(room.players).filter(p => p.alive).map(p => ({
      id: p.id, color: p.color, x: p.x, y: p.y,
      length: p.length, direction: p.direction, score: p.score
    })),
    food: room.food.map(f => ({ x: f.x, y: f.y, type: f.type }))
  };
}

/**
 * Return true when the current tick is a multiple of `snapshotInterval`
 * (i.e. it's time to broadcast a full state snapshot).
 */
function shouldBroadcastSnapshot(room) {
  return (room.tickCount % config.snapshotInterval) === 0 && room.tickCount > 0;
}

module.exports = { processTurn, buildSnapshot, shouldBroadcastSnapshot };
