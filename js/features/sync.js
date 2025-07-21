class SignalingChannel {
    constructor(peerId, onMessage) {
        this.peerId = peerId;
        // Using a public signaling server
        this.ws = new WebSocket(`wss://p2p-beta.vercel.app/${peerId}`);
        this.ws.onmessage = onMessage;
        this.ws.onopen = () => console.log('Signaling channel connected.');
        this.ws.onerror = (err) => console.error('Signaling channel error:', err);
    }

    send(to, message) {
        const payload = { to, from: this.peerId, message };
        this.ws.send(JSON.stringify(payload));
    }
}

class WebRTCSync {
    constructor(peerId, onDataReceived) {
        this.peerId = peerId;
        this.remotePeerId = null;
        this.onDataReceived = onDataReceived;
        this.signalingChannel = new SignalingChannel(this.peerId, this.handleSignalingMessage.bind(this));
        this.peerConnection = null;
    }

    async connect(remotePeerId) {
        this.remotePeerId = remotePeerId;
        this.peerConnection = new RTCPeerConnection({
            iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
        });

        this.peerConnection.onicecandidate = event => {
            if (event.candidate) {
                this.signalingChannel.send(this.remotePeerId, { type: 'candidate', candidate: event.candidate });
            }
        };

        this.peerConnection.ondatachannel = event => {
            this.dataChannel = event.channel;
            this.setupDataChannel();
        };
    }

    async start() {
        if (!this.peerConnection) {
            console.error("Peer connection not initialized. Call connect() first.");
            return;
        }
        this.dataChannel = this.peerConnection.createDataChannel('sync');
        this.setupDataChannel();

        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        this.signalingChannel.send(this.remotePeerId, { type: 'offer', offer });
    }

    async handleSignalingMessage(event) {
        const data = JSON.parse(event.data);
        const message = data.message;
        const from = data.from;

        if (!this.peerConnection) {
            await this.connect(from);
        }

        if (message.type === 'offer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.offer));
            const answer = await this.peerConnection.createAnswer();
            await this.peerConnection.setLocalDescription(answer);
            this.signalingChannel.send(from, { type: 'answer', answer });
        } else if (message.type === 'answer') {
            await this.peerConnection.setRemoteDescription(new RTCSessionDescription(message.answer));
        } else if (message.type === 'candidate') {
            if (this.peerConnection.remoteDescription) {
                await this.peerConnection.addIceCandidate(new RTCIceCandidate(message.candidate));
            }
        }
    }

    send(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        } else {
            console.error('Data channel is not open.');
        }
    }

    setupDataChannel() {
        this.dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.onDataReceived(data);
        };
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            alert('Connection established!');
        };
        this.dataChannel.onclose = () => console.log('Data channel closed');
    }
}

window.sync = {
    WebRTCSync
};