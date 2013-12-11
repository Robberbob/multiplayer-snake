'use strict';
// body constructor
function body (color,cell) {
	this.body=[{x:0,y:0}];
	this.color=color||"blue";
	// not really needed as the snake and map manually set it any way
	this.cell=cell||10;
};

body.prototype.render = function() {
	//solid color
	this.ctx.fillStyle=this.color;
	//outline color
	this.cell=10*(this.ctx.canvas.width/1000);
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*this.cell,this.body[i].y*this.cell,this.cell,this.cell);
		this.ctx.strokeRect(this.body[i].x*this.cell,this.body[i].y*this.cell,this.cell,this.cell);
	}
};