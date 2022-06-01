// getting dom elements
var divSelectRoom = document.getElementById("selectRoom");
var divConferenceRoom = document.getElementById("conferenceRoom");
var btnGoBoth = document.getElementById("goBoth");
var btnGoAudioOnly = document.getElementById("goAudioOnly");
var localVideo = document.getElementById("localVideo");
var remoteVideo = document.getElementById("remoteVideo");
var btnMute = document.getElementById("mute");
var listAudioEvents = document.getElementById("audioEvents");

// variables
// var roomNumber = 'webrtc-audio-demo';
var roomNumber = prompt("Enter the Room ID:");
var localStream;
var remoteStream;
var rtcPeerConnection;
var iceServers = {
    'iceServers': [{
            'url': 'stun:stun.services.mozilla.com'
        },
        {
            'url': 'stun:stun.l.google.com:19302'
        }
    ]
}
var streamConstraints;
var isCaller;

// Let's do this
var socket = io();

// btnGoBoth.onclick = () => initiateCall(true);
// btnGoAudioOnly.onclick = () => initiateCall(false);
btnMute.onclick = toggleAudio;

function initiateCall(video) {
    streamConstraints = {
        video: video,
        audio: true
    }
    socket.emit('create or join', roomNumber);
    divSelectRoom.style = "display: none;";
    divConferenceRoom.style = "display: block;";
    document.getElementById("MainTitle").style.display = "none";
}

// message handlers
socket.on('created', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        addLocalStream(stream);
        isCaller = true;
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices');
    });
});

socket.on('joined', function (room) {
    navigator.mediaDevices.getUserMedia(streamConstraints).then(function (stream) {
        addLocalStream(stream);
        socket.emit('ready', roomNumber);
    }).catch(function (err) {
        console.log('An error ocurred when accessing media devices');
    });
});

socket.on('candidate', function (event) {
    var candidate = new RTCIceCandidate({
        sdpMLineIndex: event.label,
        candidate: event.candidate
    });
    rtcPeerConnection.addIceCandidate(candidate);
});

socket.on('ready', function () {
    if (isCaller) {
        createPeerConnection();
        let offerOptions = {
            offerToReceiveAudio: 1
        }
        rtcPeerConnection.createOffer(offerOptions)
            .then(desc => setLocalAndOffer(desc))
            .catch(e => console.log(e));
    }
});

socket.on('offer', function (event) {
    if (!isCaller) {
        createPeerConnection();
        rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
        rtcPeerConnection.createAnswer()
            .then(desc => setLocalAndAnswer(desc))
            .catch(e => console.log(e));
    }
});

socket.on('answer', function (event) {
    rtcPeerConnection.setRemoteDescription(new RTCSessionDescription(event));
})

socket.on('toggleAudio', function (event) {
    addAudioEvent(event);
});

// handler functions
function onIceCandidate(event) {
    if (event.candidate) {
        console.log('sending ice candidate');
        socket.emit('candidate', {
            type: 'candidate',
            label: event.candidate.sdpMLineIndex,
            id: event.candidate.sdpMid,
            candidate: event.candidate.candidate,
            room: roomNumber
        })
    }
}

function onAddStream(event) {
    remoteVideo.srcObject  = event.stream;
    remoteStream = event.stream;
    if (remoteStream.getAudioTracks().length > 0) {
        addAudioEvent('Remote user is sending Audio');
    } else {
        addAudioEvent('Remote user is not sending Audio');
    }
}

function setLocalAndOffer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('offer', {
        type: 'offer',
        sdp: sessionDescription,
        room: roomNumber
    });
}

function setLocalAndAnswer(sessionDescription) {
    rtcPeerConnection.setLocalDescription(sessionDescription);
    socket.emit('answer', {
        type: 'answer',
        sdp: sessionDescription,
        room: roomNumber
    });
}

//utility functions
function addLocalStream(stream) {
    localStream = stream;
    localVideo.srcObject = stream

    if (stream.getAudioTracks().length > 0) {
        btnMute.style = "display: block";
    }
}

function createPeerConnection() {
    rtcPeerConnection = new RTCPeerConnection(iceServers);
    rtcPeerConnection.onicecandidate = onIceCandidate;
    rtcPeerConnection.onaddstream = onAddStream;
    rtcPeerConnection.addStream(localStream);
}

