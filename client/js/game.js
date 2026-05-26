'use strict';
function game () {
	this.ui = new this._ui(this);
	this.assets();
	this.ctx=document.getElementById("canvas").getContext("2d");

	this.viewport = {};

	this.playerConfigs=[
	{up:"up",down:"down",right:"right",left:"left",color:this.requestColor(0),scoreboard:document.getElementById("player1score")},
	{up:"w",down:"s",right:"d",left:"a",color:this.requestColor(1),scoreboard:document.getElementById("player2score")},
	{up:"i",down:"k",right:"l",left:"j",color:this.requestColor(2),scoreboard:document.getElementById("player3score")},
	{up:"2",down:"5",right:"6",left:"4",color:this.requestColor(3),scoreboard:document.getElementById("player4score")}];

			//console.log(this.ctx.canvas);
	//console.log(Math.round((this.height*1.77777778)/10)*10+"x"+Math.round(this.height/10)*10);
	this.ui.resize();
	window.addEventListener("resize", function () {
		//console.log(this);
		this.ui.resize();
	}.bind(this));
};

game.prototype._ui = function (self) {
	this.self = self;
	// boolean open/closed
	this.oc=true;
	this.fc=false;
	var multiBtn = document.getElementById("multi");
	if (multiBtn) multiBtn.addEventListener("click", function() { self.ui.multiplayer(self); });
	var singleBtn = document.getElementById("single");
	if (singleBtn) singleBtn.addEventListener("click", function() { self.ui.singleplayer(self); });
	var refreshBtn = document.getElementById("refresh");
	if (refreshBtn) refreshBtn.addEventListener("click", function() { /* no-op for now */ });
	var backBtn = document.getElementById("back");
	if (backBtn) backBtn.addEventListener("click", function() { self.ui.home(); });
	var settingsBtn = document.getElementById("settings");
	if (settingsBtn) settingsBtn.addEventListener("click", function() { self.ui.settings(); });

	// lobbyInit is defined below; called at end of constructor after all methods exist.

	window.addEventListener("keydown",function(e) {
	  var key = keyDecode(e);

	  // Allow reload.
	  if((key !== "r" && e.metaKey !== false)) {
			e.preventDefault();
	  }

	  if (key === "escape") {
	    $("#menu").css("display", !!this.oc ? "none" : "inline");
		this.oc^=true;
	  }

	  if(key === "f") {

		if (document.getElementById("body").requestFullscreen) {
	  	document.getElementById("body").requestFullscreen();
		} else if (document.getElementById("body").msRequestFullscreen) {
	  	document.getElementById("body").msRequestFullscreen();
		} else if (document.getElementById("body").mozRequestFullScreen) {
	  	document.getElementById("body").mozRequestFullScreen();
		} else if (document.getElementById("body").webkitRequestFullscreen) {
	  	document.getElementById("body").webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
		}
	  	//document.getElementById("body").webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
	  	//document.getElementById("canvas").focus();
	  	//this.fc^=true;
	  }
	  if (key === 'backspace' && document.activeElement.id != 'message-input') {
	    //console.log(document.activeElement.id);
			e.preventDefault();
	  };
	  if (key === 'tab') {
			e.preventDefault();
	  }
  }.bind(this));
  this.home = function() {
		$("#multi").css("display", "block");
		$("#single").css("display", "block");
		$("#settings").css("display", "block");
		$("#serverBrowser").css("display", "none");
	};

	this.close = function() {
		$("#menu").css("display", "none");
		this.oc=false;
	};

	this.open = function() {
		$("#menu").css("display", "inline");
		this.oc=true;
	};

	this.multiplayer = function() {
		// Lobby already created game.network on page load.
		// If the user somehow opens the menu and clicks Multiplayer, just return — nothing extra to do.
		if (self.network && self.network.connected) {
			return;
		}
	};


	this.singleplayer = function(self) {
		//console.log(self);
		//console.log(this);
		this.close();
		this.scoreboard(true);
		self.level = new level(1000,560,self.ctx);
		this.resize();
		setInterval(function(){self.level.update()}.bind(this), 500);
	};

	this.scoreboard = function(display) {
		if(display===true)
			$("#scoreboard").css("display","block");
		else
			$("#scoreboard").css("display","none");
	}

	this.settings = function() {
		alert(":P what? You actually thought that would do something? \n -Neo");
	};

	// ===== Lobby screen logic =====
	this.lobbyInit = function() {
		var uiSelf = this;

		// Create the network connection immediately (do NOT auto-join a room)
		self.network = new network();

		// Poll for connection open, then request initial rooms (only once)
		var _initialRoomsRequested = false;
		var pollConnection = setInterval(function() {
			if (!self.network || !self.network.connected) return;
			clearInterval(pollConnection);
			document.getElementById('lobby-status').textContent = 'Connected';
			if (!_initialRoomsRequested) {
				_initialRoomsRequested = true;
				self.network.sendGetRooms();
			}
		}, 200);

		// Handle rooms list from server
		self.network.on('rooms', function(msg) {
			var roomListEl = document.getElementById('room-list');
			roomListEl.innerHTML = ''; // clear existing buttons

			if (!msg.rooms || msg.rooms.length === 0) {
				roomListEl.innerHTML = '<p style="color:#666; text-align:center;">No rooms available</p>';
				return;
			}

			for (var i = 0; i < msg.rooms.length; i++) {
				var room = msg.rooms[i];
				var btn = document.createElement('button');
				btn.style.cssText = 'padding:12px 20px; font-size:1em; cursor:pointer; border:1px solid #444; background:#16213e; color:#eee; border-radius:6px; text-align:left;';
				btn.textContent = (room.name || room) + ' — ' + (room.players !== undefined ? room.players : 0) + ' player' + (room.players !== undefined && room.players !== 1 ? 's' : '');

				(function(roomName) {
					btn.addEventListener('click', function() {
						document.getElementById('lobby-status').textContent = 'Joining ' + roomName + '...';
						self.network.sendJoinRoom(roomName);
					});
				})(room.name || room);

				roomListEl.appendChild(btn);
			}
		});

		// Handle welcome (after joining a room) — transition to game
		self.network.on('welcome', function(msg) {
			console.log('[lobby] Welcome, playerId=' + msg.playerId);
			document.getElementById('lobby').style.display = 'none';
			document.getElementById('canvas').style.display = 'block';

			// Show the chat panel once we're in a room
			var chatEl = document.getElementById('chat-container');
			if (chatEl) { chatEl.style.display = 'flex'; }

			// Now run the rest of the multiplayer setup (snakes, level, etc.)
			uiSelf.multiplayerAfterWelcome(msg);
		});


		// Periodically refresh room list while in lobby (every 3 seconds)
		self._lobbyRefreshTimer = setInterval(function() {
			if (document.getElementById('lobby').style.display !== 'none' && self.network) {
				self.network.sendGetRooms();
			}
		}, 3000);

		// Update connection status in lobby
		setInterval(function() {
			var statusEl = document.getElementById('lobby-status');
			if (statusEl) {
				statusEl.textContent = self.network && self.network.connected ? 'Connected' : 'Connecting...';
			}
		}, 1000);
	};

	// Multiplayer setup that runs AFTER a welcome message is received
	this.multiplayerAfterWelcome = function(msg) {
		var uiSelf = this;

		self.network.playerId = msg.playerId;

		// Create fresh level for this room — server data populates it below.
		// Without this, self.level is null so: map guard at line 250 skips walls,
		// snake() constructor gets a null level reference, and kitchen/food never loads.
		self.level = new level(1000, 560, self.ctx);

		// Registry of ALL snakes by playerId (not just local slot numbers).
		var snakesById = {};

		/** Build a snake config object from server color string. */
		function makeConfig(colorStr) {
			return {
				up: 'up', down: 'down', right: 'right', left: 'left',
				color: game.requestColor(0), // placeholder; overridden below
				scoreboard: document.getElementById('player1score')
			};
		}

		/** Create or re-use a snake entity for a remote player. */
		function createSnakeEntity(playerData) {
			var cfg = makeConfig();
			// Build an RGB color object from the server's hex color string
			var c = typeof playerData.color === 'string' ? playerData.color : '#00ff00';
			var r = parseInt(c.slice(1,3), 16) || 0;
			var g = parseInt(c.slice(3,5), 16) || 255;
			var b = parseInt(c.slice(5,7), 16) || 0;
			cfg.color = { r: r, g: g, b: b };

			var s = new snake(self.level, cfg);
			s.id = playerData.id; // use server playerId as the entity id
			s.body.length = 0;
			// Build body from server state (players come with length and position)
			if (playerData.x !== undefined && playerData.y !== undefined) {
				var len = playerData.length || 5;
				for (var i = 0; i < len; i++) {
					s.body.push({ x: playerData.x - i, y: playerData.y });
				}
			}
			s.input.push(playerData.direction || 'right');

			// Start the tick loop for this snake so it renders and moves locally
			if (typeof s.tick === 'undefined') {
				s.tick = setInterval(function() { s.update(); }.bind(s), s.speed);
			}
			return s;
		}

		// Set the map from server (walls)
		if (msg.map && self.level) {
			self.level.body.length = 0; // clear existing walls
			for (var i = 0; i < msg.map.length; i++) {
				self.level.body.push({ x: msg.map[i].x, y: msg.map[i].y });
			}
		}

		// Create the local player snake in slot 0
		for (var p = 0; p < msg.players.length; p++) {
			var pd = msg.players[p];
			if (pd.id === msg.playerId) {
				// This is us - use the real player config
				var localPlayer = createSnakeEntity(pd);
				snakesById[pd.id] = localPlayer;
			} else {
				var remote = createSnakeEntity(pd);
				snakesById[pd.id] = remote;
			}
		}

		// Register keydown listener for the LOCAL player's snake
		// We look up the local snake dynamically by playerId so controls still work after death and respawn (which recreates the snake entity)
		window.addEventListener("keydown", function(e) {
			if (self.network && self.network.playerId !== undefined) {
				var currentLocal = snakesById[self.network.playerId];
				if (currentLocal) {
					currentLocal.eventHandler(e);
				}
			}
		});

		// Add all snakes to the level's players array for rendering
		self.level.players.length = 0;
		for (var sid in snakesById) {
			if (snakesById.hasOwnProperty(sid)) {
				self.level.players.push(snakesById[sid]);
			}
		}

		// Populate the kitchen with server food data
		if (msg.food && self.level.kitchen) {
			for (var f = 0; f < msg.food.length; f++) {
				var fd = msg.food[f];
				var typeKey = fd.type || 'apple';
				// Map server food types to kitchen pot indices
				var typeMap = { apple: 0, berries: 1, diamond: 2, diamonds: 2, wormhole: 3, beer: 4 };
				var idx = typeMap[typeKey];
				if (idx !== undefined && self.level.kitchen.pot[idx]) {
					self.level.kitchen.pot[idx].body.push({ x: fd.x, y: fd.y });
				}
			}
		}

		// Register remaining event handlers for in-game protocol
		self.network.on('move', function(msg) {
			var s = snakesById[msg.playerId];
			if (s && msg.direction) {
				if (!s.input.length || s.input[s.input.length - 1] !== msg.direction) {
					s.input.push(msg.direction);
				}
			}
		});

		self.network.on('positions', function(msg) {
			msg.players.forEach(function(p) {
				var s = snakesById[p.id];
				if (s) {
					while (s.body.length > 0) s.body.pop();
					// Server sends x, y, length per player — rebuild body from head position
					if (p.x !== undefined && p.y !== undefined) {
						var len = p.length || 5;
						for (var i = 0; i < len; i++) {
							s.body.push({ x: p.x - i, y: p.y });
						}
					} else if (p.positions && p.positions.length > 0) {
						p.positions.forEach(function(pos) {
							s.body.push({ x: pos.x, y: pos.y });
						});
					}
				}
			});
		});

		self.network.on('death', function(msg) {
			var s = snakesById[msg.playerId];
			if (s) {
				window.dispatchEvent(new CustomEvent('log', {
					detail: { snake: s.color, killer: msg.killerId ? (snakesById[msg.killerId] || {}).color : s.color }
				}));
				s.body.length = 0;
				s.stats.score = 0;
				s.updateScoreboard();
				if (s.tick) { clearInterval(s.tick); delete s.tick; }
			}
		});

		self.network.on('spawn', function(msg) {
			var pd = { id: msg.playerId, color: msg.color, x: msg.x, y: msg.y, length: 5, direction: 'right' };
			var s = createSnakeEntity(pd);
			snakesById[msg.playerId] = s;
			// Remove old dead snake from players array to avoid ghost accumulation
			var idx = self.level.players.findIndex(function(psn) { return psn.id === msg.playerId; });
			if (idx !== -1) self.level.players.splice(idx, 1);
			self.level.players.push(s);
		});

		self.network.on('food', function(msg) {
			var typeMap = { apple: 0, berries: 1, diamond: 2, diamonds: 2, wormhole: 3, beer: 4 };
			var idx = typeMap[msg.type];
			if (idx !== undefined && self.level.kitchen.pot[idx]) {
				self.level.kitchen.pot[idx].body.push({ x: msg.x, y: msg.y });
			}
		});

		self.network.on('food_eaten', function(msg) {
			for (var i = 0; i < self.level.kitchen.pot.length; i++) {
				for (var j = self.level.kitchen.pot[i].body.length - 1; j >= 0; j--) {
					if (self.level.kitchen.pot[i].body[j].x === msg.x && self.level.kitchen.pot[i].body[j].y === msg.y) {
						self.level.kitchen.pot[i].body.splice(j, 1);
					}
				}
			}
		});

		self.network.on('chat', function(msg) {
			var msgId = ++self.level.message_id;
			if (msgId > 5) { $('#m-br' + (msgId - 5)).remove(); $('#m' + (msgId - 5)).remove(); }
			var colorStr = '';
			if (msg.color) {
				colorStr = ' style="color:' + msg.color + '"';
			}
			$('<br id="m-br' + msgId + '"><span id="m' + msgId + '"><span' + colorStr + '>Player ' + msg.playerId + '</span>: ' + msg.message + '</span>').insertAfter('#m' + (msgId - 1));
			$('#message-log').scrollTop($('#m' + msgId).position().top);
		});
		self.network.on('leave', function(msg) {
			var s = snakesById[msg.playerId];
			if (s) {
				for (var i = 0; i < self.level.players.length; i++) {
					if (self.level.players[i] === s) {
						self.level.players.splice(i, 1);
						break;
					}
				}
				if (s.tick) { clearInterval(s.tick); delete s.tick; }
				s.body.length = 0;
				delete snakesById[msg.playerId];
			}
		});

		this.close();
		this.scoreboard(true);
		// multiplayer: self.level already populated from server data above
		this.resize();
		setInterval(function() { self.level.update(); }.bind(this), 500);
	};

	this.resize = function() {
		// scope
		// this = _ui
		// self = game

		self.width=window.innerWidth;
		self.height=window.innerHeight;

		document.getElementsByTagName("html")[0].setAttribute("style","width:"+self.width+"px;");
		// use this if the screen is wider than it is longer
		self.viewport.x=Math.floor((self.height*1.78571429)/10)*10;

		if(self.viewport.x > window.innerWidth) {
			// if the screen is longer than it is wider use this
			self.viewport.x=Math.floor(self.width/10)*10;
			self.viewport.y=Math.floor((self.width/1.78571429)/10)*10;
			//$("#body").css("background-color","pink");
		}else {
			// continue with first calculation
			self.viewport.y=Math.floor(self.height/10)*10;
			//$("#body").css("background-color","black");
		}

		self.ctx.canvas.width=self.viewport.x;
		self.ctx.canvas.height=self.viewport.y;

		$("#body").css("width", self.viewport.x);
		$("#body").css("height", self.viewport.y);


		$("#viewport").css("width", self.viewport.x);
		$("#viewport").css("height", self.viewport.y);

		$("#viewport").css("margin-top", document.defaultView.getComputedStyle(document.getElementById("body"),null )["margin-top"]);

		// set cell size on resize
		if(self.level !== null) {
			self.level.cell.x=10*(self.viewport.x/self.level.width);
			self.level.cell.y=10*(self.viewport.y/self.level.height);
		}

		$('.menu').css({right:-(self.viewport.x/3)+"px"});

 		var scale=0.0016190476190476;

 		$("#scoreboard").css("font-size", self.viewport.x*scale+"em");
 		$("#menu").css("font-size", self.viewport.x*scale+"em");
 		try {
			if (self.level !== null) {
	 			var padding=self.level.cell.x+5+"px";

	 			//$("#scoreboard").css("padding-top",padding);
	 			$("#player1").css("margin-left", padding);
	 			$("#player4").css("margin-right", padding);

				/*$("#player1").css("margin-top", padding);
	 			$("#player2").css("margin-top", padding);
	 			$("#player3").css("margin-top", padding);
	 			$("#player4").css("margin-top", padding);*/
			}
 		} catch(e) {
 			console.log(e);
 		}
	}
	
	// ===== Lobby initialization - runs after all methods are defined on this object =====
	this.lobbyInit();
};

game.prototype.requestColor = function(index) {
	var color;
	if(typeof index !== "undefined")
		return color = HSV((index * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (index * 0.618033988749895) % 0.5));
	for (var i = 1; i < this.players.length; i++)
		if(typeof this.players !== "undefined") {
			color = HSV((i * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (i * 0.618033988749895) % 0.5));
    		return color;
    	}
}

game.prototype.assets = function() {
	//this.self = self;
};

game.prototype.assets.load = function() {

};

game.prototype.level = null;

game.prototype.network = null; // new network;
