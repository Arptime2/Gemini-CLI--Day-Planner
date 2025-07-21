async function syncWithGun(user, trustedDevices) {
    console.log('Initiating sync with Gun...');

    const localData = {
        tasks: await window.db.getAllItems('tasks'),
        habits: await window.db.getAllItems('habits'),
        notes: await window.db.getAllItems('notes'),
    };

    // Encrypt and send data to each trusted device
    for (const deviceKey of trustedDevices) {
        for (const storeName in localData) {
            const dataToSync = localData[storeName];
            user.get('data').get(storeName).put(JSON.stringify(dataToSync), (ack) => {
                if (ack.err) {
                    console.error(`Error sending ${storeName} to ${deviceKey}:`, ack.err);
                } else {
                    console.log(`${storeName} sent to ${deviceKey} successfully`);
                }
            });
        }
    }

    // Listen for data from trusted devices
    for (const deviceKey of trustedDevices) {
        gun.user(deviceKey).get('data').on(async (encryptedData, key) => {
            const decryptedData = await SEA.decrypt(encryptedData, pair);
            if (decryptedData) {
                const { storeName, data } = decryptedData;
                console.log(`Received ${storeName} from ${deviceKey}`);
                for (const item of data) {
                    await window.db.updateItem(storeName, item);
                }
            }
        });
    }
}

window.sync = {
    syncWithGun,
};