'use strict';

const http = require('http');
const path = require('path');
const { WebSocketServer } = require('ws');
const { v1: uuidv1 } = require('uuid');
const serveStatic = require('serve-static');

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const HTTP_PORT    = Number(process.env.HTTP_PORT) || 3000;
const WS_PORT      = Number(process.env.WS_PORT) || 8081; // default 8081 (8080 often occupied by infra)
const MAP_WIDTH    = 80;   // grid cells (matching old server.js)
const MAP_HEIGHT   = 56;
const TICK_MS      = 50;   // game tick interval per room
const ROOM_NAMES   = ['game0', 'game1', 'game2', 'game3', 'game4'];

// Colours assigned in round-robin order
const PLAYER_COLORS = [
  '#3b82f6', // blue
  '#ef4444', // red
  '#22c55e', // green
  '#a855f7', // purple
  '#f97316', // orange
  '#854d0e', // brown
];

// Food definitions: [type, maxOnMap, spawnIntervalMs]
const FOOD_DEFS = [
  { type: 'apple',    maxCount: 2, interval: 3000  },
  { type: 'diamond',  maxCount: 1, interval: 10000 },
  { type: 'rotten',   maxCount: 1, interval: 15000 },
];

// ---------------------------------------------------------------------------
// Map generation — border-wall map as a Set of "x,y" strings for O(1) lookup
// ---------------------------------------------------------------------------

function generateMap() {
  const walls = new Set();
  for (let x = 0; x < MAP_WIDTH; x++) {
    walls.add(`${x},0`);       // top wall
    walls.add(`${x},${MAP_HEIGHT - 1}`); // bottom wall
  }
  for (let y = 0; y < MAP_HEIGHT; y++) {
    walls.add(`0,${y}`);       // left wall
    walls.add(`${MAP_WIDTH - 1},${y}`);   // right wall
  }
  return walls;
}

// ---------------------------------------------------------------------------
// Room state — one object per room
// ---------------------------------------------------------------------------

const rooms = {};

function initRoom(name) {
  const room = {
    name,
    map: generateMap(),          // Set of "x,y" wall cells
    players: {},                 // playerId -> playerState
    food: [],                    // [{ x, y, type }]
    colorIndex: 0,               // next colour to assign (round-robin)
    tickTimer: null,             // setInterval handle
    spawnTimers: [],             // per-food-type interval handles
    playerCount: 0,              // unique counter for round-robin colours
  };

  // Start the game tick loop
  room.tickTimer = setInterval(() => gameTick(room), TICK_MS);

  // Start food-spawn timers (staggered)
  FOOD_DEFS.forEach((def, i) => {
    const timer = setInterval(() => spawnFoodForRoom(room, def.type), def.interval + i * 500);
    room.spawnTimers.push(timer);
  });

  rooms[name] = room;
}

// ---------------------------------------------------------------------------
// Food helpers
// ---------------------------------------------------------------------------

function randomFreeCell(room) {
  // Try up to 200 times before giving up
  for (let attempt = 0; attempt < 200; attempt++) {
    const x = Math.floor(Math.random() * (MAP_WIDTH - 2)) + 1;   // inside walls
    const y = Math.floor(Math.random() * (MAP_HEIGHT - 2)) + 1;
    const key = `${x},${y}`;

    // Must not be a wall, existing food, or occupied by any player body part
    if (room.map.has(key)) continue;
    if (room.food.some(f => f.x === x && f.y === y)) continue;

    for (const pid of Object.keys(room.players)) {
      const p = room.players[pid];
      if (!p.alive) continue;
      // Check head position and every body segment
      if (p.x === x && p.y === y) break;
      for (let s = 0; s < p.body.length; s++) {
        const seg = p.body[s];
        if (seg.x === x && seg.y === y) break;
      }
    }

    return { x, y };
  }
  return null; // no free cell found
}

function spawnFoodForRoom(room, foodType) {
  const def = FOOD_DEFS.find(d => d.type === foodType);
  if (!def) return;

  const currentCount = room.food.filter(f => f.type === foodType).length;
  if (currentCount >= def.maxCount) return;

  const pos = randomFreeCell(room);
  if (!pos) return;

  const foodItem = { x: pos.x, y: pos.y, type: foodType };
  room.food.push(foodItem);
  broadcastRoom(room, { type: 'food', x: pos.x, y: pos.y, type: foodType });
}

