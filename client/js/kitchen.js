'use strict';
function kitchen (level) {
	this.level=level;

	this.pot=[];

	for(var i=0;i<this.foods.order.length; i++) {
		this.pot.push(new food(this.foods[this.foods.order[i]],this));
	}
}

kitchen.prototype.regenerate = function () {
	for(var i=0;i<this.pot.length; i++) {
		this.pot[i].body.length=0;
	}
};

kitchen.prototype.update = function () {
	for(var i=0;i<this.pot.length;i++) {
		this.pot[i].update();
	}
};

kitchen.prototype.render = function () {
	for(var i=0;i<this.pot.length;i++) {
		this.pot[i].render();
	}
};

kitchen.prototype.lookup = function (head) {
	for(var i=0; i<this.pot.length;i++) {
		for(var j=0; j<this.pot[i].body.length;j++) {
			if(head.x == this.pot[i].body[j].x && head.y == this.pot[i].body[j].y) {
				return {type:this.foods.order[i],falsy:true,index:{food:i,link:j}};
			}
		}
	}
	return {falsy:false};
};

kitchen.prototype.eat = function (index) {
	this.pot[index.food].body.splice(index.link,1);
}

kitchen.prototype.foods = {
	apple:{id:0,max:2,color:{r:227,g:38,b:54}},
	berries:{id:1,max:1,color:{r:0,g:112,b:255}},
	diamonds:{id:2,max:1,color:{r:185,g:242,b:255}},
	wormhole:{id:3,max:3,color:{r:61,g:43,b:31}},
	beer:{id:4,max:3,color:{r:240,g:220,b:130}},
	order:["apple","berries","diamonds","wormhole","beer"]
};

function food(type,self) {
	body.call(this, type.color);
	this.self=self;
	this.ctx=self.level.ctx;
	this.cell=self.level.cell;
	this.config=type;
	this.body.length=0;
}

food.prototype = new body();

food.prototype.constructor=food;

food.prototype.update = function(){
	if(this.body.length <= this.config.max)
		this.spawn();
}

food.prototype.spawn = function() {
	// pick random number where there isn't already something there
	// append to dictionary
	var link={};
	link.x=Math.floor(Math.random() * (this.self.level.width/10 -2)) + 1;
	link.y=Math.floor(Math.random() * (this.self.level.height/10 -2)) + 1;
	for(var i in this.self.pot) {
		if(this.self.pot[i].body.indexOf(link) === -1){
			//this.body.push(link);
			this.body.push(link);
			console.log(link);
			return true;
		}
		console.log(this.self.pot[i].body.indexOf(link));
	}
	console.log(link);
}
