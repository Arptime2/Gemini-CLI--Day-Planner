
const DB_NAME = 'ProjectZenithDB';
const DB_VERSION = 2;
let db;

function initDB() {
    return new Promise((resolve, reject) => {
        if (db) {
            return resolve(db);
        }

        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = (event) => {
            console.error('Database error:', event.target.error);
            reject('Database error: ' + event.target.error);
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully.');
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            console.log('Database upgrade needed.');
            const db = event.target.result;

            if (!db.objectStoreNames.contains('tasks')) {
                console.log('Creating tasks object store');
                db.createObjectStore('tasks', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('habits')) {
                console.log('Creating habits object store');
                db.createObjectStore('habits', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('notes')) {
                console.log('Creating notes object store');
                db.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
            }

            if (!db.objectStoreNames.contains('selected_habits')) {
                console.log('Creating selected_habits object store');
                db.createObjectStore('selected_habits', { keyPath: 'id', autoIncrement: true });
            }
        };
    });
}

function getStore(storeName, mode) {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

function addItem(storeName, item) {
    return new Promise((resolve, reject) => {
        initDB().then(db => {
            const store = getStore(storeName, 'readwrite');
            const request = store.add(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error adding item: ' + event.target.error);
        }).catch(reject);
    });
}

function getAllItems(storeName) {
    return new Promise((resolve, reject) => {
        initDB().then(db => {
            const store = getStore(storeName, 'readonly');
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error getting all items: ' + event.target.error);
        }).catch(reject);
    });
}

function updateItem(storeName, item) {
    return new Promise((resolve, reject) => {
        initDB().then(db => {
            const store = getStore(storeName, 'readwrite');
            const request = store.put(item);

            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error updating item: ' + event.target.error);
        }).catch(reject);
    });
}

function deleteItem(storeName, id) {
    return new Promise((resolve, reject) => {
        initDB().then(db => {
            const store = getStore(storeName, 'readwrite');
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Error deleting item: ' + event.target.error);
        }).catch(reject);
    });
}

function clearStore(storeName) {
    return new Promise((resolve, reject) => {
        initDB().then(db => {
            const store = getStore(storeName, 'readwrite');
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Error clearing store: ' + event.target.error);
        }).catch(reject);
    });
}

// Export functions to be used by other modules
window.db = {
    initDB,
    addItem,
    getAllItems,
    updateItem,
    deleteItem,
    clearStore
};
