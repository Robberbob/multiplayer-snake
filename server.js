#!/bin/env node
//  OpenShift sample Node application
var express = require('express');
var fs      = require('fs');
var io = require('socket.io');
io.set('transports', [
    'websocket'
]);

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
        self.port      = process.env.OPENSHIFT_INTERNAL_PORT || 8080;

        if (typeof self.ipaddress === "undefined") {
            //  Log errors on OpenShift but continue w/ 127.0.0.1 - this
            //  allows us to run/test the app locally.
            console.warn('No OPENSHIFT_INTERNAL_IP var, using 127.0.0.1');
            self.ipaddress = "127.0.0.1";
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
        self.zcache['index2.html'] = fs.readFileSync('./index2.html');
        self.zcache['js/jquery.min.js'] = fs.readFileSync('./js/jquery.min.js');
        self.zcache['js/keyDecode.js'] = fs.readFileSync('./js/keyDecode.js');
        self.zcache['js/engine.js'] = fs.readFileSync('./js/engine.js');
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
            res.send(self.cache_get('index2.html') );
        };

        self.routes['/snake'] = function(req, res) {
            res.setHeader('Content-Type', 'text/html');
            res.send(self.cache_get('index2.html') );
        };

        self.routes['/js/jquery.min.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            res.send(self.cache_get('js/jquery.min.js') );
        };

        self.routes['/js/keyDecode.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            res.send(self.cache_get('js/keyDecode.js') );
        };

        self.routes['/js/engine.js'] = function(req, res) {
            res.setHeader('Content-Type', 'text/javascript');
            res.send(self.cache_get('js/engine.js') );
        };

        self.routes['/style.css'] = function(req, res) {
            res.setHeader('Content-Type', 'text/css');
            res.send(self.cache_get('style.css') );
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

function snake() {
  return {
    taken:0,
    pos:{x:-1 , y:-1},
    ping:0,
    score:0,
    kill_streak:0};
}
var colors=["blue","red","green","purple","orange","brown"];
var food=[];
var diamond=[];
var rotten_food=[];
var map_array;
var food_spawn_array;
var cw = 10;
var w = 1000, h = 500;
var players={};
for(i in colors)
{
  players[colors[i]] = new snake;
}
/*players={ 
  blue:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0}, 
  red:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0}, 
  green:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0}, 
  purple:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0}, 
  orange:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0}, 
  brown:{taken:0, pos:{x:-1 , y:-1}, ping:0, score:0, kill_streak:0} };*/
var data_stream={};
function check_collision(x,y,array)
{
  for (var i = 0; i < array.length; i++)
    {
      if(array[i].x == x && array[i].y == y)
        return true;
    }
    return false;
}
function players(data)
{
  status = data[0];

  if(status === "join")
  {}
  if(status === "disconnect")
  {}
}
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

  function create_food(data)
  {
    while(true)
    {   
      var X = Math.round(Math.random()*(w-cw)/cw);
      var Y = Math.round(Math.random()*(h-cw)/cw);
      if(!check_collision(X,Y,food_spawn_array))
      {
        food.push({x:X,y:Y});
        if(data == 1) io.sockets.emit('food', food);
        break;
      }
    }
  }

  function create_rotten_food(data)
  {
    while(true)
    {   
      var X = Math.round(Math.random()*(w-cw)/cw);
      var Y = Math.round(Math.random()*(h-cw)/cw);
      if(!check_collision(X,Y,food_spawn_array))
      {
        rotten_food.push({x:X,y:Y});
        if(data == 1) io.sockets.emit('rotten_food', rotten_food);
        break;
      }
    }
  }

  function create_diamond(data)
  {
    while(true)
    {   
      var X = Math.round(Math.random()*(w-cw)/cw);
      var Y = Math.round(Math.random()*(h-cw)/cw);
      if(!check_collision(X,Y,food_spawn_array))
      {
        diamond.push({x:X,y:Y});
        if(data == 1) io.sockets.emit('diamond', diamond);
        break;
      }
    }
  }




  //Spawn map
  create_map();
  //Spawn Food

  create_food(0);
  create_diamond(0);
  create_rotten_food(0);

 var gfood = setInterval(function () { if(food.length < 10)create_food(1);  }, getRandomInt(1,4));

 var dfood = setInterval(function () { if(diamond.length < 10)create_diamond(1); }, getRandomInt(2,6));

 var rfood = setInterval(function () { if(rotten_food.length < getRandomInt(6,15)/1000){create_rotten_food(1);} }, getRandomInt(12,18));

// Update all the clients at the same time
io.sockets.on('connection', function (socket) {
  socket.join('game');
  //console.log(io.sockets.clients('game')[0].id);
  //console.log(io.sockets.clients('game').length);
  var OldLatency=0;
  var NewLatency=0;
  // Inital data
  socket.on("join", function () {
  socket.emit('map_array', map_array);
  socket.emit('clientid', socket.id);
  socket.emit('connections', check_connections());
  socket.emit('food', food);
  socket.emit('diamond', diamond);
  socket.emit('rotten_food', rotten_food);
});

  socket.on('data_stream', function (data, fn) {
    for(i in data)
      {
        //if(i == 'chat')console.log(true);
        //if(i=='snake')console.log(data[i][1]);
        //console.log(i);
        if(i=='snake'){players[data[i][0]].pos=data[i][1]; /*data_stream.player=players[data[i][1]];*/ data_stream.player=data[i]; }
        if(i=='kill_log') data_stream.kill_log=data[i]; 
        if(i=='reset_food')for(var j in food) if(food[j].x == data[i][0] && food[j].y == data[i][1]) { food.splice(j,1); data_stream.food=food;}
        if(i=='reset_rotten_food')for(var j in rotten_food) if(rotten_food[j].x == data[i][0] && rotten_food[j].y == data[i][1]) {rotten_food.splice(j,1); data_stream.rotten_food=rotten_food;}
        if(i=='reset_diamond')for(var j in diamond) if(diamond[j].x == data[i][0] && diamond[j].y == data[i][1]) {diamond.splice(j,1); data_stream.diamond=diamond;}
        if(i=='score')for(var j in players) if(socket.id == players[j].taken) {players[j].score=data[i]; data_stream.score=[j,data[i]];}
      }
  //console.log(data['snake'][1]);
  fn(data_stream);
  socket.broadcast.emit('data_stream',data_stream);
  //socket.emit('data_stream',data_stream);
  data_stream={};
  });

//setInterval(function () { socket.emit('players', players) }, 2000);

  // Once player request a color go through the list of colors, check if their taken,
  // if not give them the color once finished give the position of any paused players.
  socket.on('getrooms', function (data, fn) {
    fn(io.sockets.manager.rooms);
  });
  socket.on('player', function (data, fn) {
    if(data=='request')
    {
      for(var i in players)
      {
        //console.log(i);
        if(players[i].taken == 0)
        {
          socket.broadcast.emit('kill_log', ['joined',i] );
          players[i].taken = socket.id;
          fn([socket.id, i]);
          console.log(i+' connected');
          break;
        }
      }
    }
  socket.emit('players', players);

  });
// Client latency after it gets its color
setInterval(function() {
    emitTime = +new Date;
    socket.emit('ping');
  }, 2000);

  socket.on('pong', function() {
    OldLatency = NewLatency;
    NewLatency = (Math.round((((+new Date - emitTime)/2+OldLatency)/2)*10)/10);
    //NewLatency = (((+new Date - emitTime)/2)+OldLatency)/2;
    for(var i in players)
    {
      if(players[i].taken == socket.id)
      {
        players[i].ping = NewLatency;
      } 
    }
  });
// Send the chat to other clients
  socket.on('chat', function (data) {
    var words = data[0].split(' ');
    //console.log(words);
    if(words[0] == '/kick' && words[1]!=''){ for(var i in players){ if(i == words[1]){socket.broadcast.emit('kick',words[1]); console.log('kicked '+words[1])}}}
    else {socket.broadcast.emit('chat', data); console.log(data[1]+ ": "+data[0]) ;}
  });

  setInterval(function () {socket.emit('connections', check_connections())}, 5000);

  socket.on('disconnect', function (data) {
    for(var i in players)
    {
      if(players[i].taken == socket.id)
      {
        players[i] = new snake;
        socket.broadcast.emit('kill_log', ['disconnected',i]);
        console.log("client "+i+" disconnected");

      } 

      //console.log(players[i]);
    }
    //console.log("Client "+socket.id+" disconnected!")
  });
});

