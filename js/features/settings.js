document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const apiKeyStatus = document.getElementById('api-key-status');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const syncStatusContainer = document.getElementById('sync-status-container');
    const connectNewDeviceBtn = document.getElementById('connect-new-device-btn');
    const disconnectDeviceBtn = document.getElementById('disconnect-device-btn');

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

        const datamatrixDisplay = document.createElement('div');
        datamatrixDisplay.id = 'datamatrix-display';
        modalContent.appendChild(datamatrixDisplay);

        const showOffer = async () => {
            statusMessage.textContent = 'Scan this code with your other device.';
            try {
                const offerSdp = await window.sync.createOffer();
                window.datamatrix.generate(datamatrixDisplay, offerSdp);
                await waitForAnswer();
            } catch (err) {
                statusMessage.textContent = 'Error creating offer. Please try again.';
                console.error(err);
            }
        };

        const scanOffer = async () => {
            statusMessage.textContent = 'Point your camera at the code on the other device.';
            try {
                const offerSdp = await window.datamatrix.scan();
                if (offerSdp) {
                    statusMessage.textContent = 'Code scanned! Creating reply...';
                    const answerSdp = await window.sync.createAnswer(offerSdp);
                    datamatrixDisplay.innerHTML = '';
                    statusMessage.textContent = 'Scan this reply code with your first device.';
                    window.datamatrix.generate(datamatrixDisplay, answerSdp);
                } else {
                    statusMessage.textContent = 'Scan cancelled. Please try again.';
                }
            } catch (err) {
                statusMessage.textContent = 'Error scanning offer. Please try again.';
                console.error(err);
            }
        };

        const waitForAnswer = async () => {
            statusMessage.textContent = 'Waiting for the other device to scan the reply...';
            // In a real implementation, the answer would be sent back over the established data channel.
            // For this simulation, we will rely on the user scanning the reply code.
        };

        const initialChoice = () => {
            statusMessage.textContent = 'How are you connecting?';
            const generateOfferBtn = document.createElement('button');
            generateOfferBtn.className = 'button-primary';
            generateOfferBtn.textContent = 'Show connection code';
            generateOfferBtn.onclick = showOffer;
            modalContent.appendChild(generateOfferBtn);

            const scanOfferBtn = document.createElement('button');
            scanOfferBtn.className = 'button-primary';
            scanOfferBtn.textContent = 'Scan connection code';
            scanOfferBtn.onclick = scanOffer;
            modalContent.appendChild(scanOfferBtn);
        };

        window.sync.setOnConnectionStatusChange((status) => {
            if (status === 'connected') {
                syncStatusContainer.textContent = 'Connected!';
                connectNewDeviceBtn.style.display = 'none';
                disconnectDeviceBtn.style.display = 'block';
                if (modalOverlay) {
                    document.body.removeChild(modalOverlay);
                    document.body.classList.remove('modal-open');
                }
            } else if (status === 'disconnected') {
                syncStatusContainer.textContent = 'Disconnected.';
                connectNewDeviceBtn.style.display = 'block';
                disconnectDeviceBtn.style.display = 'none';
            } else {
                syncStatusContainer.textContent = `Status: ${status}`;
            }
        });

        initialChoice();
    }

    function toggleTheme() {
        const currentTheme = localStorage.getItem('theme') || 'dark';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        localStorage.setItem('theme', newTheme);
        window.applyTheme(newTheme);
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

    window.applyTheme(localStorage.getItem('theme') || 'dark');

    exportBtn.addEventListener('click', exportData);
    importBtn.addEventListener('click', triggerImport);
    importFile.addEventListener('change', importData);
    saveKeyBtn.addEventListener('click', saveApiKey);
    themeToggleBtn.addEventListener('click', toggleTheme);
    connectNewDeviceBtn.addEventListener('click', handleConnectNewDevice);
    disconnectDeviceBtn.addEventListener('click', () => window.sync.closeConnection());

    loadApiKey();
});