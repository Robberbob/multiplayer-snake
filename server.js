#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var io = require('socket.io');


var http = require('http');
/**
 *  Define the sample application.
 */
var SampleApp = function() {

    //  Scope.
    var self = this;


    /*  ================================================================  */
    /*  Helper functions.                                                 */
    /*  ================================================================  */

    /**
     *  Set up server IP address and port # using env variables/defaults.
     */
    self.setupVariables = function() {
        //  Set the environment variables we need.
        self.ipaddress = process.env.OPENSHIFT_INTERNAL_IP;
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8000;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "192.168.1.109";
        };
    };


    /**
     *  Populate the cache.
     */
    self.populateCache = function() {
        if (typeof self.zcache === "undefined") {
            self.zcache = { 'index.html': '' };
        }

        //  Local cache for static content.
        self.zcache['index.html'] = fs.readFileSync('./index.html');
        self.zcache['js/jquery.min.js'] = fs.readFileSync('./js/jquery.min.js');
        self.zcache['js/keyDecode.js'] = fs.readFileSync('./js/keyDecode.js');
        self.zcache['style.css'] = fs.readFileSync('./style.css');
        //self.zcache['index2.html'] = fs.readFileSync('./index2.html');
    };


    /**
     *  Retrieve entry (content) from cache.
     *  @param {string} key  Key identifying content to retrieve from cache.
     */
    self.cache_get = function(key) { return self.zcache[key]; };


    /**
     *  terminator === the termination handler
     *  Terminate server on receipt of the specified signal.
     *  @param {string} sig  Signal to terminate on.
     */
    self.terminator = function(sig){
        if (typeof sig === "string") {
           console.log('%s: Received %s - terminating sample app ...',
                       Date(Date.now()), sig);
           process.exit(1);
        }
        console.log('%s: Node server stopped.', Date(Date.now()) );
    };


    /**
     *  Setup termination handlers (for exit and a list of signals).
     */
    self.setupTerminationHandlers = function(){
        //  Process on exit and signals.
        process.on('exit', function() { self.terminator(); });

        // Removed 'SIGPIPE' from the list - bugz 852598.
        ['SIGHUP', 'SIGINT', 'SIGQUIT', 'SIGILL', 'SIGTRAP', 'SIGABRT',
         'SIGBUS', 'SIGFPE', 'SIGUSR1', 'SIGSEGV', 'SIGUSR2', 'SIGTERM'
        ].forEach(function(element, index, array) {
            process.on(element, function() { self.terminator(element); });
        });
    };


    /*  ================================================================  */
    /*  App server functions (main app logic here).                       */
    /*  ================================================================  */

    /**
     *  Create the routing table entries + handlers for the application.
     */
    self.createRoutes = function() {
        self.routes = { };

        // Routes for /health, /asciimo and /
        self.routes['/health'] = function(req, res) {
            res.send('1');
        };

        self.routes['/asciimo'] = function(req, res) {
            var link = "http://i.imgur.com/kmbjB.png";
            res.send("<html><body><img src='" + link + "'></body></html>");
        };

        self.routes['/'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            //res.send(self.cache_get('index2.html') );
            res.sendfile(__dirname + '/index.html');
        };

        self.routes['/index'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            //res.send(self.cache_get('index2.html') );
            res.sendfile(__dirname + '/index.html');
        };

        self.routes['/js/jquery.min.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            res.send(self.cache_get('js/jquery.min.js') );
        };

        self.routes['/js/keyDecode.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            res.send(self.cache_get('js/keyDecode.js') );
        };

        self.routes['/js/game.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            //res.send(self.cache_get('game.js') );
            res.sendfile(__dirname + '/js/game.js');
        };

        self.routes['/js/core.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            //res.send(self.cache_get('core.js') );
            res.sendfile(__dirname + '/js/core.js');
        };

        self.routes['/js/controls.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            //res.send(self.cache_get('controls.js') );
            res.sendfile(__dirname + '/js/controls.js');
        };

        self.routes['/js/network.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            //res.send(self.cache_get('network.js') );
            res.sendfile(__dirname + '/js/network.js');
        };

        self.routes['/style.css'] = function(req, res) {
            res.setHeader('Content-Type', 'text/css');
            //res.send(self.cache_get('style.css') );
            res.sendfile(__dirname + '/style.css');
        };
    };


    /**
     *  Initialize the server (express) and create the routes and register
     *  the handlers.
     */
    self.initializeServer = function() {
        self.createRoutes();
        self.app = express();
        self.server = http.createServer(self.app);
        self.io = io.listen(self.server);
        self.io.set('transports', ['websocket','xhr-polling']);
        //  Add handlers for the app (from the routes).
        for (var r in self.routes) {
            self.app.get(r, self.routes[r]);
        }
    };


    /**
     *  Initializes the sample application.
     */
    self.initialize = function() {
        self.setupVariables();
        self.populateCache();
        self.setupTerminationHandlers();

        // Create the express server and routes.
        self.initializeServer();
    };


    /**
     *  Start the server (starts up the sample application).
     */
    self.start = function() {
        //  Start the app on the specific interface (and port).
        self.server.listen(self.port, self.ipaddress, function() {
            console.log('%s: Node server started on %s:%d ...',
                        Date(Date.now() ), self.ipaddress, self.port);
        });
    };

};   /*  Sample Application.  */



