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
    localStorage.setItem('webrtc_offer', offer.sdp); // Save offer for discovery
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
    localStorage.removeItem('webrtc_offer'); // Clean up
    localStorage.removeItem('webrtc_answer'); // Clean up
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

async function discoverAndAnswer() {
    // In a real-world scenario, this would involve a discovery mechanism
    // like mDNS or a local network broadcast to find the offer.
    // For this simulation, we'll assume the offer is available globally.
    const offerSdp = await window.sync.scanForOffer();
    const answerSdp = await createAnswer(offerSdp);
    await window.sync.sendAnswer(answerSdp);
}

// Placeholder for a real discovery mechanism
async function scanForOffer() {
    return new Promise(resolve => {
        // This would be replaced with actual network discovery
        setTimeout(() => {
            resolve(localStorage.getItem('webrtc_offer'));
        }, 1000);
    });
}

// Placeholder for sending the answer
async function sendAnswer(answerSdp) {
    // This would be replaced with sending the answer over the discovered channel
    localStorage.setItem('webrtc_answer', answerSdp);
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
    discoverAndAnswer,
    scanForOffer, // For simulation
    sendAnswer, // For simulation
    get isConnected() { return dataChannel && dataChannel.readyState === 'open'; }
};