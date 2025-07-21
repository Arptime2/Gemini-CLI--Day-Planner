class WebRTCSync {
    constructor(onDataReceived) {
        this.peerConnection = new RTCPeerConnection({
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' },
                {
                    urls: 'turn:openrelay.metered.ca:80',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                },
                {
                    urls: 'turn:openrelay.metered.ca:443',
                    username: 'openrelayproject',
                    credential: 'openrelayproject'
                }
            ]
        });
        this.dataChannel = null;
        this.onDataReceived = onDataReceived;
        this.peerConnection.ondatachannel = this.receiveDataChannel.bind(this);
    }

    async createOffer() {
        this.dataChannel = this.peerConnection.createDataChannel('sync');
        this.setupDataChannel();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);
        return offer;
    }

    async createAnswer(offer) {
        await this.peerConnection.setRemoteDescription(offer);
        const answer = await this.peerConnection.createAnswer();
        await this.peerConnection.setLocalDescription(answer);
        return answer;
    }

    async setAnswer(answer) {
        await this.peerConnection.setRemoteDescription(answer);
    }

    send(data) {
        if (this.dataChannel && this.dataChannel.readyState === 'open') {
            this.dataChannel.send(JSON.stringify(data));
        }
    }

    receiveDataChannel(event) {
        this.dataChannel = event.channel;
        this.setupDataChannel();
    }

    setupDataChannel() {
        this.dataChannel.onmessage = (event) => {
            const data = JSON.parse(event.data);
            this.onDataReceived(data);
        };
        this.dataChannel.onopen = () => {
            console.log('Data channel opened');
            alert('Connection established! You can now sync.');
        }
        this.dataChannel.onclose = () => console.log('Data channel closed');
    }
}

window.sync = {
    WebRTCSync
};