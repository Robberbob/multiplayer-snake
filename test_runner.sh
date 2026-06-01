#!/bin/bash
set -e

cd /tmp/multiplayer-snake-worktree

# Start server in background
node server/index.js &
SERVER_PID=$!

echo "Server started (PID $SERVER_PID)"

# Wait for both ports to be ready
for i in $(seq 1 30); do
  if nc -z localhost 3000 && nc -z localhost 18081; then
    echo "Both ports ready after ${i}s"
    break
  fi
  sleep 0.5
done

# Run test
node test_create_room.js || true

# Cleanup
kill $SERVER_PID 2>/dev/null || true
wait $SERVER_PID 2>/dev/null || true
