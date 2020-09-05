'use strict';

var os = require('os');
var nodeStatic = require('node-static');
var http = require('http');
var socketIO = require('socket.io');

var fileServer = new(nodeStatic.Server)();
var app = http.createServer(function(req, res) {
  fileServer.serve(req, res);
}).listen(8080);

var io = socketIO.listen(app);
//Se ejecuta cuando la conexion este establecida
io.sockets.on('connection', function(socket) {
  console.log("-----Conectado-----");
 

  socket.on('message', function(message) {
    //Le envia el got user media
    console.log("------Dentro del onMessage del servidor-----");
    console.log(message);
    // for a real app, would be room-only (not broadcast)
    //Se lo emite a todos excpto a mi mismo
    socket.broadcast.emit('message', message);
  });

  socket.on('create or join', function(room) {
    // #2
    console.log("-----Dentro del create or join-----");
    console.log(room); //foo
    var clientsInRoom = io.sockets.adapter.rooms[room];
    var numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0;

    if (numClients === 0) {
      console.log("Hay 0 clientes");
      socket.join(room);
      socket.emit('created', room, socket.id);

    } else if (numClients === 1) {
      //#6
      //Cuando se conecta otro wey
      console.log("Hay 1 cliente");
      io.sockets.in(room).emit('join', room);
      socket.join(room);
      socket.emit('joined', room, socket.id);
      io.sockets.in(room).emit('ready');
    } else { // max two clients
      console.log("Estamos llenos");
      socket.emit('full', room);
    }
  });

  socket.on('ipaddr', function() {
    var ifaces = os.networkInterfaces();
    for (var dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address);
        }
      });
    }
  });

  socket.on('bye', function(){
    console.log('received bye');
  });

});
