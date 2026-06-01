'use strict';

/**
 * Network layer for multiplayer WebSocket protocol.
 * Connects to the game server, dispatches incoming messages via an event system,
 * and provides convenience methods for sending actions.
 */
function network() {
    var self = this;
    self.playerId = null;
    self.connected = false;
    self._handlers = {};
    self._socket = null;
    self._reconnectTimer = null;

    // Open connection immediately on construction
    self.connect();
}

/** Establish or re-establish the WebSocket connection. */
network.prototype.connect = function() {
    var self = this;
    var host = window.location.hostname || 'localhost';
    var url = 'ws://' + host + ':18081';

    // Clean up any existing socket first
    if (self._socket) {
        try { self._socket.close(); } catch(e) {}
    }

    self._socket = new WebSocket(url);

    self._socket.onopen = function() {
        console.log('[network] Connected to ' + url);
        self.connected = true;
        // Clear any pending reconnect timer
        if (self._reconnectTimer) {
            clearTimeout(self._reconnectTimer);
            self._reconnectTimer = null;
        }
    };

    self._socket.onmessage = function(event) {
        var msg;
        try {
            msg = JSON.parse(event.data);
        } catch(e) {
            console.warn('[network] Failed to parse message:', event.data);
            return;
        }
        // Dispatch to registered handlers for this message type
        if (msg.type && self._handlers[msg.type]) {
            var callbacks = self._handlers[msg.type];
            for (var i = 0; i < callbacks.length; i++) {
                callbacks[i](msg);
            }
        } else {
            console.log('[network] Unhandled message type:', msg ? msg.type : 'unknown', msg);
        }
    };

    self._socket.onclose = function(event) {
        console.log('[network] Disconnected (code=' + event.code + '). Reconnecting in 2s...');
        self.connected = false;
        // Reconnect after 2 seconds
        self._reconnectTimer = setTimeout(function() {
            self.connect();
        }, 2000);
    };

    self._socket.onerror = function(event) {
        console.error('[network] WebSocket error');
    };

    // Graceful close on page unload
    window.addEventListener('beforeunload', function() {
        if (self._reconnectTimer) {
            clearTimeout(self._reconnectTimer);
        }
        self.connected = false;
        try { self._socket.close(); } catch(e) {}
    });
};

/**
 * Register a callback for a specific server message type.
 * @param {string} eventType - One of: 'welcome', 'move', 'death', 'spawn',
 *                              'food', 'food_eaten', 'chat', 'leave'
 * @param {function} callback  - Called with the parsed message object.
 */
network.prototype.on = function(eventType, callback) {
    if (!this._handlers[eventType]) {
        this._handlers[eventType] = [];
    }
    this._handlers[eventType].push(callback);
};

/** Send a raw JSON object to the server. */
network.prototype.sendJSON = function(obj) {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
        this._socket.send(JSON.stringify(obj));
    } else {
        console.warn('[network] Cannot send — socket not open');
    }
};

/** Tell the server we want to join a room. */
network.prototype.joinRoom = function(room) {
    this.sendJSON({ action: 'joinroom', room: room });
};

/** Send a direction change to the server with cell anchoring coordinates. */
network.prototype.sendMove = function(direction) {
    this.sendJSON({
        action: 'move',
        direction: direction,
        cellX: this.currentCellX || 0,
        cellY: this.currentCellY || 0
    });
};

/** Send a chat message to the server. */
network.prototype.sendChat = function(message) {
    this.sendJSON({ action: 'chat', message: message });
};

/** Request the list of active rooms from the server. */
network.prototype.getRooms = function() {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
        this._socket.send(JSON.stringify({ type: 'getrooms' }));
    } else {
        console.warn('[network] Cannot send — socket not open');
    }
};

/** Create a new room on the server. */
network.prototype.createRoom = function() {
    if (this._socket && this._socket.readyState === WebSocket.OPEN) {
        this._socket.send(JSON.stringify({ type: 'createroom' }));
    } else {
        console.warn('[network] Cannot send — socket not open');
    }
};

// Wire lobby protocol responses through to the callback properties that lobby.js sets up
network.prototype._wireLobbyHandlers = function() {
    var self = this;

    self.on('rooms', function(msg) {
        if (self.onRooms) self.onRooms(msg.rooms);
    });

    self.on('room_created', function(msg) {
        if (self.onRoomCreated) self.onRoomCreated(msg.roomName, msg.playerId);
    });
};

