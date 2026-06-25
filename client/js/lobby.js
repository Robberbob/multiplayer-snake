'use strict';

class LobbyController {
  constructor(network, game) {
    this.network = network;
    this.game = game;
    this.$lobby = document.getElementById('lobby');
    this.$roomList = document.getElementById('room-list');
    this.$status = document.getElementById('lobby-status');

    // Bind create-room button
    const $createBtn = document.getElementById('create-room');
    if ($createBtn) {
      $createBtn.addEventListener('click', () => this.createRoom());
    }

    // Bind back-to-menu button
    const $backBtn = document.getElementById('back-to-menu');
    if ($backBtn) {
      $backBtn.addEventListener('click', () => this.hide());
    }

    this.bindNetwork();
  }

  bindNetwork() {
    const self = this;

    // When server sends room list, render it
    this.network.onRooms = (rooms) => { self.renderRoomList(rooms); };

    // The createroom handler on the server already joins us into the room.
    // Don't send another joinroom — that creates a duplicate player entry.
    // Just hide the lobby; game.js's 'welcome' listener will init the screen.
    this.network.onRoomCreated = (roomName, playerId) => {
      self.clearRecoveryTimer();
      self.hide();
    };

    // Recover from server errors: if the lobby is hidden (join was in-flight),
    // re-show it and display the error so the user isn't orphaned.
    this.network.on('error', function(msg) {
      self.clearRecoveryTimer();
      const message = msg.message || 'An error occurred';
      self.$status.textContent = message;
      self.show(); // re-show lobby if it was hidden during a join attempt
    });
  }

  /** Clear any pending recovery timer. */
  clearRecoveryTimer() {
    if (this._recoveryTimer) {
      clearTimeout(this._recoveryTimer);
      this._recoveryTimer = null;
    }
  }

  show() {
    // Cancel any in-flight recovery so a stale timeout message doesn't fire later.
    this.clearRecoveryTimer();
    this.$lobby.style.display = 'block';
    this.loadRooms(); // fetch current room list from server
  }

  hide() {
    this.$lobby.style.display = 'none';
  }

  loadRooms() {
    this.network.getRooms();
  }

  createRoom() {
    const self = this;
    // Clear any prior recovery timer and status before starting a new request
    this.clearRecoveryTimer();
    this.$status.textContent = '';
    this.network.createRoom();
    // If the server doesn't respond with room_created or error within 3 s,
    // assume the request was lost and tell the user.
    self._recoveryTimer = setTimeout(function() {
      self.$status.textContent = 'Timed out — try again.';
    }, 3000);
  }

  joinRoom(roomName) {
    const self = this;
    // Clear any prior recovery timer and status before starting a new request
    this.clearRecoveryTimer();
    this.$status.textContent = '';
    // Hide lobby, tell server we're joining — the welcome message will trigger game init.
    // If no response (welcome or error) arrives within 3 s, auto-recover by re-showing the lobby.
    this.hide();
    this.game.network.joinRoom(roomName);
    self._recoveryTimer = setTimeout(function() {
      self.$status.textContent = 'Timed out — try again.';
      self.show(); // recover from orphan state
    }, 3000);
  }

  renderRoomList(rooms) {
    const tbody = this.$roomList;
    tbody.innerHTML = '';
    rooms.forEach(r => {
      const tr = document.createElement('tr');
      const full = r.players >= r.maxPlayers;
      tr.innerHTML = `
        <td>${r.name}</td>
        <td>${r.players}/${r.maxPlayers}</td>
        <td><button data-room="${r.name}" ${full ? 'disabled' : ''}>Join</button></td>
      `;
      tbody.appendChild(tr);
    });

    // Bind join buttons
    tbody.querySelectorAll('button[data-room]').forEach(btn => {
      btn.addEventListener('click', () => this.joinRoom(btn.dataset.room));
    });
  }
}

// Expose globally so game.js can instantiate it
window.LobbyController = LobbyController;
