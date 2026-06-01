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

	console.log(this.ctx.canvas);
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
	document.getElementById("single").addEventListener("click", function() {self.ui.singleplayer(self)});
	document.getElementById("multi").addEventListener("click", function() {self.ui.multiplayer(self)});
	document.getElementById("refresh").addEventListener("click", function(){network.getServers();} );
	document.getElementById("back").addEventListener("click", function(){self.ui.home()});
	document.getElementById("settings").addEventListener("click", function() {self.ui.settings()});
	window.addEventListener("keydown",function(e) {
	  var key = keyDecode(e);

	  // Allow reload.
	  if((key !== "r" && e.metaKey !== false)) {
			e.preventDefault();
	  }

	  if (key === "escape") {
	    $("#menu").css("display", !!this.oc ? "none" : "inline");
		this.oc^=true;
		console.log("esc");
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
		console.log(this);
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
		game.network = new network();
		game.network._wireLobbyHandlers();
		game.lobby = new LobbyController(game.network, game);

			// Hide menu buttons, show lobby (lobby is inside #menu so we need to keep it visible)
			document.getElementById('multi').style.display = 'none';
			document.getElementById('single').style.display = 'none';
			document.getElementById('settings').style.display = 'none';
			game.lobby.show();

		// Wire keyboard input through cell anchoring
		this._wireCellAnchoredInput();

		// When the server sends welcome (after joining a room), initialize everything
		var selfRef = this;
		game.network.on('welcome', function(msg) {
			selfRef._initMultiplayerGame(msg);
		});
	};

	this._initMultiplayerGame = function(msg) {
		this.close();
		if (game.lobby && game.lobby.hide) game.lobby.hide();
		this.scoreboard(true);
		self.level = new level(1000, 560, self.ctx);
		this.resize();
		setInterval(function() { self.level.update(); }.bind(this), 500);

		// Registry of ALL snakes by playerId (not just local slot numbers).
		var snakesById = {};
		game.network.snakesById = snakesById;

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

		console.log('[multiplayer] Welcome, playerId=' + msg.playerId);
		game.network.playerId = msg.playerId;

		// Set the map from server (walls)
		if (msg.map && self.level) {
			self.level.body.length = 0; // clear existing walls
			for (var i = 0; i < msg.map.length; i++) {
				self.level.body.push({ x: msg.map[i].x, y: msg.map[i].y });
			}
		}

		// Create the local player snake in slot 0
		var localPlayer = null;
		for (var p = 0; p < msg.players.length; p++) {
			var pd = msg.players[p];
			if (pd.id === msg.playerId) {
				// This is us - use the real player config
				localPlayer = createSnakeEntity(pd);
				snakesById[pd.id] = localPlayer;
			} else {
				var remote = createSnakeEntity(pd);
				snakesById[pd.id] = remote;
			}
		}

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
				var typeMap = { apple: 0, berries: 1, diamonds: 2, wormhole: 3, beer: 4 };
				var idx = typeMap[typeKey];
				if (idx !== undefined && self.level.kitchen.pot[idx]) {
					self.level.kitchen.pot[idx].body.push({ x: fd.x, y: fd.y });
				}
			}
		}

		// Auto-join the room if not already joined
		if (msg.room) {
			game.network.joinRoom(msg.room);
		}

		// move: another player changed direction
		game.network.on('move', function(msg) {
			var s = snakesById[msg.playerId];
			if (s && msg.direction) {
				s.input.length = 0; // clear input queue
				s.input.push(msg.direction);
			}
		});

		// death: a player died
		game.network.on('death', function(msg) {
			var s = snakesById[msg.playerId];
			if (s) {
				// Dispatch kill log event for the UI
				window.dispatchEvent(new CustomEvent('log', {
					detail: { snake: s.color, killer: msg.killerId ? (snakesById[msg.killerId] || {}).color : s.color }
				}));
				// Clear body and stop tick
				s.body.length = 0;
				s.stats.score = 0;
				s.updateScoreboard();
				if (s.tick) { clearInterval(s.tick); delete s.tick; }
			}
		});

		// spawn: a new player joined or respawned
		game.network.on('spawn', function(msg) {
			var pd = { id: msg.playerId, color: msg.color, x: msg.x, y: msg.y, length: 5, direction: 'right' };
			var s;
			if (msg.playerId === game.network.playerId) {
				// Local player respawn - use real config
				s = createSnakeEntity(pd);
			} else {
				s = createSnakeEntity(pd);
			}
			snakesById[msg.playerId] = s;
			self.level.players.push(s);
		});

		// food: new food spawned on the map
		game.network.on('food', function(msg) {
			var typeMap = { apple: 0, berries: 1, diamonds: 2, wormhole: 3, beer: 4 };
			var idx = typeMap[msg.type];
			if (idx !== undefined && self.level.kitchen.pot[idx]) {
				self.level.kitchen.pot[idx].body.push({ x: msg.x, y: msg.y });
			}
		});

		// food_eaten: food removed from the map
		game.network.on('food_eaten', function(msg) {
			// Remove the food piece at (x,y) from all pot types
			for (var i = 0; i < self.level.kitchen.pot.length; i++) {
				for (var j = self.level.kitchen.pot[i].body.length - 1; j >= 0; j--) {
					if (self.level.kitchen.pot[i].body[j].x === msg.x && self.level.kitchen.pot[i].body[j].y === msg.y) {
						self.level.kitchen.pot[i].body.splice(j, 1);
					}
				}
			}
		});

		// chat: relay a chat message to the kill log area
		game.network.on('chat', function(msg) {
			var msgId = ++self.level.message_id;
			if (msgId > 5) { $('#m-br' + (msgId - 5)).remove(); $('#m' + (msgId - 5)).remove(); }
			var colorStr = '';
			if (msg.color) {
				colorStr = ' style="color:' + msg.color + '"';
			}
			$('<br id="m-br' + msgId + '"><span id="m' + msgId + '"><span' + colorStr + '>Player ' + msg.playerId + '</span>: ' + msg.message + '</span>').insertAfter('#m' + (msgId - 1));
			$('#message-log').scrollTop($('#m' + msgId).position().top);
		});

		// positions: periodic player state update from server (every tick)
		game.network.on('positions', function(msg) {
			for (var i = 0; i < msg.players.length; i++) {
				var pd = msg.players[i];
				var s = snakesById[pd.id];
				if (!s) continue;

				// Update head position and direction from server state
				s.body[0].x = pd.x;
				s.body[0].y = pd.y;
				s.input.length = 0;
				s.input.push(pd.direction);

				// Sync score display
				if (pd.score !== undefined) {
					s.stats.score = pd.score;
					s.updateScoreboard();
				}
			}
		});


		// leave: a player disconnected
		game.network.on('leave', function(msg) {
			var s = snakesById[msg.playerId];
			if (s) {
				// Remove from level.players array
				for (var i = 0; i < self.level.players.length; i++) {
					if (self.level.players[i] === s) {
						self.level.players.splice(i, 1);
						break;
					}
				}
				// Stop its tick loop
				if (s.tick) { clearInterval(s.tick); delete s.tick; }
				s.body.length = 0;
				delete snakesById[msg.playerId];
			}
		});
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

	this._wireCellAnchoredInput = function() {
		window.addEventListener('keydown', function(e) {
			if (!game.network.connected) return;
			if (game.lobby && game.lobby.$lobby.style.display !== 'none') return;

			var direction = keyDecode(e);
			if (!direction) return;

			game.network.currentCellX = self.cellX || 0;
			game.network.currentCellY = self.cellY || 0;
			game.network.sendMove(direction);
		});
	};
};

game.prototype.requestColor = function(index) {
	var color;
	if(typeof index !== "undefined")
		return color = HSV((index * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (index * 0.618033988749895) % 0.5));
	for (var i = 1; i < this.players.length; i++)
		if(typeof this.players !== "undefined") {
			color = HSV((i * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (i * 0.618033988749895) % 0.5));
			console.log(color);
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
