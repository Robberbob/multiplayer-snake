'use strict';
// body constructor
function body (color) {
	//console.log(typeof color,color);
	this.body=[{x:0,y:0}];
	if(typeof color === "object")
		this.color={
			rgb:[color.r,color.g,color.b],
			name:ntc.name(color)[1],
			toString : function () {
				return "rgba("+this.rgb[0]+","+this.rgb[1]+","+this.rgb[2]+",1)";
			}
		}
	else if(typeof color === "string")
		this.color=color;
	//console.log(this);
};

body.prototype.render = function() {
	//solid color
	this.ctx.fillStyle=this.color.toString();
	//outline color
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
		this.ctx.strokeRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
	}
};