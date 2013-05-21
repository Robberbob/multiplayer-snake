var gameClass = Class.extend({
	state:{
		play:function ()
			{
				game.create_snake();
				game.stream_buffer.score=game.player.score;
				game.reset.diamond();
				if(typeof game.game_loop != "undefined") clearInterval(game.game_loop);
				game.game_loop = setInterval(game.update, game.player.speed);
				 //socket.emit('snake',[snake_array, color]);
			},
		root:{
			home:function () 
				{
					$("#servers").css("display", "inline");
					$("#play").css("display", "inline");
					$("#settings").css("display", "inline");
					$("#serverBrowser").css("display", "none");
				}
			}
	},
	setup:{
		canvas:function() {
			game.canvas = document.getElementById("canvas");
			game.ctx = canvas.getContext("2d");
			game.w = $("#canvas").width();
			game.h = $("#canvas").height();
			game.cw = 10;
		},
		game:function() {
			window.requestAnimFrame = (function(callback) {
	        return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	        function(callback) {
	          window.setTimeout(callback, 1000 / 60);
		        };
		      })();
			game.eaten = true;
			//game.speed; // Speed of the the game core/snake
			game.diamond_add;
			//game.snake_array; //an array of cells to make up the snake
			game.grow;
			game.dt;
			game.movement;
			game.move;
			game.last_move;
			game.head;
			game.spawn={1:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: i,y:1}); } game.player.movement.unshift("right"); head="nx++";', 2:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: 98,y:i}); } game.player.movement.unshift("down"); head="ny++";', 3:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: -i+99,y:48}); } game.player.movement.unshift("left"); head="nx--";', 4:'for(var i = length; i>=1; i--) { game.player.snake_array.push({x: 1,y:-i+49}); } game.player.movement.unshift("up"); head="ny--";'};
			game.message_log=[];
			game.kill_log=[]; 
			game.kill_log_timeout=[];
			game.chat = false;
			game.kill_self = true;
			game.contin_kills = 0;
			game.toggle_score = false;
			game.toggle_hint = false;
			game.debug = false;
			game.message = document.getElementById('message-input');
			game.scroll_id = 0;
			game.kill_id = 0;
			game.dead;
			game.stream_buffer={};
			game.last_spawn=5; 
			game.next_spawn;
		}
	},
	reset:{
		diamond:function ()
		{
				//diamond_add={t:true,n:2+1};
				game.dt = true; game.grow = 10;
		},
		food:{
			add:function ()
			{
					//diamond_add={t:true,n:2+1};
					game.dt = true; game.grow = 3;
			},
			sub:function ()
			{
					//diamond_add={t:true,n:2+1};
					var len = game.player.snake_array.length;
					game.dt = true; game.grow = Math.round(len/4)*-1;
			}
		}
	},
	player:{
		movement:[],
		score:0,
		speed:150,
		state:"play",
		snake_array:[]
	},
	hi_score: function()
	{
		var c_hi_score=[0,"blue"];
		for(var i in game.players) if (game.players[i].score > c_hi_score[0]) c_hi_score = [game.players[i].score,i] ;
		return c_hi_score;
	},
	snake:function() {
	  return {
	    ping:0,
	    score:0,
		speed:150,
		state:"play",
		movement:[],
	    kill_streak:0,
	    snake_array:null
		};
	},
	getPlayer:function(data) {
		if(data == "pos") return game.player.snake;
		if(data == "score") return game.player.score;
		if(data == "ping") return game.player.ping;
	},
	create_snake:function()
	{
		game.player = new game.snake;
		game.last_spawn = game.next_spawn;
		game.next_spawn = game.getRandomInt(1,4);
		if(game.last_spawn==game.next_spawn)while(game.last_spawn==game.next_spawn)game.next_spawn = game.getRandomInt(1,4);
		var length = 5;
		game.player.snake_array = [];
		eval(game.spawn[game.next_spawn]);
		//eval(spawn[4]);
		game.player.state = "play";
		game.dead=false;
	},
	initUI:function() {
		document.getElementById("play").addEventListener("click", function()
			{
				setTimeout(function(){
					render(); game.state.play(); createText("Use the arrow keys to move, 't' to talk, 'space bar' to pause, 'tab' to show the scoreboard.","Help"); $("#menu").toggle();}, 500);
			});
		document.getElementById("servers").addEventListener("click", function(){network.getServers();} );
		document.getElementById("refresh").addEventListener("click", function(){network.getServers();} );
		document.getElementById("back").addEventListener("click", function(){game.state.root.home();} );
		document.getElementById("settings").addEventListener("click", function(){alert(":P what? You actually thought that would do something? \n -Signed \n The Sign Painter");} );
	},
	getRandomInt:function(min, max) {
	    return Math.floor(Math.random() * (max - min + 1)) + min;
	},
	capitaliseFirstLetter:function(string)
	{
	    return string.charAt(0).toUpperCase() + string.slice(1);
	},
	createText:function(data,p_col) 
	{
		var command;
		game.scroll_id +=1;
		if (game.scroll_id >5) {$('#m-br'+(game.scroll_id-5)).remove();$('#m'+(game.scroll_id-5)).remove();}
		$('<br id="m-br'+game.scroll_id+'"><span id="m'+game.scroll_id+'"><span id="'+p_col+'">'+game.capitaliseFirstLetter(p_col)+'</span>: '+data+'</span>').insertAfter('#m'+(game.scroll_id-1));
		$("#message-log").scrollTop($("#m"+game.scroll_id).position().top);
		command = "setTimeout(function() {$('#m"+game.scroll_id+"').addClass('fade');}, 4000);";
		eval(command);
	},
	stkl:{
		// stkl = Send To Kill Log
		kill_self:function (data)
		{
			var command;
			game.kill_id +=1;
			if (game.kill_id >5) {$('#k-br'+(game.kill_id-5)).remove();$('#k'+(game.kill_id-5)).remove();}
	    	$('<br id="k-br'+game.kill_id+'"><span id="k'+game.kill_id+'"><span id="'+data+'">'+game.capitaliseFirstLetter(data)+'</span> Humiliated Himself!</span>').insertAfter('#k'+(game.kill_id-1));
			$("#kill-log").scrollTop($("#k"+game.kill_id).position().top);
			command = "setTimeout(function() { $('#k"+game.kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_color:function (killer, killed)
		{
			var command;
			game.kill_id +=1;
			if (game.kill_id >5) {$('#k-br'+(game.kill_id-5)).remove();$('#k'+(game.kill_id-5)).remove();}
	    	$('<br id="k-br'+game.kill_id+'"><span id="k'+game.kill_id+'"><span id="'+killer+'">'+game.capitaliseFirstLetter(killer)+'</span> Murdered <span id="'+killed+'">'+game.capitaliseFirstLetter(killed)+'</span>!</span>').insertAfter('#k'+(game.kill_id-1));
			$("#kill-log").scrollTop($("#k"+game.kill_id).position().top);
			command = "setTimeout(function() { $('#k"+game.kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_join:function (data)
		{
			var command;
			game.kill_id +=1;
			if (game.kill_id >5) {$('#k-br'+(game.kill_id-5)).remove();$('#k'+(game.kill_id-5)).remove();}
	    	$('<br id="k-br'+game.kill_id+'"><span id="k'+game.kill_id+'"><span id="'+data+'">'+game.capitaliseFirstLetter(data)+'</span> Joined The Game!</span>').insertAfter('#k'+(game.kill_id-1));
			$("#kill-log").scrollTop($("#k"+game.kill_id).position().top);
			command = "setTimeout(function() { $('#k"+game.kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		},
		kill_disconnect:function (data)
		{
			var command;
			game.kill_id +=1;
			if (game.kill_id >5) {$('#k-br'+(game.kill_id-5)).remove();$('#k'+(game.kill_id-5)).remove();}
	    	$('<br id="k-br'+game.kill_id+'"><span id="k'+game.kill_id+'"><span id="'+data+'">'+game.capitaliseFirstLetter(data)+'</span> Disconnected!</span>').insertAfter('#k'+(game.kill_id-1));
			$("#kill-log").scrollTop($("#k"+game.kill_id).position().top);
			command = "setTimeout(function() { $('#k"+game.kill_id+"').addClass('fade'); }, 4000);";
			eval(command);

		}
	},
	check_clients:function(cx,cy)
	{
		if(game.kill_log.length>5)game.kill_log.pop();
		for (var i in game.players)
		{
			if(game.check_collision(cx,cy,game.players[i].pos))
			{
				var killer = i;
				var killed = game.color;
				//socket.emit('game.kill_log', [killer,killed]);
				game.stream_buffer.kill_log=[killer,killed];
				//stkl.kill_color(killer, killed);
				//stkl(msg ,[killer, killed]);
				return true;
				//return false;
			}
		}
		//return false;

	},
	render:function()
	{

		var score_text = "Score: "+game.player.score;
		// Lets paint the canvas now
		game.ctx.fillStyle = "white";
		game.ctx.fillRect(0,0,game.w,game.h);
		game.ctx.strokeStyle = "black";
		game.ctx.strokeRect(0,0,game.w,game.h);
  		game.ctx.font = 'normal 12px Helvetica Neue';
		
		if(typeof game.player.snake_array != "undefined"){	
				//for(var i = 0; i < game.player.snake_array.length; i++)
				for(var i in game.player.snake_array)
				{
					var c = game.player.snake_array[i];
					//paint 10px wide cells
					game.paint_cell(c.x,c.y,game.color);
				}
			}
		for(var i in game.players)
		{
			if(i != game.color && game.players[i].pos !== null)
			{
				//console.log(i,game.players[i].pos);
				//debugger
				if(typeof game.players[i].pos == "undefined") continue;
				for(var j = 0; j < game.players[i].pos.length; j++)
				{
					var c = game.players[i].pos[j];
					game.paint_cell(c.x,c.y,i);
				}
			}
		}

	
		//for(var i = 0; i < map_array.length; i++)
		for(var i in game.map_array)
			{
				var c = game.map_array[i];
				//paint 10px wide cells
				var temp = 110;
				game.paint_cell(c.x,c.y,"rgb("+temp+","+temp+","+temp+")");
			}


		// Paint Food
		for(var i in game.diamond){game.paint_cell(game.diamond[i].x,game.diamond[i].y,"cyan");}
		for(var i in game.food)game.paint_cell(game.food[i].x,game.food[i].y,"green");
		for(var i in game.rotten_food)game.paint_cell(game.rotten_food[i].x,game.rotten_food[i].y,"red");

	    if(game.player.state == "pause" && game.dead == false)
	    {
			game.ctx.fillStyle = "rgba(100, 100, 100, .5)";
			game.ctx.fillRect(0,0,game.w,game.h);
			game.ctx.strokeStyle = "black";
			game.ctx.strokeRect(0,0,game.w,game.h);
			game.ctx.fillStyle = "black";
	    	game.ctx.font = 'normal 24px Helvetica Neue';
	    	game.ctx.textAlign = "center";
			game.ctx.fillText("Game Paused",game.w/2,game.h/2);
	    	game.ctx.font = 'normal 12px Helvetica Neue';
	    	game.ctx.textAlign = "left";
	    }

	// Text
		game.ctx.fillStyle="blue";

		
		if(game.toggle_score)
		{
			var j=0;
			for(var i in game.players) 
				{
					if(game.players[i].taken!=0)
					{
						j++;
						game.ctx.fillStyle='rgba(60, 60, 60, .1)';
						game.ctx.fillRect(199,5+(j*15),150,11);
						//game.ctx.strokeStyle="rgba(60, 60, 60, .4)";
						//game.ctx.strokeRect(199,15,100,11);
						game.ctx.fillStyle=i;
      					game.ctx.textAlign = 'left';
						game.ctx.fillText(game.capitaliseFirstLetter(i),200, 15+(j*15));
      					game.ctx.textAlign = 'right';
						game.ctx.fillText(game.players[i].score+'',290,15+(j*15));
						game.ctx.fillText(game.players[i].ping+'ms',345,15+(j*15));
					}
				}
		}
		if(game.dead)
		{
			game.ctx.fillStyle = "rgba(250, 0, 0, .5)";
			game.ctx.fillRect(0,0,game.w,game.h);
			game.ctx.strokeStyle = "black";
			game.ctx.strokeRect(0,0,game.w,game.h);
			game.ctx.fillStyle = "black";
	    	game.ctx.font = 'normal 24px Helvetica Neue';
	    	game.ctx.textAlign = "center";
			game.ctx.fillText("Press 'r' to respawn.",game.w/2,(game.h/4));
			game.ctx.fillText("Score: "+game.player.score,game.w/2,(game.h/3));
	    	game.ctx.font = 'normal 12px Helvetica Neue';
	    	game.ctx.textAlign = "left";
		}
		game.ctx.fillStyle="blue";

      	game.ctx.textAlign = 'center';
		game.ctx.fillText('Hi-Score:',game.w/2,20);
		game.ctx.fillStyle=game.hi_score()[1];
		game.ctx.fillText(game.hi_score()[0],game.w/2,30);
		game.ctx.fillStyle="blue";
      	game.ctx.textAlign = 'left';
		game.ctx.fillText(score_text,10,20);
		if(game.debug == true)
		{	
		/* Debug */
			game.ctx.fillText("Client ID: "+game.clientid,10,31);
			game.ctx.fillText("Clients: "+game.connections,10,43);
			game.ctx.fillText("Snake: "+game.player.snake_array.length ,10,55);
			//game.ctx.fillText("Blue: "+ players[0].taken +" Red: "+players[1].taken +" Green: "+players[2].taken+" Purple: "+players[3].taken ,10,60);
			
		/* Debug */
		}
		// request new frame
        requestAnimFrame(function() {
          game.render();
        });
	    
	},
	update:function()
	{
		if(game.player.state == "play" && !(game.dead))
		{
			// Movement
			if(game.player.snake_array.length!=0)
			{
				var nx = game.player.snake_array[0].x;
				var ny = game.player.snake_array[0].y;
			}


			if(game.player.movement.length != 0)
			{
				if(typeof game.move != "undefined"){game.last_move = game.move;}
				else{game.last_move = "none";}
				game.move = game.player.movement.pop();
			}

			if(game.move == "right" && game.last_move != "left" && game.last_move != "right"){head="nx++";}
			else if(game.move == "left" && game.last_move != "right" && game.last_move != "left"){head="nx--";}
			else if(game.move == "up" && game.last_move != "down" && game.last_move != "up"){head="ny--";}
			else if(game.move == "down" && game.last_move != "up" && game.last_move != "down"){head="ny++";}
			eval(head);

			if(nx == -1||nx == game.w/game.cw||ny == -1||ny == game.h/game.cw||game.player.snake_array.length<=2||game.check_collision(nx,ny,game.player.snake_array)||game.check_collision(nx,ny,game.map_array))
			{
				game.stream_buffer.kill_log=game.color;
				//socket.emit('kill_log', color);
				//stkl.kill_self(color);
				console.log('restart');
				clearInterval(game.game_loop);
				//play();
				game.player.snake_array={x:-1,y:-1};
				game.player.score=0;
				game.stream_buffer['score']=game.getPlayer("score");
				game.stream_buffer.snake=[game.color,game.player.snake_array];
				console.log(game.stream_buffer);
	    		network.socket.emit('data_stream',game.stream_buffer, function (data) {
    			//check data
    			network.process_stream(data);
    			console.log(data);
    			});
	    		game.stream_buffer=[];
    			//socket.emit('snake',[game.player.snake_array, color]);
    			game.dead = true;
    			clearInterval(game.game_loop);
				return;
			}
			else if(game.check_clients(nx,ny))
			{
				console.log('restart');
				clearInterval(game.game_loop);
				//play();
				game.player.snake_array={x:-1,y:-1};
				game.player.score=0;
				game.stream_buffer["score"]=game.getPlayer("score");
				game.stream_buffer.snake=[game.color,game.player.snake_array];
				console.log(game.stream_buffer);
	    		network.socket.emit('data_stream',game.stream_buffer, function (data) {
    			//check data
	    			network.process_stream(data);
	    			console.log(data);
    			});
	    		game.stream_buffer={};
    			//socket.emit('snake',[game.player.snake_array, color]);
    			game.dead = true;
    			clearInterval(game.game_loop);
    			return;
			}
			// End Movement

			// Eat Food
			for(var i in game.food)
			{
				if(nx == game.food[i].x && ny == game.food[i].y)
				{
					//socket.emit('reset_food',[nx,ny]);
					game.stream_buffer.food_eaten=[nx,ny];
					game.food.splice(i,1);
					var tail = {x: nx, y: ny};
					game.player.score +=5;
					//socket.emit('game.player.score', game.player.score);
					game.stream_buffer["score"]=game.getPlayer("score");
					console.log(game.player.score, game.getPlayer("score"), game.stream_buffer["score"]);
					//Create new food
					//socket.emit createnew food
					if(game.player.speed>80)
					{
						game.player.speed--;
						clearInterval(game.game_loop);
						game.game_loop = setInterval(game.update, game.player.speed);
					}
					//food_add={t:false,n:6};
					game.reset.food.add();
					game.dt = false;
				}
			}
			for(var i in game.rotten_food)
			{
				if(nx == game.rotten_food[i].x && ny == game.rotten_food[i].y)
				{
					//socket.emit('reset_rotten_food',[nx,ny]);
					game.stream_buffer.rotten_food_eaten=[nx,ny];
					game.rotten_food.splice(i,1);
					//console.log(eaten);
					var tail = {x: nx, y: ny};
					game.reset.food.sub();
					for(var i = game.grow; i<1; i++)game.player.snake_array.pop();
					game.player.score-=10;
					//socket.emit('game.player.score', game.player.score);
					game.stream_buffer["score"]=game.getPlayer("score");
					//Create new food
					//socket.emit createnew food

					Math.round(game.player.speed++);
					clearInterval(game.game_loop);
					game.game_loop = setInterval(game.update, game.player.speed);
				}
			}

			for(var i in game.diamond)
			{
				if(nx == game.diamond[i].x && ny == game.diamond[i].y)
				{
					//socket.emit('reset_diamond',[nx,ny]);
					game.stream_buffer.diamond_eaten=[nx,ny];
					game.diamond.splice(i,1);
					var tail = {x: nx, y: ny};
					game.player.score +=25;
					//socket.emit('game.player.score', game.player.score);
					game.stream_buffer["score"]=game.getPlayer("score");
					console.log(game.player.score, game.getPlayer("score"), game.stream_buffer["score"]);
					//Create new food
					//socket.emit createnew food
					if(game.player.speed>80)
					{
						game.player.speed-=10;
						clearInterval(game.game_loop);
						game.game_loop = setInterval(game.update, game.player.speed);
					}
					//diamond_add={t:false,n:6};
					game.reset.diamond();
					game.dt = false;
					
				}
			}
			if(game.dt == false && game.grow > 0)
			{
				if(game.grow > 0)
				{
					game.grow--;
				}
				if (game.grow == 1)
				{
					game.reset.diamond();
				}
				var tail = {x: nx, y: ny};
			}
			else
			{
				var tail = game.player.snake_array.pop(); //pops out the last cell
				tail.x = nx; tail.y = ny;
			}
    		game.player.snake_array.unshift(tail);//puts back the tail as the first cell
    		//console.log(game.color,game.player.snake_array);
			game.stream_buffer.snake=[game.color, game.player.snake_array];
			console.log(game.stream_buffer);
			//console.log(game.player.score, game.getPlayer("score"), game.stream_buffer["score"]);
    		network.socket.emit('data_stream', game.stream_buffer, function (data) {
    			//check data
    			network.process_stream(data);
    		});
			console.log(game.player.score, game.getPlayer("score"), game.stream_buffer["score"]);
    		game.stream_buffer={};
    		//socket.emit('snake',[game.snake_array, color]);
			
		}

	},
	paint_cell:function (x,y,color)
	{
		game.ctx.fillStyle=color;
		game.ctx.fillRect(x*game.cw,y*game.cw,game.cw,game.cw);
		game.ctx.strokeStyle="white";
		game.ctx.strokeRect(x*game.cw,y*game.cw,game.cw,game.cw);
	},

	check_collision:function (x,y,array)
	{
		if(typeof array != "undefined" && array !== null){
			for (var i = 0; i < array.length; i++)
				{
					if(array[i].x == x && array[i].y == y)
						return true;
				}
				return false;}else return false;
	}
	});
function init(){ 
	game = new gameClass;
	game.setup.game();
	game.initUI();
	game.setup.canvas();
	network.setup();
	setupContols();
	console.log(game);
};