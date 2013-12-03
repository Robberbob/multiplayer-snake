'use strict';
function level (width,height,canvas) {
	// Create alias for body
	this.map=this.body;

	//generate map
	this.width=width*10;
	this.height=height*10;

	for(var i=0;i<this.width/10;i++)
	    {
	      this.map.push({x:i,y:0});
	      this.map.push({x:i,y:height-1});
	    }
	for(var i=0;i<this.height/10-2;i++)
	    {
	      this.map.push({x:0,y:i+1});
	      this.map.push({x:width-1,y:i+1});
	    }
	this.players = new Array(0);
	this.logger = new this.log();
	this.ctx=canvas;
  	this.ctx.font = 'normal 12px Helvetica Neue';
	this.render();

};

level.prototype = new body("grey");

level.prototype.getblock = function (x,y) {
	return this.map[x][y];
};

level.prototype.render = function () {
	// Reset to white
	this.ctx.fillStyle = "white";
	this.ctx.fillRect(0,0,this.width,this.height);
	this.ctx.strokeStyle = "black";
	this.ctx.strokeRect(0,0,this.width,this.height);

	this.ctx.fillStyle=this.color;
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*10,this.body[i].y*10,10,10);
		this.ctx.strokeRect(this.body[i].x*10,this.body[i].y*10,10,10);
	}

	for(var p=0;p<this.players.length;p++) {
		this.players[p].render();
    	this.ctx.textAlign = "center";
		this.ctx.fillText(this.players[p].input,this.width/2,this.height/2);
    	this.ctx.textAlign = "left";
		
	}
	requestAnimFrame(function() {
		this.render();
	}.bind(this));
};

level.prototype.update = function () {};


level.prototype.chat = function () {
};

level.prototype.addPlayer = function (color) {
	this.players.push(new snake(this,color));
		//self.level.players.push(new snake());
	//self.level.players[0].spawn();
}

level.prototype.log = function () {
	var self = this;
	this.messages = new Array(0);
	this.message_id=0;
	/*
	this.addEventListener('kill_self', function(){self.kill_self});
	this.kill_self = function (data) {
		console.log(this);
		var command="";
		this.message_id+=1;
		if (this.message_id >5) {$('#k-br'+(this.message_id-5)).remove();$('#k'+(this.message_id-5)).remove();}
		$('<br id="k-br'+this.message_id+'"><span id="k'+this.message_id+'"><span id="'+data+'">'+data+'</span> Humiliated Himself!</span>').insertAfter('#k'+(this.message_id-1));
		$("#kill-log").scrollTop($("#k"+this.message_id).position().top);
		command = "setTimeout(function() { $('#k"+this.message_id+"').addClass('fade'); }, 4000);";
		eval(command);
	};*/
};

