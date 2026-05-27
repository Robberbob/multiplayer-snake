# Multiplayer Networking Layer Design

## Overview

A fresh Node.js WebSocket server added alongside the existing single-player client codebase. The server handles matchmaking, room management, turn relay, and authoritative game state synchronization. The existing single-player gameplay remains fully intact as a fallback — multiplayer adds on top without modifying core mechanics.

## Architecture

Two processes:
- **Existing client** (unchanged) — HTML5 Canvas rendering, keyboard input, snake movement logic
- **New Node.js server** (`server/` directory) — WebSocket handling, room management, game loop relay

### New Files

| File | Purpose |
|------|---------|
| `server/index.js` | Main entry point: HTTP static file serving + WebSocket server |
| `server/rooms.js` | Room creation, player slot assignment, lobby data |
| `server/game-sync.js` | Turn relay protocol and state snapshot broadcasting |
| `client/js/network.js` | WebSocket client that talks to the server |
| `client/js/lobby.js` | Lobby UI logic — room list display, join/create actions |

## Lobby & Room System

### Flow

1. Player clicks "Multiplayer" button (line 30 of `game.js`)
2. Main menu hides; lobby screen appears in its place
3. Lobby shows available rooms with current player count
4. Player joins a room or creates a new one
5. Game starts immediately for that player

### Room Rules

- **Slots:** Each room has 4 slots (Player 1 through Player 4)
- **No host concept** — all players are equal; no authority difference between slot positions
- **Game starts on join** — as soon as any player joins a room, the game begins for them
- **Max capacity:** 4 players per room
- **Room lifecycle:** Room stays alive as long as at least one player is connected. When all players leave, the room is destroyed and removed from the lobby

### Slot Assignment

When a player joins, they take the first available slot (lowest-numbered empty slot). If Player 1 disconnects while Players 2-4 remain active, the Player 1 slot opens up — the room shows back in the lobby with "3/4 players" and the next joiner fills that open slot.

### Lobby UI

Shows a list of rooms with:
- Room name (auto-generated: "Room Alpha", "Room Beta", etc.)
- Current player count / max capacity
- Join button per room

## Turn Relay Protocol

This is the core synchronization mechanism. The goal: every client agrees on where each snake turns, even if messages arrive at different times due to lag.

### Client → Server (turn message)

When a player presses an arrow key:

```json
{
  "type": "turn",
  "playerId": "<uuid>",
  "direction": "up",
  "cellX": 5,
  "cellY": 12
}
```

The `cellX` and `cellY` fields report the grid cell where the player is turning — this anchors the turn to a specific position so all clients can reconcile even if messages arrive out of order.

### Server Validation

Server checks that the reported cell is within ±1 of where it believes that player currently is (tolerating network lag). If valid, server applies the direction change and broadcasts:

```json
{
  "type": "turn",
  "playerId": "<uuid>",
  "direction": "up",
  "cellX": 5,
  "cellY": 12
}
```

to all clients in that room.

### Client Processing

Each client receives the turn broadcast and queues it for execution at the reported cell — so even if the message arrives late, the snake turns at the right position because everyone agrees on grid coordinates.

## State Snapshots (Safety Net)

The server broadcasts a full-state snapshot every N ticks (configurable). The message includes all active players' positions, directions, lengths, and scores — enough for any client to reconstruct current game state from scratch.

Clients use these snapshots as reconciliation points: if a turn message is lost or arrives out of order, the next snapshot corrects it.

### Configuration

```json
{
  "snapshotInterval": 10,
  "turnTolerance": 1
}
```

- `snapshotInterval` — broadcast full state every N ticks (default: 10, which is half a second at 20Hz)
- `turnTolerance` — ±N cells tolerance when validating turn cell position (default: 1)

## Disconnect Handling

Simple and clean:
- Player disconnects → their slot opens up immediately
- Room shows back in the lobby with updated player count
- No reconnection logic — if a player wants to play again, they go through the lobby fresh
- The game continues for remaining players; no pause or reset on individual disconnect

## Configuration File

Server configuration lives at `server/config.json` (or equivalent) so settings can be tweaked per deployment without code changes.

```json
{
  "port": 8081,
  "snapshotInterval": 10,
  "turnTolerance": 1,
  "maxRooms": 20,
  "playersPerRoom": 4
}
```

## What Stays the Same

- Core single-player gameplay mechanics (snake movement, food spawning, collision detection)
- Rendering engine (HTML5 Canvas API with requestAnimationFrame)
- Input handling (keyboard → direction change via keyDecode.js)
- Map generation and level rendering
- Snake state data structure (position, length, body array, direction)

The multiplayer layer sits on top of these — it doesn't rewrite them.