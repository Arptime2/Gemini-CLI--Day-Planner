
// js/features/sync.js

let peerConnection = null;
let dataChannel = null;
let isInitiator = false;
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
            // Send the ICE candidate to the other peer (via QR code or other signaling)
            console.log('New ICE candidate:', event.candidate);
            // In a real app, this would be sent over a signaling server.
            // For this project, we'll display it for manual transfer.
        }
    };

    peerConnection.onconnectionstatechange = () => {
        console.log('Connection state change:', peerConnection.connectionState);
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
        console.log('Data channel is open!');
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback('connected');
        }
    };
    dataChannel.onmessage = (event) => {
        console.log('Data channel message:', event.data);
        if (onDataReceivedCallback) {
            onDataReceivedCallback(event.data);
        }
    };
    dataChannel.onclose = () => {
        console.log('Data channel closed.');
        if (onConnectionStatusChangeCallback) {
            onConnectionStatusChangeCallback('disconnected');
        }
    };
    dataChannel.onerror = (error) => {
        console.error('Data channel error:', error);
    };
}

async function createOffer() {
    isInitiator = true;
    peerConnection = createPeerConnection();
    dataChannel = peerConnection.createDataChannel('syncChannel');
    setupDataChannelListeners();

    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    return offer.sdp;
}

async function createAnswer(offerSdp) {
    isInitiator = false;
    peerConnection = createPeerConnection();

    const remoteOffer = new RTCSessionDescription({ type: 'offer', sdp: offerSdp });
    await peerConnection.setRemoteDescription(remoteOffer);

    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    return answer.sdp;
}

async function setRemoteAnswer(answerSdp) {
    const remoteAnswer = new RTCSessionDescription({ type: 'answer', sdp: answerSdp });
    await peerConnection.setRemoteDescription(remoteAnswer);
}

async function addIceCandidate(candidate) {
    try {
        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
    } catch (e) {
        console.error('Error adding received ICE candidate:', e);
    }
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
    isInitiator = false;
    console.log('WebRTC connection closed.');
}

function setOnDataReceived(callback) {
    onDataReceivedCallback = callback;
}

function setOnConnectionStatusChange(callback) {
    onConnectionStatusChangeCallback = callback;
}

window.sync = {
    createOffer,
    createAnswer,
    setRemoteAnswer,
    addIceCandidate,
    sendData,
    closeConnection,
    setOnDataReceived,
    setOnConnectionStatusChange,
    get isConnected() { return dataChannel && dataChannel.readyState === 'open'; }
};
