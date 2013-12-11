'use strict';
function game () {
	window.requestAnimFrame = (function(callback) {
	    return window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame || window.oRequestAnimationFrame || window.msRequestAnimationFrame ||
	    function(callback) {
	      window.setTimeout(callback, 1000 / 60);
        };
	})();
	this.ui = new this._ui(this);
	this.assets();
	this.ctx=document.getElementById("canvas").getContext("2d");
	this.width=window.innerWidth;
	this.height=window.innerHeight;

	this.cellw=Math.floor((this.height*1.77777778)/10)*10;
	this.cellh=Math.floor(this.height/10)*10;

	$("#body").css("width", this.cellw);
	$("#body").css("height", this.cellh);

	$("#message-container").css("left", screen.width/2-Math.round(this.height/1.77777778)*1.5);

	this.ctx.canvas.width=Math.floor((this.height*1.77777778)/10)*10;
	this.ctx.canvas.height=this.cellh;

	console.log(this.ctx.canvas);
	console.log(Math.round((this.height*1.77777778)/10)*10+"x"+Math.round(this.height/10)*10);

	window.addEventListener("resize", function () {
		this.width=window.innerWidth;
		this.height=window.innerHeight;
		this.cellw=Math.floor((this.height*1.77777778)/10)*10;
		this.cellh=Math.floor(this.height/10)*10;
		$("#body").css("width", this.cellw);
		$("#body").css("height", this.cellh);
		this.ctx.canvas.width=Math.floor((this.height*1.77777778)/10)*10;
		this.ctx.canvas.height=this.cellh;
		$("#message-container").css("left", screen.width/2-Math.round(this.height/1.77777778)*1.5);
	}.bind(this));
};

game.prototype._ui = function (self) {
	this.self = self;
	// boolean open/closed
	this.oc=true;
	document.getElementById("single").addEventListener("click", function() {self.ui.singleplayer(self)});
	document.getElementById("multi").addEventListener("click", function() {self.ui.multiplayer(self)});
	document.getElementById("refresh").addEventListener("click", function(){network.getServers();} );
	document.getElementById("back").addEventListener("click", function(){self.ui.home()});
	document.getElementById("settings").addEventListener("click", function() {self.ui.settings()});
	window.addEventListener("keydown",function(e) {
        var key = keyDecode(e);
        //console.log(key);
        if (key === "escape") {
	        $("#menu").css("display", !!this.oc ? "none" : "inline");
	    	this.oc^=true;
	    	console.log("esc");
        }
        if (key === 'backspace' && document.activeElement.id != 'message-input') {
          //console.log(document.activeElement.id);
            return false;
        };
        if (key === 'tab') {  
          return false;
        }

    }.bind(this));
    this.home = function() {
		console.log(this);
		$("#multi").css("display", "inline");
		$("#single").css("display", "inline");
		$("#settings").css("display", "inline");
		$("#serverBrowser").css("display", "none");

	};

	this.close = function() {
		$("#menu").css("display", "none");
		this.oc=false;
	};

	this.open = function() {
		$("#menu").css("display", "inline");
		this.oc=true;
	};

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
		//console.log(self);
		//console.log(this);
		this.close();
		self.level = new level(1000,560,self.ctx);
		self.level.addPlayer();
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

