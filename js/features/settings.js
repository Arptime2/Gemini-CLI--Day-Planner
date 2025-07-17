document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const apiKeyStatus = document.getElementById('api-key-status');
    
    const themeToggleBtn = document.getElementById('theme-toggle-btn');

    // New elements for Device Sync
    const peerListContainer = document.getElementById('peer-list-container');
    const connectNewDeviceBtn = document.getElementById('connect-new-device-btn');
    const disconnectDeviceBtn = document.getElementById('disconnect-device-btn');

    let rememberedPeers = [];

    function loadRememberedPeers() {
        const storedPeers = localStorage.getItem('momentum_remembered_peers');
        if (storedPeers) {
            rememberedPeers = JSON.parse(storedPeers);
        }
    }

    function saveRememberedPeers() {
        localStorage.setItem('momentum_remembered_peers', JSON.stringify(rememberedPeers));
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        window.applyTheme(newTheme); // Call the global function
    }

    async function exportData() {
        const tasks = await window.db.getAllItems('tasks');
        const habits = await window.db.getAllItems('habits');
        const notes = await window.db.getAllItems('notes');
        const data = { tasks, habits, notes };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `zenith-backup-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    function triggerImport() {
        importFile.click();
    }

    function importData(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (confirm('Are you sure you want to import this data? This may overwrite existing data.')) {
                    if (data.tasks) {
                        for (const item of data.tasks) await window.db.updateItem('tasks', item);
                    }
                    if (data.habits) {
                        for (const item of data.habits) await window.db.updateItem('habits', item);
                    }
                    if (data.notes) {
                        for (const item of data.notes) await window.db.updateItem('notes', item);
                    }
                    alert('Data imported successfully! The app will now reload.');
                    location.reload();
                }
            } catch (error) {
                alert('Invalid file format.');
                console.error('Error importing data:', error);
            }
        };
        reader.readAsText(file);
    }

    function saveApiKey() {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem('groq_api_key', key);
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'API Key is set';
            showStatusMessage('✅ Saved!');
        }
    }

    function showStatusMessage(message) {
        apiKeyStatus.textContent = message;
        apiKeyStatus.classList.add('visible');
        setTimeout(() => {
            apiKeyStatus.classList.remove('visible');
        }, 2000);
    }

    function loadApiKey() {
        const key = localStorage.getItem('groq_api_key');
        if (key) {
            apiKeyInput.placeholder = 'API Key is set';
        }
    }

    function renderPeerList() {
        peerListContainer.innerHTML = '';
        if (rememberedPeers.length === 0) {
            peerListContainer.innerHTML = '<p>No remembered devices. Connect a new one!</p>';
            return;
        }

        rememberedPeers.forEach(peer => {
            const peerEl = document.createElement('div');
            peerEl.className = 'peer-item';
            peerEl.dataset.peerId = peer.id;
            peerEl.innerHTML = `
                <span class="peer-name">${peer.name}</span>
                <div class="peer-actions">
                    <button class="button-primary connect-peer-btn" data-peer-id="${peer.id}">Connect</button>
                    <button class="button-primary rename-peer-btn" data-peer-id="${peer.id}">Rename</button>
                </div>
            `;
            peerListContainer.appendChild(peerEl);
        });
    }

    async function handleConnectNewDevice() {
        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        document.body.appendChild(modalOverlay);
        document.body.classList.add('modal-open');

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content';
        modalOverlay.appendChild(modalContent);

        const closeBtn = document.createElement('button');
        closeBtn.className = 'modal-close-btn';
        closeBtn.textContent = '❌';
        closeBtn.onclick = () => {
            document.body.removeChild(modalOverlay);
            document.body.classList.remove('modal-open');
            window.sync.closeConnection();
        };
        modalContent.appendChild(closeBtn);

        const statusMessage = document.createElement('p');
        statusMessage.id = 'sync-status-message';
        modalContent.appendChild(statusMessage);

        const qrCodeDisplay = document.createElement('div');
        qrCodeDisplay.id = 'qr-code-display';
        qrCodeDisplay.style.textAlign = 'center';
        qrCodeDisplay.style.margin = '1rem 0';
        modalContent.appendChild(qrCodeDisplay);

        const showChoice = () => {
            statusMessage.textContent = 'Is this device sending or receiving the connection?';
            const sendingBtn = document.createElement('button');
            sendingBtn.className = 'button-primary';
            sendingBtn.textContent = 'Sending';
            sendingBtn.onclick = () => generateOffer();
            modalContent.appendChild(sendingBtn);

            const receivingBtn = document.createElement('button');
            receivingBtn.className = 'button-primary';
            receivingBtn.textContent = 'Receiving';
            receivingBtn.onclick = () => scanOffer();
            modalContent.appendChild(receivingBtn);
        };

        const generateOffer = async () => {
            modalContent.innerHTML = ''; // Clear content
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(statusMessage);
            modalContent.appendChild(qrCodeDisplay);
            statusMessage.textContent = 'Generating connection offer...';
            try {
                const offerSdp = await window.sync.createOffer();
                const qrSvg = window.qrcode.generateQRCodeSVG(offerSdp);
                qrCodeDisplay.innerHTML = qrSvg;
                statusMessage.textContent = 'Scan this QR code on the other device.';
                await waitForAnswer();
            } catch (error) {
                statusMessage.textContent = 'Error generating offer. Please try again.';
                console.error('Error creating offer:', error);
            }
        };

        const scanOffer = async () => {
            modalContent.innerHTML = ''; // Clear content
            modalContent.appendChild(closeBtn);
            modalContent.appendChild(statusMessage);
            modalContent.appendChild(qrCodeDisplay);
            statusMessage.textContent = 'Scanning for a connection offer...';
            try {
                const offerSdp = await window.qrcode.scanQRCode();
                if (offerSdp) {
                    statusMessage.textContent = 'Offer received. Generating answer...';
                    const answerSdp = await window.sync.createAnswer(offerSdp);
                    const qrSvg = window.qrcode.generateQRCodeSVG(answerSdp);
                    qrCodeDisplay.innerHTML = qrSvg;
                    statusMessage.textContent = 'Scan this QR code on the first device to complete the connection.';
                } else {
                    statusMessage.textContent = 'No offer received. Please try again.';
                }
            } catch (error) {
                statusMessage.textContent = 'Error scanning offer. Please try again.';
                console.error('Error scanning offer:', error);
            }
        };

        const waitForAnswer = async () => {
            statusMessage.textContent = 'Waiting for an answer...';
            try {
                const answerSdp = await window.qrcode.scanQRCode();
                if (answerSdp) {
                    statusMessage.textContent = 'Answer received. Establishing connection...';
                    await window.sync.setRemoteAnswer(answerSdp);
                    statusMessage.textContent = 'Connection established!';
                    promptAndSavePeer();
                } else {
                    statusMessage.textContent = 'No answer received. Please try again.';
                }
            } catch (error) {
                statusMessage.textContent = 'Error receiving answer. Please try again.';
                console.error('Error receiving answer:', error);
            }
        };

        window.sync.setOnConnectionStatusChange((status) => {
            if (status === 'connected') {
                statusMessage.textContent = 'Connected!';
                disconnectDeviceBtn.style.display = 'block';
                promptAndSavePeer();
            } else if (status === 'disconnected') {
                statusMessage.textContent = 'Disconnected.';
                disconnectDeviceBtn.style.display = 'none';
            } else {
                statusMessage.textContent = `Connection status: ${status}`;
            }
        });

        showChoice();
    }

    function handleDisconnectDevice() {
        window.sync.closeConnection();
        alert('Disconnected.');
    }

    function handleRenamePeer(peerId) {
        const peer = rememberedPeers.find(p => p.id === peerId);
        if (peer) {
            const newName = prompt(`Rename ${peer.name}:`, peer.name);
            if (newName && newName.trim() !== '') {
                peer.name = newName.trim();
                saveRememberedPeers();
                renderPeerList();
            }
        }
    }

    function promptAndSavePeer() {
        const peerName = prompt('Connection successful! Give this device a name:', 'New Device');
        if (peerName && peerName.trim() !== '') {
            const newPeer = {
                id: Date.now().toString(), // Simple unique ID
                name: peerName.trim()
            };
            rememberedPeers.push(newPeer);
            saveRememberedPeers();
            renderPeerList();
        }
    }

    

    // Initial theme load
    window.applyTheme(localStorage.getItem('theme') || 'dark');

    // Event Listeners
    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', triggerImport);
    importFile.addEventListener('change', importData);
    saveKeyBtn.addEventListener('click', saveApiKey);
    themeToggleBtn.addEventListener('click', toggleTheme);

    connectNewDeviceBtn.addEventListener('click', handleConnectNewDevice);
    disconnectDeviceBtn.addEventListener('click', handleDisconnectDevice);

    peerListContainer.addEventListener('click', (event) => {
        const target = event.target;
        if (target.classList.contains('connect-peer-btn')) {
            handleConnectNewDevice();
        } else if (target.classList.contains('rename-peer-btn')) {
            const peerId = target.dataset.peerId;
            handleRenamePeer(peerId);
        }
    });

    loadApiKey();
    loadRememberedPeers();
    renderPeerList();
});