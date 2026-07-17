'use strict';

const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const serveStatic = require('serve-static');

// ---------------------------------------------------------------------------
// Imports from modular files
// ---------------------------------------------------------------------------

const config = require(path.join(__dirname, 'config.json'));
const { rooms, createRoom, joinRoom, leaveRoom } = require('./rooms');
const { processTurn, buildSnapshot, shouldBroadcastSnapshot } = require('./game-sync');

// ---------------------------------------------------------------------------
// Constants (carried from wsEngine.js game engine)
// ---------------------------------------------------------------------------

const MAP_WIDTH  = 80;
const MAP_HEIGHT = 56;
const TICK_MS    = 50;

const PLAYER_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#a855f7', '#f97316', '#854d0e'
];

const FOOD_DEFS = [
  { type: 'apple',   maxCount: 2, interval: 3000  },
  { type: 'diamond', maxCount: 1, interval: 10000 },
  { type: 'rotten',  maxCount: 1, interval: 15000 }
];

// ---------------------------------------------------------------------------
// Map generation — border-wall map as a Set of "x,y" strings
// ---------------------------------------------------------------------------

function generateMap() {
  const walls = new Set();
  for (let x = 0; x < MAP_WIDTH; x++) {
    walls.add(`${x},0`);
    walls.add(`${x},${MAP_HEIGHT - 1}`);
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    walls.add(`0,${y}`);
    walls.add(`${MAP_WIDTH - 1},${y}`);
  }
  return walls;
}

// ---------------------------------------------------------------------------
// Food helpers
// ---------------------------------------------------------------------------

function randomFreeCell(room) {
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;
    const y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
    const key = `${x},${y}`;
    if (room.map.has(key)) continue;
    if (room.food.some(f => f.x === x && f.y === y)) continue;
    for (const pid of Object.keys(room.players)) {
      const p = room.players[pid];
      if (!p.alive) continue;
      if (p.x === x && p.y === y) break;
      for (let s = 0; s < p.body.length; s++) {
        if (p.body[s].x === x && p.body[s].y === y) break;
      }
    }
    return { x, y };
  }
  return null;
}

function spawnFoodForRoom(room, foodType) {
  const def = FOOD_DEFS.find(d => d.type === foodType);
  if (!def) return;
  const currentCount = room.food.filter(f => f.type === foodType).length;
  if (currentCount >= def.maxCount) return;
  const pos = randomFreeCell(room);
  if (!pos) return;
  room.food.push({ x: pos.x, y: pos.y, type: foodType });
}

// ---------------------------------------------------------------------------
// Player helpers — spatial state that lives alongside rooms.js bookkeeping
// ---------------------------------------------------------------------------

function assignColor(room) {
  const idx = room.colorIndex % PLAYER_COLORS.length;
  room.colorIndex++;
  return PLAYER_COLORS[idx];
}

function randomSpawnPos(room) {
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(Math.random() * (MAP_WIDTH - 6)) + 3;
    const y = Math.floor(Math.random() * (MAP_HEIGHT - 6)) + 3;
    if (!room.map.has(`${x},${y}`)) return { x, y };
  }
  return { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) };
}

/**
 * Augment a player entry (already created by joinRoom()) with spatial game
 * state — position, direction, body trail.  Returns the augmented player object.
 */
function initialisePlayerSpatial(room, playerId) {
  const directions = ['up', 'down', 'left', 'right'];
  const p = room.players[playerId];
  if (!p) throw new Error('Player not found in room');

  const pos = randomSpawnPos(room);
  Object.assign(p, {
    color: assignColor(room),
    x: pos.x,
    y: pos.y,
    length: 5,
    direction: directions[Math.floor(Math.random() * directions.length)],
    body: [],
    lastMoveTime: Date.now() // for per-player move rate limiting
  });

  return p;
}

function respawnPlayer(room, playerId) {
  const p = room.players[playerId];
  if (!p || !p.ws) return;
  const pos = randomSpawnPos(room);
  p.x = pos.x;
  p.y = pos.y;
  p.length = 5;
  p.alive = true;
  p.body = [];
}

