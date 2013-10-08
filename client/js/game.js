'use strict';
function game () {
	window.requestAnimFrame = (function(callback) {
	    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	    function(callback) {
	      window.setTimeout(callback, 1000 / 60);
        };
	})();
	this.ui();
	this.assets();
};

game.prototype.ui = function () {
	console.log(this);
	var self = this;
	document.getElementById("single").addEventListener("click", function() {self.ui.singleplayer(self)});
	document.getElementById("multi").addEventListener("click", function() {this.ui.multiplayer(this)});
	document.getElementById("refresh").addEventListener("click", function(){network.getServers();} );
	document.getElementById("back").addEventListener("click", function(){self.ui.home});
	document.getElementById("settings").addEventListener("click", function() {self.ui.settings});
};

game.prototype.ui.home = function() {
	$("#servers").css("display", "inline");
	$("#play").css("display", "inline");
	$("#settings").css("display", "inline");
	$("#serverBrowser").css("display", "none");

};

game.prototype.ui.multiplayer = function() {

	
	document.getElementById("serverTable").innerHTML = '<tr id="browserHeader"><td>Server Name</td><td># of players</td></tr>';
	/*
			network.socket.emit('getrooms', '', function (data) {
				network.rooms = data;
				//console.log(network);
				var j = 0;
				for(var i in data)if(i!=''){ 
					//i=i.substring(1);
					//console.log(data);
					//console.log(i,data[i].length);
					$("<tr id='"+i.substring(1)+"'><td>"+i.substring(1)+"</td><td>"+data[i].length+"/6</td><</tr>").insertAfter('#browserHeader'));
					j++;
				}
				//console.log(data);

		  		console.log(network.rooms);
		  		for(var i in network.rooms)if(i!=""){
		  			var server = document.getElementById(i.substring(1));
		  			//server.name = i.substring(1);
		  			server.addEventListener("click", function() {
		  					network.join_room(this.id);
		  				}, false);
		  			console.log(i);}
	  		});

	*/
	$("#servers").css("display", "none");
	$("#play").css("display", "none");
	$("#settings").css("display", "none");
	$("#serverBrowser").css("display", "table");
};

game.prototype.ui.singleplayer = function(self) {
	console.log(self);
	self.level = new level(100,50);
	self.level.players.unshift(new snake());
	//console.log(this);

};

game.prototype.ui.settings = function() {
	alert(":P what? You actually thought that would do something? \n -Signed \n The Sign Painter");
};

game.prototype.assets = function() {
	//this.self = self;
};

game.prototype.assets.load = function() {

};

game.prototype.level = null;

game.prototype.network = {}; // new network;

