'use strict';
// body constructor
function body (color,cell) {
	this.body=[{x:0,y:0}];
	this.color=color||"blue";
};

body.prototype.render = function() {
	//solid color
	this.ctx.fillStyle=this.color;
	//outline color
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
		this.ctx.strokeRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
	}
};