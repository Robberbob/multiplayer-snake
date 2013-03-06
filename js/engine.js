$(document).ready(function() {

//socket = io.connect('/',{port: 8080});
socket = io.connect('/');
function network() {

	socket.on('clientid', function (data) {
		console.log(data);
		clientid = data;
	});

	socket.on('map_array',function (data) {
		  console.log(data);
		  map_array = data;
		});

	socket.on('kick',function (data) {
		//console.log(data);
		if(data == color) {socket.disconnect(); console.log('disconnected');}
	});

	socket.on('data_stream',function (data) {
		process_stream(data);
	})

	socket.on('players',function (data) {
		//console.log(data);
		players = data;
		for(var i in players)
		{
			//if(players[i].score > hi_score[0]) hi_score=[players[i].score,i];
			if(i != color)
			{
				var code = i+' = players[i].pos;';
				eval(code);
			}
			
		}
	});

	socket.on('food',function (data) {
		//console.log(data);
		food = data;
	});
	socket.on('diamond',function (data) {
		//console.log(data);
		diamond = data;
	});
	socket.on('rotten_food',function (data) {
		//console.log(data);
		rotten_food = data;
	});

	socket.on('connections',function (data) {
		//console.log(data);
		connections = data;
	});

	socket.on('chat',function (data) {
		console.log(data);
		var words = data[0].split(' ');
		if(words[0]=='/refresh'&& Object.prototype.toString.call(words[1]) != '[object Array]')document.location.reload(true);
		else if(words[0]=='/refresh'&& Object.prototype.toString.call(words[1]) == '[object Array]') for(var i in players) if(i == color)document.location.reload(true);
		if(words[0]!='/refresh')createText(data[0],data[1]);
	});

	socket.on('kill_log',function (data) {
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

	socket.emit('player', 'request', function (data) {
		console.log(data);
		color = data[1];
		id = data[0];
  	});
  	socket.on('ping', function(client) {
  		socket.emit('pong');
	});
	socket.emit('join');
}

	var lastLoop = new Date;
	//Canvas stuff
	var canvas = $("#canvas")[0];
	var ctx = canvas.getContext("2d");
	var w = $("#canvas").width();
	var h = $("#canvas").height();
	window.requestAnimFrame = (function(callback) {
        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
        function(callback) {
          window.setTimeout(callback, 1000 / 60);
        };
      })();

	var cw = 10;
	var d;
	//var food_loop; //=[];
	var eaten = true;
	var state;
	//var score=0, hi_score=[0,'blue'];
	var speed;
	var diamond_add;
	//Lets create the snake now
	var snake_array; //an array of cells to make up the snake
	var grow;
	var dt;
	var movement;
	var move;
	var last_move;
	var head;
	var spawn={1:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: i,y:1}); } game.player.movement.unshift("right"); head="nx++";', 2:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: 98,y:i}); } game.player.movement.unshift("down"); head="ny++";', 3:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: -i+99,y:48}); } game.player.movement.unshift("left"); head="nx--";', 4:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: 1,y:-i+49}); } game.player.movement.unshift("up"); head="ny--";'};
	//var blue=[{x:-1,y:-1}], green=[{x:-1,y:-1}], red=[{x:-1,y:-1}], purple=[{x:-1,y:-1}], orange=[{x:-1,y:-1}], brown=[{x:-1,y:-1}];
	var message_log=[];
	var kill_log=[], kill_log_timeout=[];
	var chat = false;
	var kill_self = true;
	var contin_kills = 0;
	var toggle_score = false;
	var debug = false;
	var	message = document.getElementById('message-input');
	var scroll_id = 0, kill_id = 0;
	var dead;
	var stream_buffer={};
	var last_spawn=5, next_spawn;
	var game = {
		state:{
			play:function ()
				{
					//move = "right";
					game.player.movement=[];
					game.player.score = 0;
					//socket.emit('score', score);
					stream_buffer.score=game.player.score;
					game.player.speed = 150;
					create_snake();
					reset.diamond();
					if(typeof game_loop != "undefined") clearInterval(game_loop);
					game_loop = setInterval(core, game.player.speed);
					 //socket.emit('snake',[snake_array, color]);
				},
		home:{
			home:function () 
				{
					$("#servers").css("display", "inline");
					$("#play").css("display", "inline");
					$("#settings").css("display", "inline");
					$("#serverBrowser").css("display", "none");
				}
			}
		},
		getServers:function ()
			{
				socket.emit('getrooms', '', function (data) {
					for(i in data)if(i!='') console.log(i,data[i].length);
					console.log(data);
		  		});
		  		$("#servers").toggle();
		  		$("#play").toggle();
		  		$("#settings").toggle();
				$("#serverBrowser").css("display", "inline");
				/*
				<tr>
					<td></td><td></td><td></td>
				</tr>
				*/

			},
		player:{
			movement:[],
			score:0,
			speed:150,
			snake_array:[]
		},
		hi_score: function()
		{
			var c_hi_score=[0,"blue"];
			for(i in players) if (players[i].score > c_hi_score[0]) c_hi_score = [players[i].score,i] ;
			return c_hi_score;
		},
		snake:function() {
		  return {
		    taken:0,
		    pos:{x:-1 , y:-1},
		    ping:0,
		    score:0,
		    kill_streak:0};
		}
	}


	$("#play").bind("click",function()
		{
			var join = new network; 
			setTimeout(function(){
				render(); game.state.play(); createText("Use the arrow keys to move, 't' to talk, 'space bar' to pause, 'tab' to show the scoreboard.","Help"); $("#menu").toggle();}, 500);});
	//$("#settings").bind("click",function(){render(); game.state.play(); $("#menu").toggle();});
	console.log(game);
	$("#servers").bind("click", function() {game.getServers();});
	$("#back").bind("click", function() {console.log(game);game.Menu.home();});
	$("#settings").bind("click",function(){alert(":P what? You actually thought that would do something? \n -Signed \n The Sign Painter");});
	//var input=0;



	var reset={
		diamond:function ()
		{
				//diamond_add={t:true,n:2+1};
				dt = true; grow = 10;
		},
		food:{
			add:function ()
			{
					//diamond_add={t:true,n:2+1};
					dt = true; grow = 3;
			},
			sub:function ()
			{
					//diamond_add={t:true,n:2+1};
					var len = game.player.snake_array.length
					dt = true; grow = Math.round(len/4)*-1;
			}
		}
	}


	
	function process_stream(data)
	{
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
	}

	function create_snake()
	{ 
		last_spawn = next_spawn;
		next_spawn = getRandomInt(1,4);
		if(last_spawn==next_spawn)while(last_spawn==next_spawn)next_spawn = getRandomInt(1,4);
		var length = 5;
		game.player.snake_array = [];
		eval(spawn[next_spawn]);
		//eval(spawn[4]);
		state = "play";
		dead=false;
	}

