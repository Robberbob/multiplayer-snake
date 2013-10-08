'use strict';
// block constructor
function block () {
	this.body=[{x:0,y:0}];
	this.color='blue';
};

block.prototype.render = function() {
	//solid color
	game.ctx.fillStyle=this.color;
	//outline color
	game.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length();i++) {
		game.ctx.fillRect(this.body[i].x*game.cw,this.body[i].y*game.cw,game.cw,game.cw);
		game.ctx.strokeRect(this.body[i].x*game.cw,this.body[i].y*game.cw,game.cw,game.cw);
	}
};