// ---------------------------------------------------------------------------
// Broadcast helpers — safe send to every alive player in a room
// ---------------------------------------------------------------------------

function safeSend(ws, data) {
  if (ws.readyState !== 1) return;
  try { ws.send(JSON.stringify(data)); } catch (_) {}
}

function broadcastRoom(room, msg) {
  for (const p of Object.values(room.players)) {
    if (!p.alive) continue;
    const socket = p.ws || p.socket;
    if (socket && typeof socket.send === 'function') {
      safeSend(socket, msg);
    }
  }
}

// ---------------------------------------------------------------------------
// Game tick — runs every TICK_MS per room
// ---------------------------------------------------------------------------

function gameTick(room) {
  room.tickCount = (room.tickCount || 0) + 1;

  const alivePlayers = Object.values(room.players).filter(p => p.alive);

  // Move each snake one cell in its current direction
  for (const p of alivePlayers) {
    if (!p.alive) continue;

    p.body.unshift({ x: p.x, y: p.y });

    switch (p.direction) {
      case 'up':    p.y -= 1; break;
      case 'down':  p.y += 1; break;
      case 'left':  p.x -= 1; break;
      case 'right': p.x += 1; break;
      default: break;
    }

    const maxBody = Math.max(0, p.length - 1);
    while (p.body.length > maxBody) { p.body.pop(); }

    // Wall collision
    if (room.map.has(`${p.x},${p.y}`)) { killPlayer(room, p.id, null); continue; }

    // Self-collision
    for (let s = 0; s < p.body.length; s++) {
      if (p.body[s].x === p.x && p.body[s].y === p.y) {
        killPlayer(room, p.id, null);
        break;
      }
    }

    // Food collision
    for (let fi = room.food.length - 1; fi >= 0; fi--) {
      const f = room.food[fi];
      if (f.x === p.x && f.y === p.y) {
        let points = 1;
        switch (f.type) {
          case 'diamond': points = 5; break;
          case 'rotten':  points = -2; break;
          default: points = 1;
        }
        p.score += points;
        if (f.type !== 'rotten') p.length++;
        room.food.splice(fi, 1);
      }
    }
  }

  // Player-vs-player collision
  for (const a of alivePlayers) {
    if (!a.alive) continue;
    for (const b of alivePlayers) {
      if (a === b || !b.alive) continue;
      if (a.x === b.x && a.y === b.y) {
        killPlayer(room, a.id, b.id);
        killPlayer(room, b.id, a.id);
        continue;
      }
      for (let s = 0; s < b.body.length; s++) {
        if (a.x === b.body[s].x && a.y === b.body[s].y) {
          killPlayer(room, a.id, b.id);
          break;
        }
      }
    }
  }

  // Broadcast positions every tick
  const playerSnapshot = Object.values(room.players).filter(p => p.alive).map(p => ({
    id: p.id, color: p.color, x: p.x, y: p.y, length: p.length,
    direction: p.direction, score: p.score
  }));
  if (playerSnapshot.length > 0) {
    broadcastRoom(room, { type: 'positions', players: playerSnapshot });
  }

  // Periodic full snapshots driven by game-sync module
  if (shouldBroadcastSnapshot(room)) {
    broadcastRoom(room, buildSnapshot(room));
  }
}

// ---------------------------------------------------------------------------
// Death handling
// ---------------------------------------------------------------------------

function killPlayer(room, playerId, killerId) {
  const p = room.players[playerId];
  if (!p || !p.alive) return;
  p.alive = false;
  p.body = [];
  broadcastRoom(room, { type: 'death', playerId: p.id, killerId });

  // Respawn after 5 seconds so dead players continue receiving game updates
  setTimeout(() => {
    if (room.players[playerId] && room.players[playerId].ws) {
      respawnPlayer(room, playerId);
    }
  }, 5000);
}

// ---------------------------------------------------------------------------
// Build welcome payload for a joining player
// ---------------------------------------------------------------------------