//connect();
//game.state.menu.play;

	function getRandomInt (min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	}

	function capitaliseFirstLetter(string)
	{
	    return string.charAt(0).toUpperCase() + string.slice(1);
	}
	function createText(data,p_col) 
	{
		var command;
		scroll_id +=1;
		if (scroll_id >5) {$('#m-br'+(scroll_id-5)).remove();$('#m'+(scroll_id-5)).remove();}
		$('<br id="m-br'+scroll_id+'"><span id="m'+scroll_id+'"><span id="'+p_col+'">'+capitaliseFirstLetter(p_col)+'</span>: '+data+'</span>').insertAfter('#m'+(scroll_id-1));
		$("#message-log").scrollTop($("#m"+scroll_id).position().top);
		command = "setTimeout(function() {$('#m"+scroll_id+"').addClass('fade');}, 4000);";
		eval(command);
	}

	var stkl={
		// stkl = Send To Kill Log
		kill_self:
		function (data)
		{
			var command;
			kill_id +=1;
			if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
	    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Humiliated Himself!</span>').insertAfter('#k'+(kill_id-1));
			$("#kill-log").scrollTop($("#k"+kill_id).position().top);
			command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_color:
		function (killer, killed)
		{
			var command;
			kill_id +=1;
			if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
	    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+killer+'">'+capitaliseFirstLetter(killer)+'</span> Murdered <span id="'+killed+'">'+capitaliseFirstLetter(killed)+'</span>!</span>').insertAfter('#k'+(kill_id-1));
			$("#kill-log").scrollTop($("#k"+kill_id).position().top);
			command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_join:
		function (data)
		{
			var command;
			kill_id +=1;
			if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
	    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Joined The Game!</span>').insertAfter('#k'+(kill_id-1));
			$("#kill-log").scrollTop($("#k"+kill_id).position().top);
			command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_disconnect:
		function (data)
		{
			var command;
			kill_id +=1;
			if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
	    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Disconnected!</span>').insertAfter('#k'+(kill_id-1));
			$("#kill-log").scrollTop($("#k"+kill_id).position().top);
			command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		}
	}

	function check_clients(cx,cy)
	{
		if(kill_log.length>5)kill_log.pop();
		for (var i in players)
		{
			if(check_collision(cx,cy,players[i].pos))
			{
				var killer = i;
				var killed = color;
				//socket.emit('kill_log', [killer,killed]);
				stream_buffer.kill_log=[killer,killed];
				//stkl.kill_color(killer, killed);
				//stkl(msg ,[killer, killed]);
				return true;
				//return false;
			}
		}
		//return false;

	}

	//Lets paint the snake now
	function render()
	{


		var score_text = "Score: "+game.player.score;
		// Lets paint the canvas now
		ctx.fillStyle = "white";
		ctx.fillRect(0,0,w,h);
		ctx.strokeStyle = "black";
		ctx.strokeRect(0,0,w,h);
  		ctx.font = 'normal 12px Helvetica Neue';
		
		if(typeof game.player.snake_array != "undefined"){	
				//for(var i = 0; i < game.player.snake_array.length; i++)
				for(i in game.player.snake_array)
				{
					var c = game.player.snake_array[i];
					//paint 10px wide cells
					paint_cell(c.x,c.y,color);
				}
			}
		for(var i in players)
		{
			if(i != color)
			{
				for(var j = 0; j < players[i].pos.length; j++)
				{
					var c = players[i].pos[j];
					paint_cell(c.x,c.y,i);
				}
			}
		}

	
		//for(var i = 0; i < map_array.length; i++)
		for(var i in map_array)
			{
				var c = map_array[i];
				//paint 10px wide cells
				var temp = 110;
				paint_cell(c.x,c.y,"rgb("+temp+","+temp+","+temp+")");
			}


		// Paint Food
		for(var i in diamond){paint_cell(diamond[i].x,diamond[i].y,"cyan");}
		for(var i in food)paint_cell(food[i].x,food[i].y,"green");
		for(var i in rotten_food)paint_cell(rotten_food[i].x,rotten_food[i].y,"red");

	    if(state == "pause" && dead == false)
	    {
			ctx.fillStyle = "rgba(100, 100, 100, .5)";
			ctx.fillRect(0,0,w,h);
			ctx.strokeStyle = "black";
			ctx.strokeRect(0,0,w,h);
			ctx.fillStyle = "black";
	    	ctx.font = 'normal 24px Helvetica Neue';
	    	ctx.textAlign = "center";
			ctx.fillText("Game Paused",w/2,h/2);
	    	ctx.font = 'normal 12px Helvetica Neue';
	    	ctx.textAlign = "left";
	    }


	// Text
		ctx.fillStyle="blue";

		
		if(toggle_score == true)
		{
			var j=0;
			for(var i in players) 
				{
					if(players[i].taken!=0)
					{
						j++;
						ctx.fillStyle='rgba(60, 60, 60, .1)';
						ctx.fillRect(199,5+(j*15),150,11);
						//ctx.strokeStyle="rgba(60, 60, 60, .4)";
						//ctx.strokeRect(199,15,100,11);
						ctx.fillStyle=i;
      					ctx.textAlign = 'left';
						ctx.fillText(capitaliseFirstLetter(i),200, 15+(j*15));
      					ctx.textAlign = 'right';
						ctx.fillText(players[i].score+'',290,15+(j*15));
						ctx.fillText(players[i].ping+'ms',345,15+(j*15));
					}
				}
		}
		if(dead)
		{
			ctx.fillStyle = "rgba(250, 0, 0, .5)";
			ctx.fillRect(0,0,w,h);
			ctx.strokeStyle = "black";
			ctx.strokeRect(0,0,w,h);
			ctx.fillStyle = "black";
	    	ctx.font = 'normal 24px Helvetica Neue';
	    	ctx.textAlign = "center";
			ctx.fillText("Press 'r' to respawn.",w/2,(h/4));
			ctx.fillText("Score: "+game.player.score,w/2,(h/3));
	    	ctx.font = 'normal 12px Helvetica Neue';
	    	ctx.textAlign = "left";
		}
		ctx.fillStyle="blue";

      	ctx.textAlign = 'center';
		ctx.fillText('Hi-Score:',w/2,20);
		ctx.fillStyle=game.hi_score()[1];
		ctx.fillText(game.hi_score()[0],w/2,30);
		ctx.fillStyle="blue";
      	ctx.textAlign = 'left';
		ctx.fillText(score_text,10,20);
		if(debug == true)
		{	
		/* Debug */
			ctx.fillText("Client ID: "+clientid,10,31);
			ctx.fillText("Clients: "+connections,10,43);
			ctx.fillText("Snake: "+game.player.snake_array.length ,10,55);


			var thisLoop = new Date;
		    var fps = 1000 / (thisLoop - lastLoop);
		    lastLoop = thisLoop;
			ctx.fillText("FPS: "+Math.round(fps),10,65);
			//ctx.fillText("Blue: "+ players[0].taken +" Red: "+players[1].taken +" Green: "+players[2].taken+" Purple: "+players[3].taken ,10,60);
			
		/* Debug */
		}
		// request new frame
        requestAnimFrame(function() {
          render();
        });
	    
	}

	function core()
	{
		if(state == "play")
		{
			// Movement
			if(game.player.snake_array.length!=0)
			{
				var nx = game.player.snake_array[0].x;
				var ny = game.player.snake_array[0].y;
			}


			if(game.player.movement.length != 0)
			{
				if(typeof move != "undefined"){last_move = move;}
				else{last_move = "none";}
				move = game.player.movement.pop();
			}

			if(move == "right" && last_move != "left" && last_move != "right"){head="nx++";}
			else if(move == "left" && last_move != "right" && last_move != "left"){head="nx--";}
			else if(move == "up" && last_move != "down" && last_move != "up"){head="ny--";}
			else if(move == "down" && last_move != "up" && last_move != "down"){head="ny++";}
			eval(head);

			if(nx == -1||nx == w/cw||ny == -1||ny == h/cw||game.player.snake_array.length<=2||check_collision(nx,ny,game.player.snake_array)||check_collision(nx,ny,map_array))
			{
				stream_buffer.kill_log=color;
				//socket.emit('kill_log', color);
				//stkl.kill_self(color);
				console.log('restart');
				clearInterval(game_loop);
				//play();
				game.player.snake_array={x:-1,y:-1};
				game.player.score=0;
				stream_buffer.snake=[color,game.player.snake_array];
				console.log(stream_buffer);
	    		socket.emit('data_stream',stream_buffer, function (data) {
    			//check data
    			process_stream(data);
    			console.log(data);
    			});
	    		stream_buffer=[];
    			//socket.emit('snake',[game.player.snake_array, color]);
    			dead = true;
				return;
			}
			else if(check_clients(nx,ny))
			{
				console.log('restart');
				clearInterval(game_loop);
				//play();
				game.player.snake_array={x:-1,y:-1};
				game.player.score=0;
				stream_buffer.snake=[color,game.player.snake_array];
				console.log(stream_buffer);
	    		socket.emit('data_stream',stream_buffer, function (data) {
    			//check data
    			process_stream(data);
    			console.log(data);
    		});
	    		stream_buffer={};
    			//socket.emit('snake',[game.player.snake_array, color]);
    			dead = true;
    			return;
			}
			// End Movement

			// Eat Food
			for(var i in food)
			{
				if(nx == food[i].x && ny == food[i].y)
				{
					//socket.emit('reset_food',[nx,ny]);
					stream_buffer.reset_food=[nx,ny];
					food.splice(i,1);
					var tail = {x: nx, y: ny};
					game.player.score+=5;
					//socket.emit('game.player.score', game.player.score);
					stream_buffer.score=game.player.score;
					//Create new food
					//socket.emit createnew food
					if(game.player.speed>80)
					{
						Math.round(game.player.speed--);
						clearInterval(game_loop);
						game_loop = setInterval(core, game.player.speed);	
					}
					reset.food.add();
					dt = false;
				}
			}
			for(var i in rotten_food)
			{
				if(nx == rotten_food[i].x && ny == rotten_food[i].y)
				{
					//socket.emit('reset_rotten_food',[nx,ny]);
					stream_buffer.reset_rotten_food=[nx,ny];
					rotten_food.splice(i,1);
					//console.log(eaten);
					var tail = {x: nx, y: ny};
					reset.food.sub();
					for(var i = grow; i<1; i++)game.player.snake_array.pop();
					game.player.score-=10;
					//socket.emit('game.player.score', game.player.score);
					stream_buffer.score=game.player.score;
					//Create new food
					//socket.emit createnew food

					Math.round(game.player.speed++);
					clearInterval(game_loop);
					game_loop = setInterval(core, game.player.speed);
				}
			}

			for(var i in diamond)
			{
				if(nx == diamond[i].x && ny == diamond[i].y)
				{
					//socket.emit('reset_diamond',[nx,ny]);
					stream_buffer.reset_diamond=[nx,ny];
					diamond.splice(i,1);
					var tail = {x: nx, y: ny};
					game.player.score +=25;
					//socket.emit('game.player.score', game.player.score);
					stream_buffer.score=game.player.score;
					//Create new food
					//socket.emit createnew food
		
					if(game.player.speed>80)
					{
						game.player.speed-=10;
						clearInterval(game_loop);
						game_loop = setInterval(core, game.player.speed);
					}
					//diamond_add={t:false,n:6};
					reset.diamond();
					dt = false;
					
				}
			}
			if(dt == false && grow > 0)
			{
				if(grow > 0)
				{
					grow--;
				}
				if (grow == 1)
				{
					reset.diamond();
				}
				var tail = {x: nx, y: ny};
				//tail.x = nx; tail.y = ny;
			}
			else
			{
				var tail = game.player.snake_array.pop(); //pops out the last cell
				tail.x = nx; tail.y = ny;
			}
    		game.player.snake_array.unshift(tail);//puts back the tail as the first cell
			stream_buffer.snake=[color,game.player.snake_array];
			//console.log(stream_buffer);
    		socket.emit('data_stream', stream_buffer, function (data) {
    			//check data
    			process_stream(data);
    			console.log(data);
    		});


    		stream_buffer={};
    		//socket.emit('snake',[game.snake_array, color]);
			
		}

	}
	
	function paint_cell(x,y,color)
	{
		ctx.fillStyle=color;
		ctx.fillRect(x*cw,y*cw,cw,cw);
		ctx.strokeStyle="white";
		ctx.strokeRect(x*cw,y*cw,cw,cw);
	}

	function check_collision(x,y,array)
	{
		if(typeof array != "undefined"){
			for (var i = 0; i < array.length; i++)
				{
					if(array[i].x == x && array[i].y == y)
						return true;
				}
				return false;}else return false;
	}
	$(document).keydown(function(e){
		var key = keyDecode(e);
		// Movement keys
		if((key == "left" || key == "a" && chat == false) && state != "pause" && key != game.player.movement[0]) game.player.movement.unshift("left");
		else if((key == "up" || key == "w"&& chat == false) && state != "pause" && key != game.player.movement[0]) game.player.movement.unshift("up");
		else if((key == "right" || key == "d"&& chat == false) && state != "pause" && key != game.player.movement[0]) game.player.movement.unshift("right");
		else if((key == "down" || key == "s"&& chat == false) && state != "pause" && key != game.player.movement[0]) game.player.movement.unshift("down");
		if(key == "space" && state == "play" && chat == false && dead == false){ state = "pause";}
		else if(key == "space" && state == "pause" && chat == false){ state = "play";}

		// Chat
		if((key == 't'|| key == 'T') && chat == false) {chat = true;  message.disabled=false; console.log('chat on'); key=''; message.focus();  return false; }
		else if(key == 'enter' && chat == true) {chat = false; if(message.value !=''){ console.log(['chat off',message.value]); createText(message.value, color); /*stream_buffer.chat=[message.value,color];*/ socket.emit('chat', [message.value,color]); if(message.value=='/refresh')document.location.reload(true); message.value=''; } message.blur();  message.disabled=true; canvas.focus();}
		//if(chat == true && key != 'left' && key != 'right' && key != 'up' && key != 'down' && key != '' && key != 'shift' && key != 'tab' && key != 'backspace' && key != 'enter') { if(key == 'space') key = ' ';message += key; console.log(key)}
		//else if (key == 'backspace') message = message.substring(0, message.length - 1);

		if(key == 'tab' && toggle_score == false) toggle_score = true;
		else if(key == 'tab' && toggle_score == true) toggle_score = false;
		if((key == 'r'|| key == 'R') && !(chat) && state == 'play') game.state.play();
		if(key == '`' && debug == false) debug = true;
		else if(key == '`' && debug == true) debug = false;
		//input++;
		//$('<span id="input'+input+'">'+key+'</span><br>').insertBefore('#input'+(input-1));

		//else console.log(snake_array);
	})
	

})
