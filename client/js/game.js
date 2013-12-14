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

	this.viewport = {};

	console.log(this.ctx.canvas);
	//console.log(Math.round((this.height*1.77777778)/10)*10+"x"+Math.round(this.height/10)*10);
	this.ui.resize();
	window.addEventListener("resize", function () {
		//console.log(this);
		this.ui.resize();
	}.bind(this));
};

game.prototype._ui = function (self) {
	this.self = self;
	// boolean open/closed
	this.oc=true;
	this.fc=false;
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

        if(key === "f") {
        	document.getElementById("body").webkitRequestFullScreen(Element.ALLOW_KEYBOARD_INPUT);
        	document.getElementById("canvas").focus();
        	//window.focus();
        	//this.fc^=true;
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

	this.resize = function() {
		//console.log(self.viewport);
		self.width=window.innerWidth;
		self.height=window.innerHeight;

		document.getElementsByTagName("html")[0].setAttribute("style","width:"+self.width+"px;");
		// use this if the screen is wider than it is longer
		self.viewport.x=Math.floor((self.height*1.78571429)/10)*10;

		if(self.viewport.x > window.innerWidth) {
			// if the screen is longer than it is wider use this
			self.viewport.x=Math.floor(self.width/10)*10;
			self.viewport.y=Math.floor((self.width/1.78571429)/10)*10;
			//$("#body").css("background-color","pink");
		}else {
			// continue with first calculation
			self.viewport.y=Math.floor(self.height/10)*10;
			//$("#body").css("background-color","black");
		}

		self.ctx.canvas.width=self.viewport.x;
		self.ctx.canvas.height=self.viewport.y;

		$("#body").css("width", self.viewport.x);
		$("#body").css("height", self.viewport.y);

		// set cell size here so it's not recalculating it every frame
		if(self.level !== null) {
			self.level.cell.x=10*(self.level.ctx.canvas.width/self.level.width);
			self.level.cell.y=10*(self.level.ctx.canvas.height/self.level.height);
		}

		// this is very inaccurate and needs a lot of thought
		$("#message-container").css("left", screen.width/2-Math.round(self.height/1.78571429)*1.5);

	}
};

game.prototype.assets = function() {
	//this.self = self;
};

game.prototype.assets.load = function() {

};

game.prototype.level = null;

game.prototype.network = {}; // new network;