/**
 *  main():  Main code.
 */
var zapp = new SampleApp();
zapp.initialize();
zapp.start();
io = zapp.io;
io.set('log level', 1);
function snake() {
    return {
        taken:0,
        pos:null,
        ping:0,
        score:0,
        kill_streak:0};
}
function game() {
    return {
        food:[],
        diamond:[],
        rotten_food:[],
        players:{}};
}
var colors=["blue","red","green","purple","orange","brown"];
var num_rooms = 5;
var rooms = {};
var food=[];
var diamond=[];
var rotten_food=[];
var map_array;
var food_spawn_array;
var cw = 10;
var w = 1000, h = 500;
//var players={};

for(var i = 0; i < num_rooms; i++)
{
    var code =" rooms.game"+i+"= new game;";
    //console.log(code);
    eval(code);
    for(j in colors)
    {
        var code ="rooms.game"+i+".players."+colors[j]+" = new snake;";
        //console.log(code);
        eval(code);
    }
}
console.log(rooms);
/*
for(j in colors)
{
  eval("players[colors[j]] = new snake;");
}*/
//var data_stream={};
function check_collision(x,y,array)
{
  for (var i = 0; i < array.length; i++)
    {
      if(array[i].x == x && array[i].y == y)
        return true;
    }
    return false;
}/*
function players(data)
{
  status = data[0];

  if(status === "join")
  {}
  if(status === "disconnect")
  {}
}*/
function check_connections()
{
  return Object.keys(io.connected).length;
}
function getRandomInt (min, max) {
    return (Math.floor(Math.random() * (max - min + 1)) + min)*1000;
}
function capitaliseFirstLetter(string)
{
    return string.charAt(0).toUpperCase() + string.slice(1);
}
function create_map()
  {
    var h_map = 3;
    var w_map = 40;
    map_array=[];
    food_spawn_array=[];
    for(var i = w_map-1; i>=0; i--)
    {
      for(var j = h_map-1; j>=0; j--)
      {
        var X = Math.round((((w-cw)/cw)/2)-(w_map/2)+i);
        var Y = Math.round((((h-cw)/cw)/2)-(h_map/2)+j);
        if((i == 0 || i == w_map-1)||(j == 0 || j == h_map-1))
        {
        map_array.push({x: X,y:Y});
        }
        food_spawn_array.push({x: X,y:Y});
      }
    }
    var h_map = 50;
    var w_map = 100;
    for(var i = w_map-1; i>=0; i--)
    {
      for(var j = h_map-1; j>=0; j--)
      {
        //console.log(i+'_'+j);
        var X = Math.round((((w-cw)/cw)/2)-(w_map/2)+i);
        var Y = Math.round((((h-cw)/cw)/2)-(h_map/2)+j);
        if((i == 0 || i == w_map-1)||(j == 0 || j == h_map-1))
        {
        map_array.push({x: X,y:Y});
        food_spawn_array.push({x: X,y:Y});
        }
      }
    }

  }

function create_food(data, array, which)
{
  while(true)
  {   
    var X = Math.round(Math.random()*(w-cw)/cw);
    var Y = Math.round(Math.random()*(h-cw)/cw);
    if(!check_collision(X,Y,food_spawn_array))
    {
      //console.log("create_food for "+which);
      rooms[which].food.push({x:X,y:Y});
      if(data == 1) io.sockets.in(which).emit('food', rooms[which].food);
      break;
    }
  }
}

