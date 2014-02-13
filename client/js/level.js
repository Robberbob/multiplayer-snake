'use strict';
function level (width,height,canvas) {
	body.call(this,"grey");
	// Create alias for body
	this.map=this.body;
	//generate map
	this.width=width;
	this.height=height;

	this.message_id=0;

	for(var i=0;i<this.width/10;i++)
	    {
	      this.map.push({x:i,y:0});
	      this.map.push({x:i,y:height/10-1});
	    }
	for(var i=0;i<this.height/10-2;i++)
	    {
	      this.map.push({x:0,y:i+1});
	      this.map.push({x:width/10-1,y:i+1});
	    }
	this.players = new Array();

	this.logger = new this.log();
	this.ctx=canvas;
  	this.ctx.font = 'normal 12px Helvetica Neue';
	this.cell={ x: 10*(this.ctx.canvas.width/this.width),
				y: 10*(this.ctx.canvas.height/this.height)};

	this.kitchen = new kitchen(this);

	this.render();
	window.addEventListener("keydown",function(e){this.eventHandler(e);}.bind(this));
	console.log(this.cell.x,this.cell.y);
	//console.log(this.kitchen.render);
};

level.prototype = new body();

level.prototype.constructor=level;

level.prototype.render = function () {
	// Clear canvas
	this.ctx.clearRect(0,0,this.ctx.canvas.width,this.ctx.canvas.height);

	this.ctx.fillStyle=this.color.toString();
	this.ctx.strokeStyle="white";
	for(var i=0;i<this.body.length;i++) {
		this.ctx.fillRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
		this.ctx.strokeRect(this.body[i].x*this.cell.x,this.body[i].y*this.cell.y,this.cell.x,this.cell.y);
	}


	this.kitchen.render();

	for(var p=0;p<this.players.length;p++) {
		if(typeof this.players[p] !== "undefined") {
			this.players[p].render();
			this.ctx.fillText(this.players[p].input,this.width/2,this.height/2);
		}
	}
	requestAnimationFrame(function() {
		this.render();
	}.bind(this));
};

level.prototype.eventHandler = function(evt) {
  	evt = evt || window.event;
    var key = keyDecode(evt);
    switch(key){
    	case "1":
    			if(typeof this.players[0] !== "undefined")
    				this.players[0].spawn();
    			else this.players[0]=new snake(this,{up:"up",down:"down",right:"right",left:"left",color:this.requestColor(0),scoreboard:document.getElementById("player1score")});
    				//this.addPlayer({up:"up",down:"down",right:"right",left:"left"});
    		break;
    	case "2":
    			if(typeof this.players[1] !== "undefined")
    				this.players[1].spawn();
    			else this.players[1]=new snake(this,{up:"w",down:"s",right:"d",left:"a",color:this.requestColor(1),scoreboard:document.getElementById("player2score")});
    				//this.addPlayer({up:"w",down:"s",right:"d",left:"a"});
    		break;
    	case "3":
    			if(typeof this.players[2] !== "undefined")
    				this.players[2].spawn();
    			else this.players[2]=new snake(this,{up:"i",down:"k",right:"l",left:"j",color:this.requestColor(2),scoreboard:document.getElementById("player3score")});
    				//this.addPlayer({up:"w",down:"s",right:"d",left:"a"});
    		break;
    	case "4":
    			if(typeof this.players[3] !== "undefined")
    				this.players[3].spawn();
    			else this.players[3]=new snake(this,{up:"2",down:"5",right:"6",left:"4",color:this.requestColor(3),scoreboard:document.getElementById("player4score")});
    				//this.addPlayer({up:"w",down:"s",right:"d",left:"a"});
    		break;
    	case "r":
    		this.kitchen.regenerate();
    		break;
    }
}

level.prototype.update = function () {
	this.kitchen.update();
};


level.prototype.chat = function () {
};

level.prototype.addPlayer = function (config) {
	for(var i=0; i< this.players.length;i++) {
		if(typeof this.players[i] === "undefined"){
			this.players[i]=new snake(this,this.requestColor(),config);
			break;
		}
		console.log("player"+i+" taken");
	}
}

level.prototype.requestColor = function(index) {
	var color;
	if(typeof index !== "undefined")
		return color = HSV((index * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (index * 0.618033988749895) % 0.5));
	for (var i = 1; i < this.players.length; i++)
		if(typeof this.players !== "undefined") {
			color = HSV((i * 0.618033988749895) % 1.0, 0.5, Math.sqrt(1.0 - (i * 0.618033988749895) % 0.5));
			console.log(color);
    		return color;
    	}
}

level.prototype.log = function () {
	var self = this;
	this.messages = new Array(0);
	this.message_id=0;
	window.addEventListener("log", function (e) {
		console.log(e.detail.snake);
		console.log(e.detail.snake.name+" killed by "+e.detail.killer.name);

		var command="";
		self.message_id+=1;
		if (self.message_id >5) {$('#m-br'+(self.message_id-5)).remove();$('#m'+(self.message_id-5)).remove();}
		if(e.detail.snake===e.detail.killer) {
			$('<br id="m-br'+self.message_id+'"><span id="m'+self.message_id+'"><span style="color:rgb('+e.detail.snake.rgb[0]+","+e.detail.snake.rgb[1]+","+e.detail.snake.rgb[2]+')">'+e.detail.snake.name+'</span> Humiliated Himself!</span>').insertAfter('#m'+(self.message_id-1));
		}else {
			$('<br id="m-br'+self.message_id+'"><span id="m'+self.message_id+'"><span style="color:rgb('+e.detail.killer.rgb[0]+","+e.detail.killer.rgb[1]+","+e.detail.killer.rgb[2]+')">'+e.detail.killer.name+'</span> Humiliated <span style="color:rgb('+e.detail.snake.rgb[0]+","+e.detail.snake.rgb[1]+","+e.detail.snake.rgb[2]+')">'+e.detail.snake.name+'</span></span>').insertAfter('#m'+(self.message_id-1));
		}
		$("#message-log").scrollTop($("#m"+self.message_id).position().top);
		command = "setTimeout(function() { $('#m"+self.message_id+"').addClass('fade'); }, 4000);";
		eval(command);
	});
};

