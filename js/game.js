var gameClass = Class.extend({
		state:{
			play:function ()
				{
					create_snake();
					stream_buffer.score=game.player.score;
					reset.diamond();
					if(typeof game_loop != "undefined") clearInterval(game_loop);
					game_loop = setInterval(core, game.player.speed);
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
		    ping:0,
		    score:0,
			speed:150,
			movement:[],
		    kill_streak:0,
		    snake_array:{x:-1 , y:-1}
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
			last_spawn = next_spawn;
			next_spawn = getRandomInt(1,4);
			if(last_spawn==next_spawn)while(last_spawn==next_spawn)next_spawn = getRandomInt(1,4);
			var length = 5;
			game.player.snake_array = [];
			eval(spawn[next_spawn]);
			//eval(spawn[4]);
			state = "play";
			dead=false;
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
			scroll_id +=1;
			if (scroll_id >5) {$('#m-br'+(scroll_id-5)).remove();$('#m'+(scroll_id-5)).remove();}
			$('<br id="m-br'+scroll_id+'"><span id="m'+scroll_id+'"><span id="'+p_col+'">'+capitaliseFirstLetter(p_col)+'</span>: '+data+'</span>').insertAfter('#m'+(scroll_id-1));
			$("#message-log").scrollTop($("#m"+scroll_id).position().top);
			command = "setTimeout(function() {$('#m"+scroll_id+"').addClass('fade');}, 4000);";
			eval(command);
		},
		stkl:{
			// stkl = Send To Kill Log
			kill_self:function (data)
			{
				var command;
				kill_id +=1;
				if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
		    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Humiliated Himself!</span>').insertAfter('#k'+(kill_id-1));
				$("#kill-log").scrollTop($("#k"+kill_id).position().top);
				command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
				eval(command);

			},
			kill_color:function (killer, killed)
			{
				var command;
				kill_id +=1;
				if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
		    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+killer+'">'+capitaliseFirstLetter(killer)+'</span> Murdered <span id="'+killed+'">'+capitaliseFirstLetter(killed)+'</span>!</span>').insertAfter('#k'+(kill_id-1));
				$("#kill-log").scrollTop($("#k"+kill_id).position().top);
				command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
				eval(command);

			},
			kill_join:function (data)
			{
				var command;
				kill_id +=1;
				if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
		    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Joined The Game!</span>').insertAfter('#k'+(kill_id-1));
				$("#kill-log").scrollTop($("#k"+kill_id).position().top);
				command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
				eval(command);

			},
			kill_disconnect:function (data)
			{
				var command;
				kill_id +=1;
				if (kill_id >5) {$('#k-br'+(kill_id-5)).remove();$('#k'+(kill_id-5)).remove();}
		    	$('<br id="k-br'+kill_id+'"><span id="k'+kill_id+'"><span id="'+data+'">'+capitaliseFirstLetter(data)+'</span> Disconnected!</span>').insertAfter('#k'+(kill_id-1));
				$("#kill-log").scrollTop($("#k"+kill_id).position().top);
				command = "setTimeout(function() { $('#k"+kill_id+"').addClass('fade'); }, 4000);";
				eval(command);

			}
		},
		check_clients:function(cx,cy)
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

		},
		render:function()
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
		    
		},
		update:function()
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
					stream_buffer['score']=game.getPlayer("score");
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
					stream_buffer['score']=game.getPlayer("score");
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
						stream_buffer.food_eaten=[nx,ny];
						food.splice(i,1);
						var tail = {x: nx, y: ny};
						game.player.score+=5;
						//socket.emit('game.player.score', game.player.score);
						stream_buffer['score']=game.getPlayer("score");
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
						stream_buffer.rotten_food_eaten=[nx,ny];
						rotten_food.splice(i,1);
						//console.log(eaten);
						var tail = {x: nx, y: ny};
						reset.food.sub();
						for(var i = grow; i<1; i++)game.player.snake_array.pop();
						game.player.score-=10;
						//socket.emit('game.player.score', game.player.score);
						stream_buffer['score']=game.getPlayer("score");
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
						stream_buffer.diamond_eaten=[nx,ny];
						diamond.splice(i,1);
						var tail = {x: nx, y: ny};
						game.player.score +=25;
						//socket.emit('game.player.score', game.player.score);
						stream_buffer['score']=game.getPlayer("score");
						console.log(game.player.score, game.getPlayer("score"), stream_buffer["score"]);
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
	    		console.log(color,game.player.snake_array);
				stream_buffer.snake=[color,game.player.snake_array];
				//console.log(stream_buffer);
				console.log(game.player.score, game.getPlayer("score"), stream_buffer["score"]);
	    		socket.emit('data_stream', stream_buffer, function (data) {
	    			//check data
	    			process_stream(data);
	    			//console.log(data.score[1]);
	    			//for(i in data)if(i == "score")console.log(stream_buffer.score,game.player.score)//debugger
	    		});
				console.log(game.player.score, game.getPlayer("score"), stream_buffer["score"]);
	    		stream_buffer={};
	    		//socket.emit('snake',[game.snake_array, color]);
				
			}

		},
		paint_cell:function (x,y,color)
		{
			ctx.fillStyle=color;
			ctx.fillRect(x*cw,y*cw,cw,cw);
			ctx.strokeStyle="white";
			ctx.strokeRect(x*cw,y*cw,cw,cw);
		},

		check_collision:function (x,y,array)
		{
			if(typeof array != "undefined"){
				for (var i = 0; i < array.length; i++)
					{
						if(array[i].x == x && array[i].y == y)
							return true;
					}
					return false;}else return false;
		}
	});
	game = new gameClass;
	console.log(game);