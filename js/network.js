networkClass = Class.extend({
	rooms:{},
	setup: function()
	{
		if(window.location.protocol == 'https:')network.socket = io.connect('/',{port: 8443});
		else network.socket = io.connect('/', {port:8000});
		//network.socket = io.connect('/');
		network.socket.on('clientid', function (data) {
			//console.log(data);
			game.clientid = data;
		});
		network.socket.on('map_array',function (data) {
			  //console.log(data);
			  game.map_array = data;
			});
		network.socket.on('kick',function (data) {
			//console.log(data);
			if(data == color) {network.socket.disconnect(); console.log('disconnected');}
		});
		network.socket.on('data_stream',function (data) {
			network.process_stream(data);
			//console.log("got data from server");
		})
		network.socket.on('players',function (data) {
			//console.log(data);
			game.players = data;
			for(var i in game.players)
			{
				if(i != game.color)
				{
					var code = i+' = game.players[i].pos;';
					//console.log(code);
					eval(code);
				}
			}
		});
		network.socket.on('food',function (data) {
			//console.log(data);
			game.food = data;
		});
		network.socket.on('diamond',function (data) {
			//console.log(data);
			game.diamond = data;
		});
		network.socket.on('rotten_food',function (data) {
			//console.log(data);
			game.rotten_food = data;
		});
		network.socket.on('connections',function (data) {
			//console.log(data);
			game.connections = data;
		});

		// Redo network handling for chat and kill log.

		network.socket.on('chat',function (data) {
			console.log(data);
			game.createText(data[0],data[1]);
		});

		network.socket.on('kill_log',function (data) {
			//console.log(data);
			if( Object.prototype.toString.call( data ) === '[object Array]' && data[0] != 'joined' && data[0] != 'disconnected' ) 
			{
				game.stkl.kill_color(data[0],data[1]);
			}
			else if(data[0]=='joined')
			{
				game.stkl.kill_join(data[1]);
				game.players[data[1]] = new game.snake;
			}
			else if(data[0]=='disconnected')
			{
				game.stkl.kill_disconnect(data[1]);
				delete game.players[data[1]];
			}
			else
			{
				game.stkl.kill_self(data);
			}
		});
	  	network.socket.on('ping', function(client) {
	  		network.socket.emit('pong');
		});
	},
	join_room:function(data) {
		network.socket.emit("join_room", data);
		network.socket.emit('join');
		network.socket.emit('player', 'request', function (data) {
			//console.log(data);
			game.color = data[1];
			game.id = data[0];
	  	})
		setTimeout(function(){
			game.render(); game.state.play(); game.createText("Use the arrow keys to move, 't' to talk, 'space bar' to pause, 'tab' to show the scoreboard.","Help"); $("#menu").toggle();}, 500);
	},
	process_stream:function(data)
	{
		//console.log(data);
		for(var i in data)
		{
			if(i=='player')game.players[data.player[0]].pos = data[i][1];
			if(i=='score')game.players[data.player[0]].score = data[i];

			//console.log()
			if(i=='food')game.food = data[i];
			if(i=='rotten_food')game.rotten_food = data[i];
			if(i=='diamond')game.diamond = data[i];
			if(i=='kill_log')
			{
				if( Object.prototype.toString.call( data[i] ) === '[object Array]' && data[i][0] != 'joined' && data[i][0] != 'disconnected' ) 
				{
					game.stkl.kill_color(data[i][0],data[i][1]);
				}
				else if(data[i][0]=='joined')
				{
					game.stkl.kill_join(data[i][1]);
				}
				else if(data[i][0]=='disconnected')
				{
					game.stkl.kill_disconnect(data[i][1]);
				}
				else
				{
					game.stkl.kill_self(data[i]);
				}
			}
		}
	},
	getServers:function ()
		{	
			document.getElementById("serverTable").innerHTML = '<tr id="browserHeader"><td>Server Name</td><td># of players</td></tr>';
			network.socket.emit('getrooms', '', function (data) {
				network.rooms = data;
				//console.log(network);
				var j = 0;
				for(var i in data)if(i!=''){ 
					//i=i.substring(1);
					//console.log(data);
					//console.log(i,data[i].length);
					$("<tr id='"+i.substring(1)+"'><td>"+i.substring(1)+"</td><td>"+data[i].length+"/6</td><</tr>").insertAfter('#browserHeader')/*.bind("click", function() {(network.join("network"+j));})*/;
					j++;
				}
				//console.log(data);

		  		console.log(network.rooms);
		  		for(var i in network.rooms)if(i!=""){
		  			var server = document.getElementById(i.substring(1));
		  			//server.name = i.substring(1);
		  			server.addEventListener("click", function() {
		  					network.join_room(this.id);
		  				}, false);
		  			console.log(i);}
	  		});
	  		$("#servers").css("display", "none");
	  		$("#play").css("display", "none");
	  		$("#settings").css("display", "none");
			$("#serverBrowser").css("display", "table");
		}
});
var network = new networkClass;