'use strict';
//snake constuctor
function snake(color) {
	// Temporary id
	this.id=Math.random();
	this.speed=150;
	this.state="play";
	this.grow=0;
	this.color=color||"blue";
	this.stats={ping:0,score:0};
	this.input=[];
	this.eventHandler(this);
};
snake.prototype = new body();

snake.prototype.spawn = function () {
	this.body.length=0;
	for(var i = 1; i<6; i++) {
		console.log("new link");
		this.body.push({x: i,y:1});
	} 
	this.input.push("right");
	this.updater=setInterval(function(){this.update()}.bind(this),150);
};

snake.prototype.eventHandler = function (self) {
	this.self = self;
	window.onkeydown = function(evt) {
	    evt = evt || window.event;
	    var key = keyDecode(evt);

		if((key == "left"/* || key == "a" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.push("left");
		else if((key == "up"/* || key == "w" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.push("up");
		else if((key == "right"/* || key == "d" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.push("right");
		else if((key == "down"/* || key == "s "&& game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.push("down");
	}
};

snake.prototype.update = function () {
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
	/*
	for (var i = 0; i < this.body.length; i++) {
		game.level.map[this.body[i].x][this.body[i].y]=this.color;
	};

	game.level.map[tail.x][tail.y]=null;*/
};