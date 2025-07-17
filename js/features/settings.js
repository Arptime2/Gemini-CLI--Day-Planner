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
        syncStatusContainer.textContent = 'Broadcasting connection signal...';
        try {
            await window.sync.createOffer();
            syncStatusContainer.textContent = 'Waiting for another device to connect...';
        } catch (err) {
            syncStatusContainer.textContent = 'Error starting connection. Please try again.';
            console.error(err);
        }
    }

    async function autoConnect() {
        try {
            const offerExists = await window.sync.checkForOffer();
            if (offerExists) {
                syncStatusContainer.textContent = 'Found a device! Connecting...';
                await window.sync.discoverAndAnswer();
            }
        } catch (err) {
            // No offer found, or an error occurred. Silently ignore.
        }
    }

    window.sync.setOnConnectionStatusChange((status) => {
        switch (status) {
            case 'connected':
                syncStatusContainer.textContent = 'Connected!';
                connectNewDeviceBtn.style.display = 'none';
                disconnectDeviceBtn.style.display = 'block';
                break;
            case 'disconnected':
                syncStatusContainer.textContent = 'Disconnected.';
                connectNewDeviceBtn.style.display = 'block';
                disconnectDeviceBtn.style.display = 'none';
                break;
            default:
                syncStatusContainer.textContent = `Status: ${status}`;
                break;
        }
    });

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
    autoConnect();
});