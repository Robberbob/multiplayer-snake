'use strict';
//snake constuctor
function snake(level,color) {
	// active level
	this.level=level;
	// 2d canvas
	this.ctx=level.ctx;
	// Temporary id
	this.id=Math.random();
	this.speed=150;
	this.state="play";
	this.grow=0;
	this.color=color||"blue";

	this.stats={ping:0,score:0};
	this.input=[];
	window.onkeydown=this.eventHandler.bind(this);
	//this.eventHandler(this);
};
snake.prototype = new body();

snake.prototype.spawn = function () {
	this.body.length=0;
	for(var i = 1; i<6; i++) {
		console.log("new link");
		this.body.push({x: i,y:1});
	} 
	this.input.push("right");
	if(typeof this.tick==="undefined") {
		console.log(typeof this.tick);
		this.tick=setInterval(function(){this.update()}.bind(this),this.speed);
	}
};

snake.prototype.eventHandler = function (evt) {
	//console.log(this);
    evt = evt || window.event;
    var key = keyDecode(evt);
    //if(key =="b")this.update();
	if((key == "left"/* || key == "a" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("left");
	else if((key == "up"/* || key == "w" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("up");
	else if((key == "right"/* || key == "d" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("right");
	else if((key == "down"/* || key == "s "&& game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)this.input.push("down");

};
snake.prototype.checkCollision = function() {
	// Check self collision
	for(var i=0;i<this.body.length-1;i++){
		if(this.body[this.body.length-1].x==this.body[i].x && this.body[this.body.length-1].y==this.body[i].y)
			return true;
	}
	return false;
};
snake.prototype.update = function () {
	if(this.checkCollision()) {
		this.body.length=0;
		clearInterval(this.tick);
		delete this.tick;
	}
	if(this.body.length>0) {
		var nx = this.body[this.body.length-1].x;
		var ny = this.body[this.body.length-1].y;
		switch(this.input[this.input.length-1]) {
			case "right":
				nx++;
				break;
			case "left":
				nx--;
				break;
			case "up":
				ny--;
				break;
			case "down":
				ny++;
				break;
		}
		if(this.input.length>1)
			this.input.shift();
		var tail = this.body.shift(); //pops out the last cell
		tail.x=nx;
		tail.y=ny;
		this.body.push(tail);
	}
};