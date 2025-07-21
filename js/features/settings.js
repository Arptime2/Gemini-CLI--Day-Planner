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
    const createOfferBtn = document.getElementById('create-offer-btn');
    const acceptOfferBtn = document.getElementById('accept-offer-btn');
    const finalizeSyncBtn = document.getElementById('finalize-sync-btn');
    const syncNowBtn = document.getElementById('sync-now-btn');

    let webRTCSync;

    function initializePeer() {
        localKeyDisplay.value = 'Peer Initialized';
        webRTCSync = new window.sync.WebRTCSync(handleDataReceived);
    }

    async function createOffer() {
        if (!webRTCSync) {
            alert('Please generate a key first.');
            return;
        }
        const offer = await webRTCSync.createOffer();
        prompt('Copy this offer and paste it on the other device:', JSON.stringify(offer));
    }

    async function acceptOffer() {
        if (!webRTCSync) {
            alert('Please generate a key first.');
            return;
        }
        const offerString = prompt('Paste the offer from the other device:');
        if (!offerString) return;

        try {
            const offer = JSON.parse(offerString);
            const answer = await webRTCSync.createAnswer(offer);
            prompt('Copy this answer and paste it on the first device:', JSON.stringify(answer));
        } catch (e) {
            alert('Invalid offer format.');
            console.error(e);
        }
    }

    async function finalizeSync() {
        if (!webRTCSync) {
            alert('Please generate a key first.');
            return;
        }
        const answerString = prompt('Paste the answer from the other device:');
        if (!answerString) return;

        try {
            const answer = JSON.parse(answerString);
            await webRTCSync.setAnswer(answer);
        } catch (e) {
            alert('Invalid answer format.');
            console.error(e);
        }
    }

    async function syncNow() {
        if (!webRTCSync || !webRTCSync.dataChannel || webRTCSync.dataChannel.readyState !== 'open') {
            alert('Please establish a connection first.');
            return;
        }
        const localData = {
            tasks: await window.db.getAllItems('tasks'),
            habits: await window.db.getAllItems('habits'),
            notes: await window.db.getAllItems('notes'),
        };
        webRTCSync.send(localData);
        alert('Data sent!');
    }

    async function handleDataReceived(data) {
        console.log('Data received:', data);
        alert('Data received from the other device!');

        if (data.tasks) {
            for (const item of data.tasks) await window.db.updateItem('tasks', item);
        }
        if (data.habits) {
            for (const item of data.habits) await window.db.updateItem('habits', item);
        }
        if (data.notes) {
            for (const item of data.notes) await window.db.updateItem('notes', item);
        }
        location.reload();
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
    generateKeyBtn.addEventListener('click', initializePeer);
    createOfferBtn.addEventListener('click', createOffer);
    acceptOfferBtn.addEventListener('click', acceptOffer);
    finalizeSyncBtn.addEventListener('click', finalizeSync);
    syncNowBtn.addEventListener('click', syncNow);

    loadApiKey();
});