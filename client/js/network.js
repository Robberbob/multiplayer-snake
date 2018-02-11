'use strict';
function network () {
  const socket = new WebSocket('ws://localhost:8080');
  this.socket=socket;
  const EVENTS = {
    MOVE:0,
    CHAT:1,
    GETFRIENDS:2,
    GETROOMS:3,
    JOINROOM:4,
    LEAVEROOM:5
  }

  var uint8 = new Uint8Array([0,3]);

  // Connection opened
  window.onbeforeunload = function() {
    socket.onclose = function () {}; // disable onclose handler first
    socket.close()
  };
  socket.addEventListener('close', function (event) {
    console.log("closing socket");
    //socket.send({action:"disconnect"});
  });
  socket.addEventListener('open', function (event) {
    //put startup code in here dummy
      socket.send(JSON.stringify({action:"getrooms"}));
      socket.send(JSON.stringify({action:"getfriends"}));
      socket.send(uint8);
      //socket.send(JSON.stringify({action:'chat',message:"hi"}));
  });
  // Listen for messages
  socket.addEventListener('message', function (event) {
      console.log(`Message from server:${event.data}`);
  });
}
network.prototype.update = function (obj) {
  this.socket.send(obj);
}
