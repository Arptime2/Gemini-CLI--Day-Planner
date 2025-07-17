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
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close-btn">❌</button>
                <h2>Connect New Device</h2>
                <p id="sync-status-message">Choose an option:</p>
                <div id="qr-code-display" style="text-align: center; margin: 1rem 0;"></div>
                <button id="generate-offer-btn" class="button-primary">Generate Offer</button>
                <button id="scan-offer-btn" class="button-primary">Scan Offer</button>
                <button id="scan-answer-qr-btn" class="button-primary" style="display: none;">Scan Answer QR</button>
                <button id="copy-offer-btn" class="button-primary">Copy Offer</button>
                <button id="push-data-btn" class="button-primary" style="display: none;">Push Data</button>
                <button id="pull-data-btn" class="button-primary" style="display: none;">Pull Data</button>
            </div>
                <button id="copy-answer-btn" class="button-primary" style="display: none;">Copy Answer</button>
                <button id="push-data-btn" class="button-primary" style="display: none;">Push Data</button>
                <button id="pull-data-btn" class="button-primary" style="display: none;">Pull Data</button>
            </div>
        `;
        document.body.appendChild(modalOverlay);
        document.body.classList.add('modal-open');

        const qrCodeDisplay = document.getElementById('qr-code-display');
        const syncStatusMessage = document.getElementById('sync-status-message');
        const generateOfferBtn = document.getElementById('generate-offer-btn');
        const scanOfferBtn = document.getElementById('scan-offer-btn');
        const scanAnswerQrBtn = document.getElementById('scan-answer-qr-btn');
        const copyOfferBtn = document.getElementById('copy-offer-btn');
        const copyAnswerBtn = document.getElementById('copy-answer-btn');
        const pushDataBtn = document.getElementById('push-data-btn');
        const pullDataBtn = document.getElementById('pull-data-btn');

        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            document.body.classList.remove('modal-open');
            window.sync.closeConnection();
        });

        generateOfferBtn.onclick = async () => {
            syncStatusMessage.textContent = 'Generating offer...';
            generateOfferBtn.style.display = 'none';
            scanOfferBtn.style.display = 'none';
            try {
                const offerSdp = await window.sync.createOffer();
                const qrSvg = window.qrcode.generateQRCodeSVG(offerSdp);
                qrCodeDisplay.innerHTML = qrSvg;
                syncStatusMessage.textContent = 'Scan this QR code on the other device.';
                scanAnswerQrBtn.style.display = 'block';
                copyOfferBtn.style.display = 'block';
                copyOfferBtn.onclick = () => {
                    navigator.clipboard.writeText(offerSdp).then(() => {
                        alert('Offer copied to clipboard!');
                    }).catch(err => {
                        console.error('Could not copy text: ', err);
                    });
                };

                scanAnswerQrBtn.onclick = async () => {
                    syncStatusMessage.textContent = 'Scanning for answer...';
                    qrCodeDisplay.innerHTML = ''; // Clear QR code display
                    const answerSdp = await window.qrcode.scanQRCode();
                    if (answerSdp) {
                        try {
                            await window.sync.setRemoteAnswer(answerSdp);
                            syncStatusMessage.textContent = 'Connection established!';
                            scanAnswerQrBtn.style.display = 'none';
                            copyOfferBtn.style.display = 'none';
                            promptAndSavePeer();
                        } catch (error) {
                            syncStatusMessage.textContent = 'Failed to establish connection. Try again.';
                            console.error('Error setting remote answer:', error);
                        }
                    } else {
                        syncStatusMessage.textContent = 'No answer received.';
                    }
                };

                window.sync.setOnConnectionStatusChange((status) => {
                    if (status === 'connected') {
                        syncStatusMessage.textContent = 'Connected!';
                        scanAnswerQrBtn.style.display = 'none';
                        copyOfferBtn.style.display = 'none';
                        pushDataBtn.style.display = 'block';
                        pullDataBtn.style.display = 'block';
                        promptAndSavePeer();
                    } else if (status === 'disconnected') {
                        syncStatusMessage.textContent = 'Disconnected.';
                        pushDataBtn.style.display = 'none';
                        pullDataBtn.style.display = 'none';
                    } else {
                        syncStatusMessage.textContent = `Connection status: ${status}`;
                    }
                });

            } catch (error) {
                syncStatusMessage.textContent = 'Error generating offer.';
                console.error('Error creating offer:', error);
            }
        };

        scanOfferBtn.onclick = async () => {
            syncStatusMessage.textContent = 'Scanning for offer...';
            generateOfferBtn.style.display = 'none';
            scanOfferBtn.style.display = 'none';
            qrCodeDisplay.innerHTML = ''; // Clear QR code display
            const offerSdp = await window.qrcode.scanQRCode();
            if (offerSdp) {
                try {
                    const answerSdp = await window.sync.createAnswer(offerSdp);
                    const qrSvg = window.qrcode.generateQRCodeSVG(answerSdp);
                    qrCodeDisplay.innerHTML = qrSvg;
                    syncStatusMessage.textContent = 'Scan this QR code on the other device.';
                    copyAnswerBtn.style.display = 'block';
                    copyAnswerBtn.onclick = () => {
                        navigator.clipboard.writeText(answerSdp).then(() => {
                            alert('Answer copied to clipboard!');
                        }).catch(err => {
                            console.error('Could not copy text: ', err);
                        });
                    };

                    window.sync.setOnConnectionStatusChange((status) => {
                        if (status === 'connected') {
                            syncStatusMessage.textContent = 'Connected!';
                            copyAnswerBtn.style.display = 'none';
                            pushDataBtn.style.display = 'block';
                            pullDataBtn.style.display = 'block';
                            promptAndSavePeer();
                        } else if (status === 'disconnected') {
                            syncStatusMessage.textContent = 'Disconnected.';
                            pushDataBtn.style.display = 'none';
                            pullDataBtn.style.display = 'none';
                        } else {
                            syncStatusMessage.textContent = `Connection status: ${status}`;
                        }
                    });

                } catch (error) {
                    syncStatusMessage.textContent = 'Failed to create answer. Try again.';
                    console.error('Error creating answer:', error);
                }
            } else {
                syncStatusMessage.textContent = 'No offer received.';
            }
        };
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

    async function connectToRememberedPeer(peerId) {
        const peer = rememberedPeers.find(p => p.id === peerId);
        if (!peer) return;

        const modalOverlay = document.createElement('div');
        modalOverlay.className = 'modal-overlay';
        modalOverlay.innerHTML = `
            <div class="modal-content">
                <button class="modal-close-btn">❌</button>
                <h2>Connect to ${peer.name}</h2>
                <p id="sync-status-message">Generating offer...</p>
                <div id="qr-code-display" style="text-align: center; margin: 1rem 0;"></div>
                <button id="scan-answer-qr-btn" class="button-primary" style="display: none;">Scan Answer QR</button>
                <button id="copy-offer-btn" class="button-primary">Copy Offer</button>
                <button id="push-data-btn" class="button-primary" style="display: none;">Push Data</button>
                <button id="pull-data-btn" class="button-primary" style="display: none;">Pull Data</button>
            </div>
        `;
        document.body.appendChild(modalOverlay);
        document.body.classList.add('modal-open');

        const qrCodeDisplay = document.getElementById('qr-code-display');
        const syncStatusMessage = document.getElementById('sync-status-message');
        const scanAnswerQrBtn = document.getElementById('scan-answer-qr-btn');
        const copyOfferBtn = document.getElementById('copy-offer-btn');
        const pushDataBtn = document.getElementById('push-data-btn');
        const pullDataBtn = document.getElementById('pull-data-btn');

        modalOverlay.querySelector('.modal-close-btn').addEventListener('click', () => {
            document.body.removeChild(modalOverlay);
            document.body.classList.remove('modal-open');
            window.sync.closeConnection();
        });

        try {
            const offerSdp = await window.sync.createOffer();
            const qrSvg = window.qrcode.generateQRCodeSVG(offerSdp);
            qrCodeDisplay.innerHTML = qrSvg;
            syncStatusMessage.textContent = 'Scan this QR code on the other device.';
            scanAnswerQrBtn.style.display = 'block';
            copyOfferBtn.onclick = () => {
                navigator.clipboard.writeText(offerSdp).then(() => {
                    alert('Offer copied to clipboard!');
                }).catch(err => {
                    console.error('Could not copy text: ', err);
                });
            };

            scanAnswerQrBtn.onclick = async () => {
                syncStatusMessage.textContent = 'Scanning for answer...';
                qrCodeDisplay.innerHTML = ''; // Clear QR code display
                const answerSdp = await window.qrcode.scanQRCode();
                if (answerSdp) {
                    try {
                        await window.sync.setRemoteAnswer(answerSdp);
                        syncStatusMessage.textContent = 'Connection established!';
                        scanAnswerQrBtn.style.display = 'none';
                        copyOfferBtn.style.display = 'none';
                        pushDataBtn.style.display = 'block';
                        pullDataBtn.style.display = 'block';
                    } catch (error) {
                        syncStatusMessage.textContent = 'Failed to establish connection. Try again.';
                        console.error('Error setting remote answer:', error);
                    }
                } else {
                    syncStatusMessage.textContent = 'No answer received.';
                }
            };

            window.sync.setOnConnectionStatusChange((status) => {
                if (status === 'connected') {
                    syncStatusMessage.textContent = 'Connected!';
                    scanAnswerQrBtn.style.display = 'none';
                    copyOfferBtn.style.display = 'none';
                    pushDataBtn.style.display = 'block';
                    pullDataBtn.style.display = 'block';
                } else if (status === 'disconnected') {
                    syncStatusMessage.textContent = 'Disconnected.';
                    pushDataBtn.style.display = 'none';
                    pullDataBtn.style.display = 'none';
                } else {
                    syncStatusMessage.textContent = `Connection status: ${status}`;
                }
            });

        } catch (error) {
            syncStatusMessage.textContent = 'Error generating offer.';
            console.error('Error creating offer:', error);
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
            const peerId = target.dataset.peerId;
            connectToRememberedPeer(peerId);
        } else if (target.classList.contains('rename-peer-btn')) {
            const peerId = target.dataset.peerId;
            handleRenamePeer(peerId);
        }
    });

    loadApiKey();
    loadRememberedPeers();
    renderPeerList();
});