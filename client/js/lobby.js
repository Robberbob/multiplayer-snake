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
    // When server sends room list, render it
    this.network.onRooms = (rooms) => { this.renderRoomList(rooms); };

    // When server confirms room creation, auto-join that room
    this.network.onRoomCreated = (roomName, playerId) => {
      this.hide();
      this.game.joinRoom(roomName, playerId);
    };
  }

  show() {
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
    this.network.createRoom();
  }

  joinRoom(roomName) {
    // Hide lobby, tell server we're joining — the welcome message will trigger game init
    this.hide();
    game.network.joinRoom(roomName);
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
