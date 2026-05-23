# OpenSnake — Multiplayer Snake Game

A multiplayer snake game built with Node.js, WebSockets (`ws`), and vanilla JavaScript. Connect with friends over a local network or play solo against the single-player mode.

## Setup

```bash
npm install
node wsEngine.js
```

The server starts two listeners:

| Service    | Default Port | Environment Variable |
|------------|-------------|----------------------|
| HTTP (serves `client/`) | 3000     | `HTTP_PORT`          |
| WebSocket (game protocol) | 8081   | `WS_PORT`            |

## How to Play

1. Open a browser to **http://localhost:3000**.
2. You'll land on the lobby — pick an available room and join.
3. Control your snake with **arrow keys** or **WASD**.
4. Eat food, avoid walls and other snakes, don't run into yourself.

### Food Types

| Item      | Effect                              |
|-----------|-------------------------------------|
| 🍎 Apple       | +2 score, grow 5 segments           |
| 🫐 Berries     | −1 score, shrink 3 segments         |
| 💎 Diamond    | +5 score, grow 10 segments          |
| 🌀 Wormhole   | Teleports you to another wormhole   |
| 🍺 Beer       | Reverses your snake's direction     |

## Project Structure

```
├── wsEngine.js        # WebSocket game server (rooms, protocol, state)
├── server.js          # Legacy Socket.IO server (kept for reference)
├── client/            # Browser assets
│   ├── index.html
│   └── js/            # Client-side game logic
├── package.json
└── README.md
```

## License

MIT — see [LICENSE](LICENSE).
