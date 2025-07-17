
// js/features/sync.js

let peerConnection = null;
let dataChannel = null;
let onDataReceivedCallback = null;
let onConnectionStatusChangeCallback = null;

const configuration = {
    iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
    ]
};

function createPeerConnection() {
    peerConnection = new RTCPeerConnection(configuration);

    peerConnection.onicecandidate = (event) => {
        if (event.candidate) {
            // In a real-world application with a proper signaling server,
            // you would send this ICE candidate to the other peer.
        }
    };

    peerConnection.onconnectionstatechange = () => {
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback(peerConnection.connectionState);
        }
    };

    peerConnection.ondatachannel = (event) => {
        dataChannel = event.channel;
        setupDataChannelListeners();
    };

    return peerConnection;
}

function setupDataChannelListeners() {
    dataChannel.onopen = () => {
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback('connected');
        }
    };
    dataChannel.onmessage = (event) => {
        if (onDataReceivedCallback) {
            onDataReceivedCallback(event.data);
        }
    };
    dataChannel.onclose = () => {
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback('disconnected');
        }
    };
    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
    };
}

async function createOffer() {
    peerConnection = createPeerConnection();
    dataChannel = peerConnection.createDataChannel('syncChannel');
    setupDataChannelListeners();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);

    navigator.serviceWorker.controller.postMessage({ type: 'SET_OFFER', offer: offer.sdp });

    // Poll for an answer
    const pollInterval = setInterval(async () => {
        const response = await fetch('/webrtc-answer');
        const data = await response.json();
        if (data.answer) {
            clearInterval(pollInterval);
            await setRemoteAnswer(data.answer);
        }
    }, 2000);
}

async function checkForOffer() {
    const response = await fetch('/webrtc-offer');
    const data = await response.json();
    return !!data.offer;
}

async function discoverAndAnswer() {
    const response = await fetch('/webrtc-offer');
    const data = await response.json();
    const offerSdp = data.offer;

    peerConnection = createPeerConnection();
    const remoteOffer = new RTCSessionDescription({ type: 'offer', sdp: offerSdp });
    await peerConnection.setRemoteDescription(remoteOffer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);

    await fetch('/webrtc-answer', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ answer: answer.sdp })
    });
}

async function setRemoteAnswer(answerSdp) {
    const remoteAnswer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
    await peerConnection.setRemoteDescription(remoteAnswer);
}

function sendData(data) {
    if (dataChannel && dataChannel.readyState === 'open') {
        dataChannel.send(data);
        return true;
    } else {
        console.warn('Data channel not open. Cannot send data.');
        return false;
    }
}

function closeConnection() {
    if (dataChannel) {
        dataChannel.close();
        dataChannel = null;
    }
    if (peerConnection) {
        peerConnection.close();
        peerConnection = null;
    }
    if (onConnectionStatusChangeCallback) {
        onConnectionStatusChangeCallback('disconnected');
    }
}

function setOnDataReceived(callback) {
    onDataReceivedCallback = callback;
}

function setOnConnectionStatusChange(callback) {
    onConnectionStatusChangeCallback = callback;
}

window.sync = {
    createOffer,
    checkForOffer,
    discoverAndAnswer,
    sendData,
    closeConnection,
    setOnDataReceived,
    setOnConnectionStatusChange,
    get isConnected() { return dataChannel && dataChannel.readyState === 'open'; }
};