// ---------------------------------------------------------------------------
// Player helpers
// ---------------------------------------------------------------------------

function assignColor(room) {
  const idx = room.colorIndex % PLAYER_COLORS.length;
  room.colorIndex++;
  return PLAYER_COLORS[idx];
}

function randomSpawnPos(room) {
  // Pick a position well inside the border walls
  for (let attempt = 0; attempt < 100; attempt++) {
    const x = Math.floor(Math.random() * (MAP_WIDTH - 6)) + 3;
    const y = Math.floor(Math.random() * (MAP_HEIGHT - 6)) + 3;
    if (!room.map.has(`${x},${y}`)) return { x, y };
  }
  return { x: Math.floor(MAP_WIDTH / 2), y: Math.floor(MAP_HEIGHT / 2) };
}

function createPlayer(room, ws) {
  const playerId = uuidv1();
  const color = assignColor(room);
  const pos = randomSpawnPos(room);
  const directions = ['up', 'down', 'left', 'right'];
  const direction = directions[Math.floor(Math.random() * directions.length)];

  const player = {
    id: playerId,
    color,
    x: pos.x,
    y: pos.y,
    length: 5,
    direction,
    score: 0,
    alive: true,
    ws,
    body: [],   // array of {x, y} — absolute trail segments behind the head
  };

  room.players[playerId] = player;
  return player;
}

function respawnPlayer(room, playerId) {
  const p = room.players[playerId];
  if (!p || !p.ws) return;

  // Reuse existing direction or pick random
  const pos = randomSpawnPos(room);
  p.x = pos.x;
  p.y = pos.y;
  p.length = 5;
  p.alive = true;
  p.body = [];

  broadcastRoom(room, { type: 'spawn', playerId: p.id, color: p.color });
}

// ---------------------------------------------------------------------------
// Broadcast helpers — every send() is in try/catch so one dead peer never crashes
// ---------------------------------------------------------------------------

function safeSend(ws, data) {
  if (ws.readyState !== 1) return; // WebSocket.OPEN = 1
  try {
    ws.send(JSON.stringify(data));
  } catch (_err) {
    // Dead socket — caller can ignore
  }
}

function broadcastRoom(room, data) {
  for (const pid of Object.keys(room.players)) {
    const p = room.players[pid];
    if (p.ws) safeSend(p.ws, data);
  }
}

// ---------------------------------------------------------------------------
// Game tick — runs every TICK_MS per room
// ---------------------------------------------------------------------------

function gameTick(room) {
  const alivePlayers = Object.values(room.players).filter(p => p.alive);

  // --- Move each snake one cell in its current direction ---
  for (const p of alivePlayers) {
    if (!p.alive) continue; // may have been killed this tick already

    // Push current head position onto the body trail before moving
    p.body.unshift({ x: p.x, y: p.y });

    switch (p.direction) {
      case 'up':    p.y -= 1; break;
      case 'down':  p.y += 1; break;
      case 'left':  p.x -= 1; break;
      case 'right': p.x += 1; break;
      default: break; // shouldn't happen, but safe fallback
    }

    // Trim body trail to length - 1 (head is at x,y; segments follow behind)
    const maxBody = Math.max(0, p.length - 1);
    while (p.body.length > maxBody) {
      p.body.pop();
    }

    // --- Wall collision ---
    if (room.map.has(`${p.x},${p.y}`)) {
      killPlayer(room, p.id, null);
      continue;
    }

    // --- Self-collision: head hits own body segments ---
    for (let s = 0; s < p.body.length; s++) {
      const seg = p.body[s];
      if (seg.x === p.x && seg.y === p.y) {
        killPlayer(room, p.id, null);
        break;
      }
    }

    // --- Food collision ---
    for (let fi = room.food.length - 1; fi >= 0; fi--) {
      const f = room.food[fi];
      if (f.x === p.x && f.y === p.y) {
        let points = 1;
        switch (f.type) {
          case 'apple':    points = 1; break;
          case 'diamond':  points = 5; break;
          case 'rotten':   points = -2; break; // rotten food penalises score
          default: break;
        }
        p.score += points;
        if (f.type !== 'rotten') {
          p.length++;
        }
        broadcastRoom(room, { type: 'food_eaten', x: f.x, y: f.y });
        room.food.splice(fi, 1);
      }
    }
  }

  // --- Player-vs-player collision (head vs body) ---
  for (const a of alivePlayers) {
    if (!a.alive) continue;
    for (const b of alivePlayers) {
      if (a === b || !b.alive) continue;

      // Head-on collision: both heads occupy the same cell — both die
      if (a.x === b.x && a.y === b.y) {
        killPlayer(room, a.id, b.id);
        killPlayer(room, b.id, a.id);
        continue;
      }

      // Check if a's head hits any of b's body segments
      for (let s = 0; s < b.body.length; s++) {
        const seg = b.body[s];
        if (a.x === seg.x && a.y === seg.y) {
          killPlayer(room, a.id, b.id);
          break;
        }
      }
    }
  }

  // --- Broadcast position update for all alive players every tick ---
  const playerSnapshot = Object.values(room.players).filter(p => p.alive).map(p => ({
    id: p.id,
    color: p.color,
    x: p.x,
    y: p.y,
    length: p.length,
    direction: p.direction,
    score: p.score,
  }));

  if (playerSnapshot.length > 0) {
    broadcastRoom(room, { type: 'positions', players: playerSnapshot });
  }
}

