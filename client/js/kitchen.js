'use strict';
function kitchen (level) {
	this.level=level;

	this.dictionary=[];

	console.log(this.foods);

	this.apple=new food(this.foods.apple);
	this.berries=new food(this.foods.berries);
	this.diamonds=new food(this.foods.diamonds);
	this.wormhole=new food(this.foods.wormhole);
	this.beer=new food(this.foods.beer);

}

// update
kitchen.prototype.stir = function () {


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

function food(type) {
	body.call(this, type.color);
	this.config=type;

}

food.prototype = new body();

food.prototype.constructor=food;

food.prototype.spawn = function() {
	if(this.body.length <= this.config.max) {
		
	}
}