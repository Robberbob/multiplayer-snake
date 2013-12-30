'use strict';
//snake constuctor
function snake(level,config) {
	body.call(this, config.color);
	// active level
	this.level=level;
	// 2d canvas
	this.ctx=level.ctx;
	this.cell=this.level.cell;
	// config
	this.config=config;
	// Temporary id
	this.id=Math.floor(Math.random()*100)+1;
	this.speed=150;
	this.state="play";
	this.grow=0;
	this.stats={ping:0,score:0};
	this.input=[];
	//this.body=[{x:0,y:0}];
	window.addEventListener("keydown",function(e){this.eventHandler(e)}.bind(this));
	//this.eventHandler(this);
};

snake.prototype = new body();

snake.prototype.constructor=snake;

snake.prototype.spawn = function () {
	this.body.length=0;
	this.input.length=0;
	for(var i = 1; i<6; i++) {
		//console.log("new link");
		this.body.push({x: i,y:1});
	} 
	this.input.push(this.config.right);
	if(typeof this.tick==="undefined") {
		//console.log(typeof this.tick);
		this.tick=setInterval(function(){this.update()}.bind(this),this.speed);
	}
};

snake.prototype.eventHandler = function (evt) {
	//console.log(this);
    evt = evt || window.event;
    var key = keyDecode(evt);
    switch(key){
    	case "b":
    		this.update();
    		break;
    	case "r":
    		//this.spawn();
    		break;
    }
    console.log(key);
    // Controls
	if((this.input[this.input.length-1] != key)&&
	   ((key==this.config.up && this.input[this.input.length-1] != this.config.down)||
		(key==this.config.down && this.input[this.input.length-1] != this.config.up)||
		(key==this.config.right && this.input[this.input.length-1] != this.config.left)||
		(key==this.config.left && this.input[this.input.length-1] != this.config.right))){
			this.input.push(key);
		}

    //if(key =="b")this.update();
	//if((key == "left"/* || key == "a" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("left");
	//else if((key == "up"/* || key == "w" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("up");
	//else if((key == "right"/* || key == "d" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("right");
	//else if((key == "down"/* || key == "s "&& game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("down");

};
snake.prototype.checkCollision = function() {
	// Check self collision
	var p1;
	var p2;

	for (var i = 0; i < this.level.players.length; i++) {
		p2=this.level.players[i];
		if(this.color !== p2.color) {
			//console.log(p2);
			for(var j=0;j<p2.body.length;j++) {
				if(this.body[this.body.length-1].x == p2.body[j].x && this.body[this.body.length-1].y == p2.body[j].y) {
					window.dispatchEvent( new CustomEvent('log', {detail :{ 'snake': this.color, 'killer': p2.color }}));
					return true;
				}
			}
		}
	};

	for(var i=0;i<this.body.length-1;i++){
		if(this.body[this.body.length-1].x==this.body[i].x && this.body[this.body.length-1].y==this.body[i].y) {
			window.dispatchEvent(new CustomEvent('log', {detail :{ 'snake': this.color, 'killer': this.color }}));
			return true;
		}
	}
	// Check Walls
	for(var i=0;i<this.level.map.length-1;i++){
		if(this.body[this.body.length-1].x==this.level.map[i].x && this.body[this.body.length-1].y==this.level.map[i].y) {
			window.dispatchEvent(new CustomEvent('log', {detail :{ 'snake': this.color, 'killer': this.color }}));
			return true;
		}
	}

	return false;
};
snake.prototype.update = function () {
	var head = this.body.length-1;
	var tail={};
	if(this.body.length>0) {
		var nx = this.body[head].x;
		var ny = this.body[head].y;
		if(this.input.length>1)
			this.input.shift();
		switch(this.input[0]) {
			case this.config.right:
				nx++;
				break;
			case this.config.left:
				nx--;
				break;
			case this.config.up:
				ny--;
				break;
			case this.config.down:
				ny++;
				break;
			default:
				break;
		}
		if(this.grow==0) {
			this.body.shift(); //pops out the last cell
			tail.x=nx;
			tail.y=ny;
			this.body.push(tail);
		} else if(this.grow>0) {
			tail.x=nx;
			tail.y=ny;
			this.body.push(tail);
			this.grow--;
		} else if(this.grow<0) {
			this.body.shift(); //pops out the last cell
			this.body.shift(); //pops out the last cell
			tail.x=nx;
			tail.y=ny;
			this.body.push(tail);
			this.grow++;
		}
	}

	switch(this.level.kitchen.lookup(this.body[this.body.length-1])) {
		case false:
			//console.log(this.level.kitchen.lookup(this.body[this.body.length-1]));
			break;
		case this.level.kitchen.foods.apple.id:
			console.log("apple");
			this.level.kitchen.eat({link:this.body[this.body.length-1],id: this.level.kitchen.foods.apple.id});
			this.grow+=5;
			break;
		case this.level.kitchen.foods.berries.id:
			console.log("berries");
			this.level.kitchen.eat({link:this.body[this.body.length-1],id:this.level.kitchen.foods.berries.id});
			this.grow-=3;
			break;
		case this.level.kitchen.foods.diamonds.id:
			this.level.kitchen.eat({link:this.body[this.body.length-1],id:this.level.kitchen.foods.diamonds.id});
			console.log("diamonds");
			this.grow+=10;
			break;

	}

	if(this.checkCollision()) {
		this.body.length=0;
		clearInterval(this.tick);
		delete this.tick;
	}
};