function buildWelcome(room, player) {
  const mapCells = [];
  room.map.forEach(key => {
    const [xStr, yStr] = key.split(',');
    mapCells.push({ x: Number(xStr), y: Number(yStr) });
  });

  return {
    type: 'welcome',
    playerId: player.id,
    color: player.color,
    room: room.name,
    map: mapCells,
    players: Object.values(room.players).map(p => ({
      id: p.id, color: p.color, x: p.x, y: p.y,
      length: p.length, direction: p.direction
    })),
    food: room.food.map(f => ({ x: f.x, y: f.y, type: f.type }))
  };
}

// ---------------------------------------------------------------------------
// HTTP server — serves client/ directory via serve-static
// ---------------------------------------------------------------------------

const serve = serveStatic(path.join(__dirname, '..', 'client'), { index: 'index.html' });
const httpServer = http.createServer((req, res) => {
  serve(req, res, (err) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

httpServer.listen(config.httpPort || 3000, () => {
  console.log(`[server] HTTP server listening on port ${config.httpPort || 3000}`);
});

// ---------------------------------------------------------------------------
// WebSocket server — multiplayer game protocol
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: config.port || 8081 });

console.log('[server] Starting up...');

wss.on('connection', (ws) => {
  ws.isAlive = true;
  let joinedPlayerId = null;
  let joinedRoomName = null;

  console.log(`[server] New WS connection (${ws._socket.remoteAddress})`);

  ws.on('pong', () => { ws.isAlive = true; });

  // Room creation is handled by the 'joinroom' handler, which auto-creates
  // a room if the requested name doesn't exist. This avoids orphan rooms
  // from being created on connection before any player joins.

  ws.on('message', (raw) => {
    let obj;
    try {
      const text = raw.toString();
      obj = JSON.parse(text);
    } catch (_) {
      console.log('[server] Ignoring non-JSON message');
      return;
    }
    if (!obj || typeof obj !== 'object') return;

    const msgAction = obj.action || obj.type;
    switch (msgAction) {

      case 'joinroom': {
        let roomName = String(obj.room).trim();
        const room = rooms[roomName];
        if (!room) {
          // Auto-create a fresh room so the player always has somewhere to go.
          roomName = createRoom();
          rooms[roomName].map = generateMap();
          rooms[roomName].tickTimer = setInterval(() => gameTick(rooms[roomName]), TICK_MS);
          FOOD_DEFS.forEach((def, i) => {
            const timer = setInterval(() => spawnFoodForRoom(rooms[roomName], def.type), def.interval + i * 500);
            rooms[roomName].spawnTimers.push(timer);
          });
          safeSend(ws, { type: 'info', message: `Room "${obj.room}" not found — created "${roomName}" for you.` });
        }
        // Always leave the previous player entry first to prevent ghost players
        // from a double joinroom (same or different room).
        if (joinedPlayerId) {
          leaveRoom(joinedPlayerId, ws);
        }

        try {
          const joinResult = joinRoom(roomName, ws);
          joinedPlayerId = joinResult.playerId;
          ws._joinedPlayerId = joinedPlayerId;
          joinedRoomName = roomName;

          const player = initialisePlayerSpatial(rooms[joinedRoomName], joinedPlayerId);
          safeSend(ws, buildWelcome(rooms[joinedRoomName], player));
          broadcastRoom(rooms[joinedRoomName], { type: 'spawn', playerId: player.id, color: player.color });
          console.log(`[server] Player ${player.id} joined ${roomName}`);
        } catch (err) {
          // Room is full or another join error — inform the client instead of crashing.
          safeSend(ws, { type: 'error', message: err.message || 'Could not join room' });
          console.warn(`[server] Failed to join ${roomName}: ${err.message}`);
        }
        break;
      }

      case 'move': {
        if (!joinedPlayerId) break;
        const room = rooms[joinedRoomName];
        if (!room) break;

        // Per-player rate limit: ignore moves faster than TICK_MS / 2 (25 ms).
        // An abusive or buggy client can flood the server otherwise.
        const p = room.players[joinedPlayerId];
        if (p && p.lastMoveTime !== undefined) {
          const now = Date.now();
          if (now - p.lastMoveTime < TICK_MS / 2) {
            break; // silently drop — no feedback to abusive client
          }
        }

        // Extract cell anchoring fields from the turn message for validation
        const cellX = typeof obj.cellX === 'number' ? obj.cellX : 0;
        const cellY = typeof obj.cellY === 'number' ? obj.cellY : 0;

        const ok = processTurn(room, joinedPlayerId, obj.direction, cellX, cellY);
        if (!ok) {
          console.warn(`[server] Turn rejected for ${joinedPlayerId}: cell anchoring validation failed`);
        } else if (p) {
          p.lastMoveTime = Date.now();
        }

        break;
      }

      case 'chat': {
        if (!joinedPlayerId) break;
        const room = rooms[joinedRoomName];
        if (!room) break;
        const p = room.players[joinedPlayerId];
        if (!p) break;
        const message = String(obj.message || '').slice(0, 256);
        broadcastRoom(room, { type: 'chat', playerId: p.id, message, color: p.color });
        break;
      }

      case 'getrooms': {
        const roomList = Object.values(rooms).map(r => ({
          name: r.name,
          players: Object.keys(r.players).length,
          maxPlayers: config.playersPerRoom
        }));
        safeSend(ws, { type: 'rooms', rooms: roomList });
        break;
      }

      case 'createroom': {
        try {
          const newName = createRoom();

          // Initialise the game map and tick loop before sending welcome.
          rooms[newName].map = generateMap();
          rooms[newName].tickTimer = setInterval(() => gameTick(rooms[newName]), TICK_MS);
          FOOD_DEFS.forEach((def, i) => {
            const timer = setInterval(() => spawnFoodForRoom(rooms[newName], def.type), def.interval + i * 500);
            rooms[newName].spawnTimers.push(timer);
          });

          const joinResult = joinRoom(newName, ws);
          joinedPlayerId = joinResult.playerId;
          ws._joinedPlayerId = joinedPlayerId;
          joinedRoomName = newName;
          initialisePlayerSpatial(rooms[newName], joinedPlayerId);

          safeSend(ws, { type: 'room_created', roomName: newName, playerId: joinedPlayerId });

          // Also send welcome so the client can initialise the game screen.
          const player = rooms[newName].players[joinedPlayerId];
          if (player) {
            safeSend(ws, buildWelcome(rooms[newName], player));
          }
        } catch (err) {
          safeSend(ws, { type: 'error', message: err.message });
        }
        break;
      }

      case 'ping': {
        safeSend(ws, { type: 'pong', timestamp: Date.now() });
        break;
      }

      default: {
        // Unknown action — silently ignore
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log('[server] WS connection closed');
    if (joinedPlayerId) {
      leaveRoom(joinedPlayerId, ws);
    }
  });

  ws.on('error', (err) => {
    console.log(`[server] WS error: ${err.message}`);
  });
});

// ---------------------------------------------------------------------------
// Heartbeat — detect dead connections every 30s
// ---------------------------------------------------------------------------

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[server] Terminating dead client');
      // Clean up game state before forcing termination — 'close' may not fire
      if (ws._joinedPlayerId) {
        leaveRoom(ws._joinedPlayerId, ws);
      }
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_) {}
  });
}, 30000);

// ---------------------------------------------------------------------------
// Graceful shutdown — clean up all timers
// ---------------------------------------------------------------------------

function gracefulShutdown() {
  console.log('[server] Shutting down...');

  // Stop game ticks and food spawners for every room
  for (const name of Object.keys(rooms)) {
    const r = rooms[name];
    if (r) {
      clearInterval(r.tickTimer);
      r.spawnTimers.forEach(t => clearInterval(t));
    }
  }

  clearInterval(heartbeatInterval);
  wss.clients.forEach(ws => ws.close());
  wss.close();

  httpServer.close(() => {
    console.log('[server] HTTP server closed');
    process.exit(0);
  });

  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

console.log(`[server] WebSocket server listening on port ${config.port || 8081}`);
console.log('[server] Ready.');
