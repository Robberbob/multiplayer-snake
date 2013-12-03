'use strict';
// body constructor
function body (color) {
	this.body=[{x:0,y:0}];
	this.color=color||"blue";
};

body.prototype.render = function() {
	//solid color
	this.ctx.fillStyle=this.color;
	//outline color
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*10,this.body[i].y*10,10,10);
		this.ctx.strokeRect(this.body[i].x*10,this.body[i].y*10,10,10);
	}
};