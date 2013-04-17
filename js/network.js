networkClass = {
	rooms:{},
	setup: function(game)
	{
		if(window.location.protocol == 'https:')game.socket = io.connect('/',{port: 8443});
		else game.socket = io.connect('/');
		//game.socket = io.connect('/');
		game.socket.on('clientid', function (data) {
			console.log(data);
			clientid = data;
		});
		game.socket.on('map_array',function (data) {
			  //console.log(data);
			  map_array = data;
			});
		game.socket.on('kick',function (data) {
			//console.log(data);
			if(data == color) {game.socket.disconnect(); console.log('disconnected');}
		});
		game.socket.on('data_stream',function (data) {
			process_stream(data);
			//console.log("got data from server");
		})
		game.socket.on('players',function (data) {
			//console.log(data);
			players = data;
			for(var i in players)
			{
				if(i != color)
				{
					var code = i+' = players[i].pos;';
					eval(code);
				}
			}
		});
		game.socket.on('food',function (data) {
			console.log(data);
			food = data;
		});
		game.socket.on('diamond',function (data) {
			console.log(data);
			diamond = data;
		});
		game.socket.on('rotten_food',function (data) {
			console.log(data);
			rotten_food = data;
		});
		game.socket.on('connections',function (data) {
			console.log(data);
			connections = data;
		});

		// Redo network handling for chat and kill log.

		game.socket.on('chat',function (data) {
			console.log(data);
			var words = data[0].split(' ');
			if(words[0]=='/refresh'&& Object.prototype.toString.call(words[1]) != '[object Array]')document.location.reload(true);
			else if(words[0]=='/refresh'&& Object.prototype.toString.call(words[1]) == '[object Array]') for(var i in players) if(i == color)document.location.reload(true);
			if(words[0]!='/refresh')createText(data[0],data[1]);
		});
		game.socket.on('kill_log',function (data) {
			//console.log(data);
			if( Object.prototype.toString.call( data ) === '[object Array]' && data[0] != 'joined' && data[0] != 'disconnected' ) 
			{
				stkl.kill_color(data[0],data[1]);
			}
			else if(data[0]=='joined')
			{
				stkl.kill_join(data[1]);
				players[data[1]] = new game.snake;
			}
			else if(data[0]=='disconnected')
			{
				stkl.kill_disconnect(data[1]);
				delete players[data[1]];
				//console.log(data[1]);
			}
			else
			{
				stkl.kill_self(data);
			}
		});
	  	game.socket.on('ping', function(client) {
	  		game.socket.emit('pong');
		});
	},
	join:function(game) {
		game.socket.emit('join');
		game.socket.emit('player', 'request', function (data) {
			console.log(data);
			game.color = data[1];
			game.id = data[0];
	  	})
	},
	join_room:function(data) {
		socket.emit("join_room", data);
		var join = new this.join(); 
		setTimeout(function(){
			render(); game.state.play(); createText("Use the arrow keys to move, 't' to talk, 'space bar' to pause, 'tab' to show the scoreboard.","Help"); $("#menu").toggle();}, 500);
	},
	process_stream:function(data)
	{
		console.log(data);
		for(i in data)
		{
			if(i=='player')players[data[i][0]].pos = data[i][1];
			if(i=='score')players[data[i][0]].score = data[i][1];

			//console.log()
			if(i=='food')food = data[i];
			if(i=='rotten_food')rotten_food = data[i];
			if(i=='diamond')diamond = data[i];
			if(i=='kill_log')
			{
				if( Object.prototype.toString.call( data[i] ) === '[object Array]' && data[i][0] != 'joined' && data[i][0] != 'disconnected' ) 
				{
					stkl.kill_color(data[i][0],data[i][1]);
				}
				else if(data[i][0]=='joined')
				{
					stkl.kill_join(data[i][1]);
				}
				else if(data[i][0]=='disconnected')
				{
					stkl.kill_disconnect(data[i][1]);
				}
				else
				{
					stkl.kill_self(data[i]);
				}
			}
		}
	},
	getServers:function ()
		{	
			document.getElementById("serverTable").innerHTML = '<tr id="browserHeader"><td>Server Name</td><td># of players</td></tr>';
			socket.emit('getrooms', '', function (data) {
				game.rooms = data;
				//console.log(game);
				var j = 0;
				for(i in data)if(i!=''){ 
					//i=i.substring(1);
					//console.log(data);
					//console.log(i,data[i].length);
					$("<tr id='"+i.substring(1)+"'><td>"+i.substring(1)+"</td><td>"+data[i].length+"/6</td><</tr>").insertAfter('#browserHeader')/*.bind("click", function() {(game.join("game"+j));})*/;
					j++;
				}
				//console.log(data);

		  		console.log(game.rooms);
		  		for(i in game.rooms)if(i!=""){
		  			var server = document.getElementById(i.substring(1));
		  			//server.name = i.substring(1);
		  			server.addEventListener("click", function() {
		  					game.join(this.id);
		  				}, false);
		  			console.log(i);}
	  		});
	  		$("#servers").css("display", "none");
	  		$("#play").css("display", "none");
	  		$("#settings").css("display", "none");
			$("#serverBrowser").css("display", "table");
		}
};