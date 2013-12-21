'use strict';
// body constructor
function body (color) {
	console.log(typeof color,color);
	console.log(this);
	this.body=[{x:0,y:0}];
	if(typeof color === "object")
		this.color="rgba("+color.r+","+color.g+","+color.b+",1)";
	else if(typeof color === "string")
		this.color=color;
	else this.color="blue";
};

body.prototype.render = function() {
	//solid color
	//console.log(String.replace("rgba(%s,%s,%s,1)",this.color.r,this.color.g,this.color.b));
	this.ctx.fillStyle=this.color;
	//outline color
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
		this.ctx.strokeRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
	}
};