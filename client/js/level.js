'use strict';
function level (width,height) {
	//generate grid level
	//gererate x grid
	this.map = new Array(width);
	for (var i=0;i<width;i++) {
		//gererate y grid
		this.map[i] = new Array(height);
	}
	this.players = new Array(0);
	this.logger = new this.log();
};

level.prototype.getblock = function (x,y) {
	return this.map[x][y];
};

level.prototype.render = function () {

};

level.prototype.update = function () {};


level.prototype.chat = function () {
};

level.prototype.log = function () {
	self = this;
	this.messages = new Array(0);
	this.message_id=0;
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
	};
};

