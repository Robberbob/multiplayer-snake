$(document).ready(function() {

	var lastLoop = new Date;
	//Canvas stuff
	var canvas = $("#canvas")[0];
	var ctx = canvas.getContext("2d");
	var w = $("#canvas").width();
	var h = $("#canvas").height();
	var state = 'play';
	var cw = 10;
	//Lets create the snake now
	//var snake_array; //an array of cells to make up the snake

	render_loop = setInterval(render, 16.666*2);

	//Lets paint the snake now
	//var snake_array;
	
	//snake_array;
	var socket = io.connect('http://192.168.1.147');

		socket.on('snakepos',function(data) {
	  //console.log(data.client);
	  snake_array = data.client;
	  if(snake_array[1]== 'blue') blue=snake_array[0];
	  if(snake_array[1]== 'green') green=snake_array[0];
	  if(snake_array[1]== 'red') red=snake_array[0];
	  if(snake_array[1]== 'purple') purple=snake_array[0];
	});
		socket.on('map_array', function(data){
			map_array = data;
		});
	function render()
	{

		var thisLoop = new Date;
	    var fps = 1000 / (thisLoop - lastLoop);
	    lastLoop = thisLoop;

		// Lets paint the canvas now
		ctx.fillStyle = "white";
		ctx.fillRect(0,0,w,h);
		ctx.strokeStyle = "black";
		ctx.strokeRect(0,0,w,h);
	if(typeof blue != "undefined"){	
		  for(var i = 0; i < blue.length; i++)
			{
					var c = blue[i];
					//paint 10px wide cells
					paint_cell(c.x,c.y,"blue");
				
			}}
	if(typeof green != "undefined"){	
		  for(var i = 0; i < green.length; i++)
			{
					var c = green[i];
					//paint 10px wide cells
					paint_cell(c.x,c.y,"green");
				
			}}
	if(typeof red != "undefined"){	
		  for(var i = 0; i < red.length; i++)
			{
					var c = red[i];
					//paint 10px wide cells
					paint_cell(c.x,c.y,"red");
				
			}}
	if(typeof purple != "undefined"){	
		  for(var i = 0; i < purple.length; i++)
			{
					var c = purple[i];
					//paint 10px wide cells
					paint_cell(c.x,c.y,"purple");
				
			}}
	

		
if(typeof map_array != "undefined"){
		for(var i = 0; i < map_array.length; i++)
		{
			var c = map_array[i];
			//paint 10px wide cells
			var temp = 110;
			paint_cell(c.x,c.y,"rgb("+temp+","+temp+","+temp+")");
		}}

/*	
		// Paint Food
		paint_cell(diamond.x,diamond.y,"cyan");
		paint_cell(food.x,food.y,"green");
		paint_cell(rotten_food.x,rotten_food.y,"red");*/

	    if(state == "pause")
	    {
			ctx.fillStyle = "rgba(100, 100, 100, .5)";
			ctx.fillRect(0,0,w,h);
			ctx.strokeStyle = "black";
			ctx.strokeRect(0,0,w,h);
			ctx.fillStyle = "black";
	    	ctx.font = 'normal 24px Sans-Serif';
	    	ctx.textAlign = "center";
			ctx.fillText("Game Paused",w/2,h/2);
	    	ctx.font = 'normal 10px Sans-Serif';
	    	ctx.textAlign = "left";
	    }


	// Text
		//var score_text = "Score: "+score;
		ctx.fillStyle="blue";
		//ctx.fillText(score_text,5,10);

		/* Debug */
		ctx.fillText("FPS: "+Math.round(fps),5,40);
		/* Debug */
	    
	}
	
	function paint_cell(x,y,color)
	{
		ctx.fillStyle=color;
		ctx.fillRect(x*cw,y*cw,cw,cw);
		ctx.strokeStyle="white";
		ctx.strokeRect(x*cw,y*cw,cw,cw);
	}
	$(document).keydown(function(e){
		var key = keyDecode(e);
		console.log(key);
		if(key == "space" && state == "play"){ state = "pause";}
		else if(key == "space" && state == "pause"){ state = "play";}
 
	})
	

})
