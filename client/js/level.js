'use strict';
function level (width,height,canvas) {
	// Create alias for body
	this.map=this.body;
	//generate map
	//gererate x grid
	for (var i=0;i<width;i++) {
		//gererate y grid
		this.map[i] = new Array(height);
	}
	for (var x=0;x<width;x++) {
		this.map[x][0]="grey";
		this.map[x][height-1]="grey";
	}
	for (var y=0;y<height;y++) {
		this.map[0][y]="grey";
		this.map[width-1][y]="grey";
	}
	this.players = new Array(0);
	this.logger = new this.log();
	this.ctx=canvas;
	this.render();

};

level.prototype = new body();

level.prototype.getblock = function (x,y) {
	return this.map[x][y];
};

level.prototype.render = function () {
	this.ctx.fillStyle = "white";
	this.ctx.fillRect(0,0,1000,500);
	this.ctx.strokeStyle = "black";
	this.ctx.strokeRect(0,0,1000,500);

	for(var x=0;x<this.map.length;x++){
		for(var y=0;y<this.map[x].length;y++){
			if(this.map[x][y] != null) {
				this.ctx.fillStyle=this.map[x][y];
				//outline color
				this.ctx.strokeStyle="white";
				this.ctx.fillRect(x*10,y*10,10,10);
				this.ctx.strokeRect(x*10,y*10,10,10);
			}
		}
	}
	for(var p=0;p<this.players.length;p++) {
		this.players[p].render();
	}
	requestAnimFrame(function() {
		this.render();
	}.bind(this));
};

level.prototype.update = function () {};


level.prototype.chat = function () {
};

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

