function setupContols() {
	document.onkeydown = function(evt) {
	    evt = evt || window.event;
	    var key = keyDecode(evt);

		if((key == "left" || key == "a" && game.chat == false) && game.player.state != "pause" && key != game.player.movement[0])game.player.movement.unshift("left");
		else if((key == "up" || key == "w" && game.chat == false) && game.player.state != "pause" && key != game.player.movement[0])game.player.movement.unshift("up");
		else if((key == "right" || key == "d" && game.chat == false) && game.player.state != "pause" && key != game.player.movement[0])game.player.movement.unshift("right");
		else if((key == "down" || key == "s "&& game.chat == false) && game.player.state != "pause" && key != game.player.movement[0])game.player.movement.unshift("down");

		if(key == "space" && game.player.state == "play" && game.chat == false && game.dead == false){ game.player.state = "pause";}
		else if(key == "space" && game.player.state == "pause" && game.chat == false){ game.player.state = "play";}

		// Chat
		if((key == 't'|| key == 'T') && !(game.chat)) {game.chat = true;  game.message.disabled=false; console.log('game.chat on'); key=''; game.message.focus();  return false; }
		else if(key == 'enter' && game.chat) {
			game.chat = false; 
			if(game.message.value !='') { 
				console.log(['game.chat off',game.message.value]);
				game.createText(game.message.value, game.color);
				network.socket.emit('chat', [game.message.value,game.color]); 
				game.message.value='';
			}
			game.message.blur(); 
			game.message.disabled=true; game.canvas.focus();
		}

		if((key == 'r'|| key == 'R') && !(game.chat) && game.player.state == 'play') game.state.play();

		if(key == '`' && !(game.debug)) game.debug = true;
		else if(key == '`' && game.debug) game.debug = false;

		if(key == 'f' && !(game.chat)) {document.getElementById("body").webkitRequestFullScreen();}

		if(key == 'tab' && !(game.toggle_score))game.toggle_score=true;
		else if(key == 'tab' && game.toggle_score)game.toggle_score=false;
	}
}