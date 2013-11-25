'use strict';
// body constructor
function body () {
	this.body=[{x:0,y:0}];
	this.color='blue';
};

body.prototype.render = function() {
	//solid color
	game.ctx.fillStyle=this.color;
	//outline color
	game.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		game.ctx.fillRect(this.body[i].x*10,this.body[i].y*10,10,10);
		game.ctx.strokeRect(this.body[i].x*10,this.body[i].y*10,10,10);
	}
};