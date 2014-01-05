'use strict';
function kitchen (level) {
	this.level=level;

	this.dictionary=[];

	this.pot=[];

	for(var i=0;i<this.foods.order.length; i++) {
		this.pot.push(new food(this.foods[this.foods.order[i]],this));
	}
}

kitchen.prototype.regenerate = function () {
	this.dictionary.length=0;
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
	var index=-1;
	for(var i=0; i<this.dictionary.length; i++) {
		if(head.x === this.dictionary[i].link.x && head.y === this.dictionary[i].link.y) {
			index=i;
		}
	}
	if(index !== -1) {
		console.log(index, this.dictionary[index]);
		return this.dictionary[index].id;
	}
	else return false;
};

kitchen.prototype.eat = function (food) {
	// splice(index,1)
	console.log(food);
	for(var i=0; i<this.dictionary.length;i++) {
		if(food.link.x == this.dictionary[i].link.x && food.link.y == this.dictionary[i].link.y) {
			console.log(this.pot[this.dictionary[i].id]);
			this.pot[this.dictionary[i].id].body.splice(this.dictionary[i].index,1);
			this.dictionary.splice(i,1);
		}
	}
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
			this.self.dictionary.push(
				{"link":link,
				id:this.config.id,
				index:this.body.push(link)-1});
			console.log(link);
			return true;
		}
		console.log(this.self.pot[i].body.indexOf(link));
	}
	console.log(link);
}
