'use strict';

var isChannelReady = false;
var isInitiator = false;
var isStarted = false;
var localStream;
var pc;
var remoteStream;
var turnReady;

var pcConfig = {
  'iceServers': [{
    'urls': 'stun:stun.l.google.com:19302'
  }]
};

// Set up audio and video regardless of what devices are present.
var sdpConstraints = {
  offerToReceiveAudio: true,
  offerToReceiveVideo: true
};

/////////////////////////////////////////////

var room = 'foo';
// Could prompt for room name:
// room = prompt('Enter room name:');

var socket = io.connect();

if (room !== '') {
  // #1 en ejecutarse
  console.log("Dentro del room");
  socket.emit('create or join', room);
  console.log('Attempted to create or  join room', room);
}

socket.on('created', function(room) {
  //#3
  console.log("-----Created main-----");
  console.log('Created room ' + room);
  isInitiator = true;
});

socket.on('full', function(room) {
  console.log("-----Full main -----");
  console.log('Room ' + room + ' is full');
});

socket.on('join', function (room){
  //#7
  //Este s para el primero que se unio
  console.log("-----Join Main-----");
  console.log('Another peer made a request to join room ' + room);
  console.log('This peer is the initiator of room ' + room + '!');
  //Este se cambia cuando hay otro wey
  isChannelReady = true;
});
//Esto es lo que hace que se activa el maybeStart
socket.on('joined', function(room) {
  //#8
  //Esto le aparace al wey que se acaba de unir
  console.log("-----Joined Main -----");
  console.log('joined: ' + room);
  isChannelReady = true;
});

socket.on('log', function(array) {
  console.log("-----Log Main -----");
  console.log.apply(console, array);
});

////////////////////////////////////////////////

function sendMessage(message) {
  //luego de agregar el localStream
  //got user media

  //Luego de poner la oferta se manda el mensaje de la sesion
  console.log('Client sending message: ', message);
  socket.emit('message', message);
}

// This client receives a message
socket.on('message', function(message) {
  //El mensaje lo recibe el otro wey
  console.log('Client received message:', message);
  if (message === 'got user media') {
    console.log("Got user media");
    maybeStart();
  } else if (message.type === 'offer') {
    //Esto es cuando el otro se conecta
    //Recibe la oferta del primer wey
    console.log("Offer type");
    if (!isInitiator && !isStarted) {
      console.log("Dentro del if");
      maybeStart();
    }
    pc.setRemoteDescription(new RTCSessionDescription(message));
    doAnswer();
  } else if (message.type === 'answer' && isStarted) {
    console.log("answer");
    pc.setRemoteDescription(new RTCSessionDescription(message));
  } else if (message.type === 'candidate' && isStarted) {
    console.log("Candidate");
    var candidate = new RTCIceCandidate({
      sdpMLineIndex: message.label,
      candidate: message.candidate
    });
    console.log("Se agrega el candidato");
    pc.addIceCandidate(candidate);
  } else if (message === 'bye' && isStarted) {
    console.log("Bye");
    handleRemoteHangup();
  }
});

////////////////////////////////////////////////////

var localVideo = document.querySelector('#localVideo');
var remoteVideo = document.querySelector('#remoteVideo');

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true
})
.then(gotStream)
.catch(function(e) {
  alert('getUserMedia() error: ' + e.name);
});

function gotStream(stream) {
  //#4
  //#8 cuando se une el otro
  console.log('Adding local stream.');
  localStream = stream;
  localVideo.srcObject = stream;
  sendMessage('got user media');
  if (isInitiator) {
    console.log("Es el que lo inicia");
    maybeStart();
  }
}

var constraints = {
  video: true
};

console.log('Getting user media with constraints', constraints);

if (location.hostname !== 'localhost') {
  console.log("Dentro del localhost");
  requestTurn(
    'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
  );
}