function toggleAudio() {
    localStream.getAudioTracks()[0].enabled = !localStream.getAudioTracks()[0].enabled
    socket.emit('toggleAudio', {
        type: 'toggleAudio',
        room: roomNumber,
        message: localStream.getAudioTracks()[0].enabled ? "Remote user's audio is unmuted" : "Remote user's audio is muted"
    });
    btnMute.innerText = localStream.getAudioTracks()[0].enabled ? "Mute" : "Unmute";
    // (TODO): Make the green box on the video element change its color depending on the mute/unmute status of the respective speaker.
}

function toggleVideo(e) {
    localStream.getVideoTracks()[0].enabled = !localStream.getVideoTracks()[0].enabled
    socket.emit('toggleVideo', {
        type: 'toggleVideo',
        room: roomNumber,
        message: localStream.getVideoTracks()[0].enabled ? "Remote user's video is on" : "Remote user's video is off"
    });
    e.target.innerText = localStream.getVideoTracks()[0].enabled ? "Turn Off Video" : "Turn On Video";
    // (TODO): Make the green box on the video element change its color depending on the mute/unmute status of the respective speaker.
}
document.getElementById("turnOffVideo").onclick = toggleVideo;

function addAudioEvent(event) {
    var p = document.createElement("p");
    p.appendChild(document.createTextNode(event));
    listAudioEvents.appendChild(p);
}

function getRandomValueFromList(list) {
    return (Object.values(list)[Math.floor(Math.random() * Object.values(list).length)]);
}

const chatColors = {
    "Blue": "#0000ff",
    "Coral": "#FF7F50",
    "DodgerBlue": "#1E90FF",
    "SpringGreen": "#26D07C",
    "YellowGreen": "#D6E865",
    "Green": "#00FF00",
    "OrangeRed": "#FC4C02",
    "Red": "#FF0000",
    "GoldenRod": "#FFB81C",
    "HotPink": "#E31C79",
    "CadetBlue": "#5F9EA0",
    "SeaGreen": "#2E8B57",
    "Chocolate": "#84563C",
    "BlueViolet": "#9933CC",
    "FireBrick": "#993333"
}

//#region PARSING THE USERNAME PROVIDED BY THE USER
var username = "";
var localChatColor = "";
if (window.localStorage.getItem("username") == null) {
    username = prompt('What is your name?');
    if (username != undefined && username.toLowerCase() != "server" && username.length >= 2) {
        username = username.split(" ")[0];
        if (username.length > 16) {
            username = username.slice(0, 16);
        }
        window.localStorage.setItem("username", username);
    }
}
if (window.localStorage.getItem("username") != null) {
    username = window.localStorage.getItem("username");
    // appendMessage("Server", '<b>You joined</b>', getRandomValueFromList(chatColors));
    localChatColor = getRandomValueFromList(chatColors);
    // socket.emit('new-user', {"name": username, "color": userColor});
}
//#endregion

// (DONE): Implement chatting, based on the socket.io rooms.
var mainInput = document.getElementById("main-input");
var messageLog = document.getElementById("message-log");

mainInput.addEventListener('keydown', e => {
    console.log(123);
    if (e.code == "Enter") {
        sendButton();
    }
});

function sendButton() {
    console.log("message sent.");

    // (DONE)
    if (mainInput.innerHTML != "" && mainInput.innerText.length <= 280) {
        appendMessage(username, mainInput.innerHTML, localChatColor);
        socket.emit('send-chat-message', {username: username, message: mainInput.innerHTML, color: localChatColor});
    }
    setTimeout(()=>{
        mainInput.innerHTML = "";
    }, 0);
}

socket.on('chat-message', data => {
    appendMessage(data.username, data.message, data.color);
});

// (DONE)
function appendMessage(name, messageHTML, nameColor) {
    var el = document.createElement("div");
    el.innerHTML = ("<span style='font-size: 10px; vertical-align: center;'>" + (new Date().toLocaleTimeString()) + "</span>")
    el.innerHTML += (` <span style='color: ${nameColor};'><b>${name}</b></span>: `);
    // el.innerHTML += (`<span style='color: red;'><b>${name}</b></span>: `);
    el.innerHTML += messageHTML;
    messageLog.appendChild(el);
    // messageLog.scrollTop = messageLog.scrollHeight - messageLog.clientHeight; // For static scrolling.

    // For smooth scrolling
    $('#message-log').animate({
        scrollTop: messageLog.scrollHeight - messageLog.clientHeight
    }, 100);
}

// (DONE): Allow users to turn off their webcam.
initiateCall(true);

// (TODO): Implement screen-sharing.