const WebSocket = require('ws');
const rooms = require("rooms");
const uuid = require('uuid/v1');

const wss = new WebSocket.Server({ port: 8080 });

const EVENTS = {
  MOVE:0,
  CHAT:1,
  GETFRIENDS:2,
  GETROOMS:3,
  JOINROOM:4,
  LEAVEROOM:5
}

const MOVEMENTS = {
  UP:0,
  DOWN:1,
  LEFT:2,
  RIGHT:3
}

EVENTLOOKUP=Object.keys(EVENTS);
MOVEMENTLOOKUP=Object.keys(MOVEMENTS);

var uint8 = new Uint8Array(2);

function heartbeat() {
  this.isAlive = true;
  //console.log('*beat*');
}

function sendToRoom(ws,data) {
  var friends = rooms.friends(ws.room,ws);

  for (const friend in friends) {
    console.log(friend,data);
    friends[friend].send(JSON.stringify(data), err=>{
      console.log(18,err)
    });
  }
}

wss.on('connection', function connection(ws) {
  ws.isAlive = true;
  ws.on('pong', heartbeat);
  ws.id = uuid();
  //console.log(ws);
  rooms.join("room1",ws);
  //console.log(rooms.fr);

  ws.on('message', data => {
    console.log(32,typeof data);
    console.log(33,data);
    if (typeof data === 'string')var obj=JSON.parse(data);
    else {
      var obj=data;
      console.log(47,EVENTLOOKUP[data.readUInt8(0)], MOVEMENTLOOKUP[data.readUInt8(1)])
  }
    switch (obj.action) {
      case 'move':
        if (ws.room !== undefined) {
          //console.log(obj);
          sendToRoom(ws,obj);
        }
      case 'chat':
        if (ws.room !== undefined) {
          sendToRoom(ws,obj.message);
        }
        break;
      case 'getfriends':
        console.log(rooms.friends(ws.room,ws));
        ws.send(JSON.stringify(Object.keys(rooms.friends(ws.room,ws))));
        break;
      case 'getrooms':
        ws.send(JSON.stringify(rooms.list()));
        break;
      case 'joinroom':
        if (obj.room !== undefined && ws.room === undefined) {
          rooms.join(obj.room,ws);
          // send level data


        } else if (ws.room !== undefined) {
          ws.send("You are already in a room!");
        }
        break;
      case 'leaveroom':
        if (ws.room !== undefined) {
          rooms.leave(ws);
        }
        break;
      default:

    }
  });
  ws.on('close', data=>{
    if (ws.room !== undefined) {
      rooms.leave(ws);
    }
    console.log('Closing connection',wss.clients);
  })
});

//wss.on()

const interval = setInterval(function ping() {
  wss.clients.forEach(function each(ws) {
    if (ws.isAlive === false) {
      console.log("Disconnecting client",ws);
      return ws.terminate();
    }
    ws.isAlive = false;
    ws.ping('', false, true);
  });
}, 3000);
