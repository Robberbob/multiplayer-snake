'use strict';
function game () {
	window.requestAnimFrame = (function(callback) {
	    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	    function(callback) {
	      window.setTimeout(callback, 1000 / 60);
        };
	})();
	this.ui = new this.UI(this);
	this.assets();
	this.ctx=document.getElementById("canvas").getContext("2d");
};

game.prototype.UI = function (self) {
	this.self = self;
	// boolean open/closed
	this.oc=true;
	document.getElementById("single").addEventListener("click", function() {self.ui.singleplayer(self)});
	document.getElementById("multi").addEventListener("click", function() {self.ui.multiplayer(self)});
	document.getElementById("refresh").addEventListener("click", function(){network.getServers();} );
	document.getElementById("back").addEventListener("click", function(){self.ui.home()});
	document.getElementById("settings").addEventListener("click", function() {self.ui.settings()});
	window.onkeydown=function(e) {
        var key = keyDecode(e);
        console.log(e);
        if (key === "escape") {
            if(!!this.oc)
            	this.close();
            else
            	this.open(); 
    	this.oc^=true;
        };
    }.bind(this);
    this.home = function() {
		console.log(this);
		$("#multi").css("display", "inline");
		$("#single").css("display", "inline");
		$("#settings").css("display", "inline");
		$("#serverBrowser").css("display", "none");

	};

	this.close = function() {
		$("#menu").css("display", "none");
	}

	this.open = function() {
		$("#menu").css("display", "inline");
	}

	this.multiplayer = function() {
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
		$("#multi").css("display", "none");
		$("#single").css("display", "none");
		$("#settings").css("display", "none");
		$("#serverBrowser").css("display", "table");
	};

	this.singleplayer = function(self) {
		//console.log(this,self);
		this.close();
		self.level = new level(100,50,self.ctx);
		self.level.players.push(new snake());
		//console.log(this);

	};

	this.settings = function() {
		alert(":P what? You actually thought that would do something? \n -Neo");
	};
};



game.prototype.assets = function() {
	//this.self = self;
};

game.prototype.assets.load = function() {

};

game.prototype.level = null;

game.prototype.network = {}; // new network;