function maybeStart() {
  //#5
  
  console.log('>>>>>>> maybeStart() ', isStarted, localStream, isChannelReady);
  if (!isStarted && typeof localStream !== 'undefined' && isChannelReady) {
    //Luego de aceptar el video
    //#10
    console.log('>>>>>> creating peer connection');
    createPeerConnection();
    //Agrega el track que va a ser transmitido al otro peer
    //viejo ahora pon addTrack
    pc.addStream(localStream);
    isStarted = true;
    console.log('isInitiator', isInitiator);
    if (isInitiator) {
      doCall();
    }
  }
}

window.onbeforeunload = function() {
  console.log("No se que hace esto");
  sendMessage('bye');
};

/////////////////////////////////////////////////////////

function createPeerConnection() {
  //#9 ya luego de que el otro se conectara
  //Solo se crea cuando los 2 estan conectados
  try {
    pc = new RTCPeerConnection(null);
    //Se activa cada vez que se encuentra una nueva conexion peer
    pc.onicecandidate = handleIceCandidate;
    //Viejo mejor poner el ontrack
    //Esto se activa cada vez que se agrega un nuevo track al peer
    pc.onaddstream = handleRemoteStreamAdded;
    //viejo poner el onremovetrack
    //Se activa cada cvez que se remueve del stream
    pc.onremovestream = handleRemoteStreamRemoved;
    console.log('Created RTCPeerConnnection');
  } catch (e) {
    console.log('Failed to create PeerConnection, exception: ' + e.message);
    alert('Cannot create RTCPeerConnection object.');
    return;
  }
}

function handleIceCandidate(event) {
  console.log('icecandidate event: ', event);
  if (event.candidate) {
    sendMessage({
      type: 'candidate',
      label: event.candidate.sdpMLineIndex,
      id: event.candidate.sdpMid,
      candidate: event.candidate.candidate
    });
  } else {
    console.log('End of candidates.');
  }
}

//callback cuando se crea la oferta y hay error
function handleCreateOfferError(event) {
  console.log('createOffer() error: ', event);
}

//Funciona para crear la oferta
function doCall() {
  //#11
  console.log("-----Docall-----");
  console.log('Sending offer to peer');
  pc.createOffer(setLocalAndSendMessage, handleCreateOfferError);
}

//FUnciona paara crear la respuesta
function doAnswer() {
  console.log("-----Doanswer-----");
  console.log('Sending answer to peer.');
  pc.createAnswer().then(
    setLocalAndSendMessage,
    onCreateSessionDescriptionError
  );
}

function setLocalAndSendMessage(sessionDescription) {
  //#12 despues de crear la oferta
  pc.setLocalDescription(sessionDescription);
  console.log('setLocalAndSendMessage sending message', sessionDescription);
  sendMessage(sessionDescription);
}

function onCreateSessionDescriptionError(error) {
  trace('Failed to create session description: ' + error.toString());
}

function requestTurn(turnURL) {
  console.log("-----RequestTurn-----");
  var turnExists = false;
  for (var i in pcConfig.iceServers) {
    if (pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
      turnExists = true;
      turnReady = true;
      break;
    }
  }
  if (!turnExists) {
    console.log('Getting TURN server from ', turnURL);
    // No TURN server. Get one from computeengineondemand.appspot.com:
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function() {
      if (xhr.readyState === 4 && xhr.status === 200) {
        var turnServer = JSON.parse(xhr.responseText);
        console.log('Got TURN server: ', turnServer);
        pcConfig.iceServers.push({
          'urls': 'turn:' + turnServer.username + '@' + turnServer.turn,
          'credential': turnServer.password
        });
        turnReady = true;
      }
    };
    xhr.open('GET', turnURL, true);
    xhr.send();
  }
}

function handleRemoteStreamAdded(event) {
  console.log('Remote stream added.');
  console.log(event.stream);
  remoteStream = event.stream;
  remoteVideo.srcObject = remoteStream;
}

function handleRemoteStreamRemoved(event) {
  console.log('Remote stream removed. Event: ', event);
}

function hangup() {
  console.log('Hanging up.');
  stop();
  sendMessage('bye');
}

function handleRemoteHangup() {
  console.log('Session terminated.');
  stop();
  isInitiator = false;
}

function stop() {
  isStarted = false;
  pc.close();
  pc = null;
}