function create_rotten_food(data, array, which)
{
  while(true)
  {   
    var X = Math.round(Math.random()*(w-cw)/cw);
    var Y = Math.round(Math.random()*(h-cw)/cw);
    if(!check_collision(X,Y,food_spawn_array))
    {
      //console.log("create_rotten_food for "+which);
      rooms[which].rotten_food.push({x:X,y:Y});
      if(data == 1) io.sockets.in(which).emit('rotten_food', rooms[which].rotten_food);
      break;
    }
  }
}

function create_diamond(data, array, which)
{
  while(true)
  {   
    var X = Math.round(Math.random()*(w-cw)/cw);
    var Y = Math.round(Math.random()*(h-cw)/cw);
    if(!check_collision(X,Y,food_spawn_array))
    {
      //console.log("create_diamond for "+which);
      rooms[which].diamond.push({x:X,y:Y});
      if(data == 1) io.sockets.in(which).emit('diamond', rooms[which].diamond);
      break;
    }
  }
}

function get_food(game)
{
  for(i in rooms)if(i == game) return rooms[i].food;
}

function get_diamond(game)
{
  for(i in rooms)if(i == game) return rooms[i].diamond;
}

function get_rotten_food(game)
{
  for(i in rooms)if(i == game) return rooms[i].rotten_food_eaten;
}

function update_food(game, x, y)
{
  for(i in rooms) if(i == game) for(var j in rooms[i].food) if(rooms[i].food[j].x == x && rooms[i].food[j].y == y) { rooms[i].food.splice(j,1);}
}

function update_diamond(game, x, y)
{
  for(i in rooms) if(i == game) for(var j in rooms[i].diamond) if(rooms[i].diamond[j].x == x && rooms[i].diamond[j].y == y) { rooms[i].diamond.splice(j,1);}
}

function update_rotten_food(game, x, y)
{
  for(i in rooms) if(i == game) for(var j in rooms[i].rotten_food) if(rooms[i].rotten_food[j].x == x && rooms[i].rotten_food[j].y == y) { rooms[i].rotten_food.splice(j,1);}
}

function get_players(game)
{
  for(i in rooms)if(i == game)return rooms[i].players;
}

var update_players={
  pos:function (game, color, array)
  {
    for(i in rooms)if(i == game){rooms[i].players[color].pos = array; return [color,rooms[i].players[color].pos];}
  },
  score:function (game, color, score)
  {
    for(i in rooms)if(i == game){rooms[i].players[color].score = score; return [color,rooms[i].players[color].score];}
  }
}



//Spawn map
create_map();

//Spawn Food
for(i in rooms)
{
  create_food(0, rooms[i].food, i);
  create_diamond(0, rooms[i].diamond, i);
  create_rotten_food(0, rooms[i].rotten_food, i);
}

var gfood = setInterval(function () { for(i in rooms)if(rooms[i].food.length< 10)create_food(1, rooms[i].food, i);  }, getRandomInt(1,4));

var dfood = setInterval(function () { for(i in rooms)if(rooms[i].diamond.length< 10)create_diamond(1, rooms[i].diamond, i); }, getRandomInt(2,6));

var rfood = setInterval(function () { for(i in rooms)if(rooms[i].rotten_food.length< getRandomInt(6,15)/1000)create_rotten_food(1, rooms[i].rotten_food, i); }, getRandomInt(12,18));

