document.addEventListener('DOMContentLoaded', () => {
    const exportBtn = document.getElementById('export-btn');
    const importBtn = document.getElementById('import-btn');
    const importFile = document.getElementById('import-file');
    const apiKeyInput = document.getElementById('api-key-input');
    const saveKeyBtn = document.getElementById('save-key-btn');
    const apiKeyStatus = document.getElementById('api-key-status');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const generateKeyBtn = document.getElementById('generate-key-btn');
    const localKeyDisplay = document.getElementById('local-key-display');
    const remoteKeyInput = document.getElementById('remote-key-input');
    const addDeviceBtn = document.getElementById('add-device-btn');
    const trustedDevicesList = document.getElementById('trusted-devices-list');
    const syncNowBtn = document.getElementById('sync-now-btn');

    let trustedDevices = JSON.parse(localStorage.getItem('trusted_devices')) || [];

    function generateSyncKey() {
        const key = 'zenith_sync_' + Math.random().toString(36).substr(2, 16);
        localKeyDisplay.value = key;
        return key;
    }

    function renderTrustedDevices() {
        trustedDevicesList.innerHTML = '';
        trustedDevices.forEach(deviceKey => {
            const li = document.createElement('li');
            li.textContent = deviceKey;
            const removeBtn = document.createElement('button');
            removeBtn.className = 'remove-device-btn';
            removeBtn.textContent = '❌';
            removeBtn.onclick = () => removeDevice(deviceKey);
            li.appendChild(removeBtn);
            trustedDevicesList.appendChild(li);
        });
    }

    function addDevice() {
        const newKey = remoteKeyInput.value.trim();
        if (newKey && !trustedDevices.includes(newKey)) {
            trustedDevices.push(newKey);
            localStorage.setItem('trusted_devices', JSON.stringify(trustedDevices));
            remoteKeyInput.value = '';
            renderTrustedDevices();
        } else if (!newKey) {
            alert('Please enter a key.');
        } else {
            alert('This device key is already in your trusted list.');
        }
    }

    function removeDevice(keyToRemove) {
        trustedDevices = trustedDevices.filter(key => key !== keyToRemove);
        localStorage.setItem('trusted_devices', JSON.stringify(trustedDevices));
        renderTrustedDevices();
    }

    async function syncNow() {
        alert('Syncing with trusted devices...');
        // In a real implementation, this would trigger the data exchange.
        // For now, this is a placeholder.
        console.log('Syncing with:', trustedDevices);
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
    generateKeyBtn.addEventListener('click', generateSyncKey);
    addDeviceBtn.addEventListener('click', addDevice);
    syncNowBtn.addEventListener('click', syncNow);

    loadApiKey();
    renderTrustedDevices();
});