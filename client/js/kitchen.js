'use strict';
function kitchen (level) {
	this.level=level;

	this.dictionary=[];

	this.pot=[];

	for(var i in this.foods) {
		this.pot.push(new food(this.foods[i],this));
	}
}

// update
kitchen.prototype.stir = function () {
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
	var index = this.dictionary.indexOf(head);
	if(index !== -1) {
		return this.dictionary[index];
	}
	else return false;
};

kitchen.prototype.foods = {
	apple:{id:0,max:6,color:{r:88,g:99,b:128}},
	berries:{id:1,max:6,color:{r:88,g:99,b:128}},
	diamonds:{id:2,max:6,color:{r:88,g:99,b:128}},
	wormhole:{id:3,max:6,color:{r:88,g:99,b:128}},
	beer:{id:4,max:6,color:{r:88,g:99,b:128}}};

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
	link.x=Math.floor(Math.random() * this.self.level.width -2) + 1;
	link.y=Math.floor(Math.random() * this.self.level.width -2) + 1;
	for(var i in this.self.pot) {
		if(this.self.pot[i].body.indexOf(link) === -1){
			this.body.push(link);
			console.log(link);
			return true;
		}
		console.log(this.self.pot[i].body.indexOf(link));
	}
	console.log(link);
}