function room(which, socket)
{
  self = this;
  self.data_stream={};
  self.OldLatency=0;
  self.NewLatency=0;
  game = which.substring(1);
  socket.emit('players', get_players(game));
  console.log(which.substring(1));

  socket.on('data_stream', function (data, fn) {
    for(var i in data)
      {
        //if(i == 'chat')console.log(true);
        //if(i=='snake')console.log(data[i][1]);
        //console.log(i, data);
        if(i=="score"){var score = data[i];for(var j in get_players(game))if(socket.id == get_players(game)[j].taken){/*console.log("line 463",j, score);*/ self.data_stream.score=data[i];}}
        if(i=='snake'){ self.data_stream.player=update_players.pos(game, data[i][0], data[i][1]);}
        if(i=='kill_log') self.data_stream.kill_log=data[i]; 
        if(i=='food_eaten'){ 
          var x = data[i][0];
          var y = data[i][1];
          for(var j in rooms[game].food) if(rooms[game].food[j].x == x && rooms[game].food[j].y == y) { rooms[game].food.splice(j,1);}
          //update_food(game, data[i][0], data[i][1]); 
          self.data_stream.food=get_food(game); 
          //console.log("\n"+data[i]+"\n");
        }
        if(i=='rotten_food_eaten'){update_rotten_food(game, data[i][0], data[i][1]); self.data_stream.rotten_food=get_rotten_food(game);}
        if(i=='diamond_eaten'){update_diamond(game, data[i][0], data[i][1]); self.data_stream.diamond=get_diamond(game);}
      }
      //console.log(data['snake'][1]);
      fn(self.data_stream);
      //console.log(self.data_stream);
      //console.log(game);
      socket.broadcast.to(game).emit('data_stream',self.data_stream);
      //socket.emit('data_stream',data_stream);
      self.data_stream={};
  });

  // Once player request a color go through the list of colors, check if their taken,
  // if not give them the color once finished give the position of any paused players.

  socket.on('player', function (data, fn) {
    if(data=='request')
    {
        console.log(data);
      for(var i in get_players(game))
      {
        //console.log(i);
        if(get_players(game)[i].taken == 0)
        {
            socket.broadcast.to(game).emit('kill_log', ['joined',i] );
            get_players(game)[i].taken = socket.id;
            fn([socket.id, i]);
            console.log(i+' connected');
            socket.emit('map_array', map_array);
            socket.emit('clientid', socket.id);
            socket.emit('connections', check_connections());
            socket.emit('food', rooms[game].food);
            socket.emit('diamond', rooms[game].diamond);
            socket.emit('rotten_food', rooms[game].rotten_food);
            break;
        }
      }
    }
  });

  // Client latency after it gets its color
  setInterval(function() {
      emitTime = +new Date;
      socket.emit('ping');
    }, 2000);

  socket.on('pong', function() {
      self.OldLatency = self.NewLatency;
      self.NewLatency = (Math.round((((+new Date - emitTime)/2+self.OldLatency)/2)*10)/10);
      //self.NewLatency = (((+new Date - emitTime)/2)+OldLatency)/2;
      for(var i in get_players(game))
      {
        if(get_players(game)[i].taken == socket.id)
        {
          get_players(game)[i].ping = self.NewLatency;
        } 
      }
  });
  // Send the chat to other clients
  socket.on('chat', function (data) {
    var words = data[0].split(' ');
    //console.log(words);
    //if(words[0] == '/kick' && words[1]!=''){ for(var i in get_players(game)){ if(i == words[1]){socket.broadcast.to(game).emit('kick',words[1]); console.log('kicked '+words[1])}}}
    //else 
    socket.broadcast.to(game).emit('chat', data); console.log("["+game+"]"+data[1]+ ": "+data[0]) ;
  });

  setInterval(function () {socket.emit('connections', check_connections())}, 5000);

}

//for(i in num_rooms)io.sockets.manager.rooms["/game"+i]=[];
setInterval(function() {for (i in rooms) if(!io.sockets.manager.rooms.hasOwnProperty("/"+i)) {console.log("room missing");io.sockets.manager.rooms["/"+i] = new Array();}}, 1000);
io.sockets.manager.rooms={"/game0":[],"/game1":[],"/game2":[],"/game3":[],"/game4":[]};

io.sockets.on('connection', function (socket) {
    //self = this;
    /*if(io.sockets.clients('game1').length == 0)socket.join("game1");
    else socket.join("game2");*/
    socket.on("join_room", function (data){
      socket.join(data);
    });
    //socket.join("game0");
    socket.on('getrooms', function (data, fn) {
        fn(io.sockets.manager.rooms);
    });
    //console.log(io.sockets.clients('game')[0].id);
    //console.log(io.sockets.clients('game').length);
    socket.on("join", function (data){
       for(i in io.sockets.manager.rooms)if(i!="")for(j in io.sockets.manager.rooms[i])if(socket.id == io.sockets.manager.rooms[i][j]){/*console.log("\n im in room "+i);*/var p_room = new room(i, socket);}
    });
    
    socket.on('disconnect', function (data) {
        //console.log(data);
        for(j in rooms)
          {
          
          //console.log("disconnect "+j,game);
          for(var i in rooms[j].players)
              {
              if(rooms[j].players[i].taken == socket.id)
                  {
                  rooms[j].players[i] = new snake;
                  //console.log(rooms[j].players[i]);
                  socket.broadcast.to(j).emit('kill_log', ['disconnected',i]);
                  console.log("client "+socket.id+" disconnected");
                  }
              } 
          }


       
      });
});