// ---------------------------------------------------------------------------
// Death handling
// ---------------------------------------------------------------------------

function killPlayer(room, playerId, killerId) {
  const p = room.players[playerId];
  if (!p || !p.alive) return; // already dead

  p.alive = false;
  p.body = [];

  broadcastRoom(room, { type: 'death', playerId: p.id, killerId });

  // Auto-respawn after 3 seconds (only if still connected)
  setTimeout(() => {
    if (room.players[playerId] && room.players[playerId].ws) {
      respawnPlayer(room, playerId);
    }
  }, 3000);
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

  const players = Object.values(room.players).map(p => ({
    id: p.id,
    color: p.color,
    x: p.x,
    y: p.y,
    length: p.length,
    direction: p.direction,
  }));

  return {
    type: 'welcome',
    playerId: player.id,
    color: player.color,
    room: room.name,
    map: mapCells,
    players,
    food: room.food.map(f => ({ x: f.x, y: f.y, type: f.type })),
  };
}

// ---------------------------------------------------------------------------
// HTTP server — serves client/ directory via serve-static on port 3000
// ---------------------------------------------------------------------------

const serve = serveStatic(path.join(__dirname, 'client'), { index: 'index.html' });
const httpServer = http.createServer((req, res) => {
  serve(req, res, (err) => {
    if (err) {
      // File not found — return 404
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });
});

httpServer.listen(HTTP_PORT, () => {
  console.log(`[wsEngine] HTTP server listening on port ${HTTP_PORT}`);
});

// ---------------------------------------------------------------------------
// WebSocket server — multiplayer game protocol on port 8080
// ---------------------------------------------------------------------------

const wss = new WebSocketServer({ port: WS_PORT });

console.log(`[wsEngine] Starting up...`);

// Initialise all rooms
ROOM_NAMES.forEach(name => initRoom(name));
console.log(`[wsEngine] Rooms initialised: ${ROOM_NAMES.join(', ')}`);

// ---------------------------------------------------------------------------
// WebSocket connection handling
// ---------------------------------------------------------------------------

wss.on('connection', (ws) => {
  ws.isAlive = true;
  let joinedPlayerId = null;   // track which player this socket owns
  let joinedRoomName = null;

  console.log(`[wsEngine] New WS connection (${ws._socket.remoteAddress})`);

  ws.on('pong', () => { ws.isAlive = true; });

  ws.on('message', (raw) => {
    let obj;
    try {
      // ws v8 sends Buffer or string depending on config — normalise to JSON
      const text = raw.toString();
      obj = JSON.parse(text);
    } catch (_err) {
      console.log('[wsEngine] Ignoring non-JSON message');
      return;
    }

    if (!obj || typeof obj !== 'object') return;

    switch (obj.action) {

      case 'joinroom': {
        const roomName = String(obj.room).trim();
        const room = rooms[roomName];
        if (!room) {
          safeSend(ws, { type: 'error', message: `Room "${roomName}" does not exist. Available: ${ROOM_NAMES.join(', ')}` });
          break;
        }
        // Already in a room? Tell them to leave first (or just join the new one)
        if (joinedPlayerId !== null && joinedRoomName) {
          const oldRoom = rooms[joinedRoomName];
          if (oldRoom && oldRoom.players[joinedPlayerId]) {
            delete oldRoom.players[joinedPlayerId];
            broadcastRoom(oldRoom, { type: 'leave', playerId: joinedPlayerId });
          }
        }

        const player = createPlayer(room, ws);
        joinedPlayerId = player.id;
        joinedRoomName = room.name;

        // Send welcome to the joining client
        safeSend(ws, buildWelcome(room, player));

        // Broadcast spawn to everyone in the room
        broadcastRoom(room, { type: 'spawn', playerId: player.id, color: player.color });

        console.log(`[wsEngine] Player ${player.id} (${player.color}) joined ${room.name}`);
        break;
      }

      case 'move': {
        if (!joinedPlayerId) break; // not in a room yet
        const room = rooms[joinedRoomName];
        if (!room) break;
        const p = room.players[joinedPlayerId];
        if (!p || !p.alive) break;

        const validDirs = ['up', 'down', 'left', 'right'];
        const dir = String(obj.direction);
        if (!validDirs.includes(dir)) break;

        // Prevent 180-degree reversals (can't go opposite of current direction)
        const opposites = { up: 'down', down: 'up', left: 'right', right: 'left' };
        if (opposites[dir] === p.direction) break;

        p.direction = dir;
        broadcastRoom(room, { type: 'move', playerId: p.id, direction: dir });
        break;
      }

      case 'chat': {
        if (!joinedPlayerId) break;
        const room = rooms[joinedRoomName];
        if (!room) break;
        const p = room.players[joinedPlayerId];
        if (!p) break;

        const message = String(obj.message || '').slice(0, 256); // cap length
        broadcastRoom(room, { type: 'chat', playerId: p.id, message, color: p.color });
        break;
      }

      case 'getrooms': {
        safeSend(ws, { type: 'rooms', rooms: ROOM_NAMES });
        break;
      }

      case 'ping': {
        safeSend(ws, { type: 'pong', timestamp: Date.now() });
        break;
      }

      default: {
        // Unknown action — silently ignore (no fall-through)
        break;
      }
    }
  });

  ws.on('close', () => {
    console.log(`[wsEngine] WS connection closed`);
    if (joinedPlayerId && joinedRoomName) {
      const room = rooms[joinedRoomName];
      if (room && room.players[joinedPlayerId]) {
        delete room.players[joinedPlayerId];
        broadcastRoom(room, { type: 'leave', playerId: joinedPlayerId });
      }
    }
  });

  ws.on('error', (err) => {
    console.log(`[wsEngine] WS error: ${err.message}`);
  });
});

// ---------------------------------------------------------------------------
// Heartbeat — detect dead connections every 30s
// ---------------------------------------------------------------------------

const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      console.log('[wsEngine] Terminating dead client');
      ws.terminate();
      return;
    }
    ws.isAlive = false;
    try { ws.ping(); } catch (_err) { /* ignore */ }
  });
}, 30000);

// ---------------------------------------------------------------------------
// Graceful shutdown — clean up all timers
// ---------------------------------------------------------------------------

function gracefulShutdown() {
  console.log('[wsEngine] Shutting down...');

  // Stop game ticks and food spawners for every room
  ROOM_NAMES.forEach(name => {
    const r = rooms[name];
    if (r) {
      clearInterval(r.tickTimer);
      r.spawnTimers.forEach(t => clearInterval(t));
    }
  });

  clearInterval(heartbeatInterval);

  // Close all WS connections
  wss.clients.forEach(ws => ws.close());
  wss.close();

  httpServer.close(() => {
    console.log('[wsEngine] HTTP server closed');
    process.exit(0);
  });

  // Force exit after 5s if something hangs
  setTimeout(() => process.exit(1), 5000);
}

process.on('SIGINT', gracefulShutdown);
process.on('SIGTERM', gracefulShutdown);

console.log(`[wsEngine] WebSocket server listening on port ${WS_PORT}`);
console.log('[wsEngine] Ready.');
