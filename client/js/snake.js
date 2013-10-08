'use strict';
//snake constuctor
function snake(color) {
	this.speed=150;
	this.state="play";
	this.grow=0;
	this.color=color;
	this.stats={ping:0,score:0};
	this.input=[];
	this.eventHandler(this);
};
snake.prototype = new block();

snake.prototype.spawn = function () {};

snake.prototype.eventHandler = function (self) {
	this.self = self
	window.onkeydown = function(evt) {
	    evt = evt || window.event;
	    var key = keyDecode(evt);

		if((key == "left"/* || key == "a" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.unshift("left");
		else if((key == "up"/* || key == "w" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.unshift("up");
		else if((key == "right"/* || key == "d" && game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.unshift("right");
		else if((key == "down"/* || key == "s "&& game.chat == false*/) /*&& game.player.state != "pause" && key != this.input[0]*/)self.input.unshift("down");
	}
};

snake.prototype.update = function () {};