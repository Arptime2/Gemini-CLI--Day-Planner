class AppDB {
    constructor(dbName, dbVersion) {
        this.dbName = dbName;
        this.dbVersion = dbVersion;
        this.db = null;
    }

    async initDB() {
        return new Promise((resolve, reject) => {
            if (this.db) {
                return resolve(this.db);
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('Database error:', event.target.error);
                reject('Database error: ' + event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('Database opened successfully.');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                console.log('Database upgrade needed.');
                const db = event.target.result;
                this.upgradeDB(db);
            };
        });
    }

    upgradeDB(db) {
        const storeSchemas = [
            { name: 'tasks', options: { keyPath: 'id', autoIncrement: true } },
            { name: 'habits', options: { keyPath: 'id', autoIncrement: true } },
            { name: 'notes', options: { keyPath: 'id', autoIncrement: true } },
            { name: 'selected_habits', options: { keyPath: 'id', autoIncrement: true } }
        ];

        storeSchemas.forEach(schema => {
            if (!db.objectStoreNames.contains(schema.name)) {
                console.log(`Creating ${schema.name} object store`);
                db.createObjectStore(schema.name, schema.options);
            }
        });
    }

    getStore(storeName, mode) {
        const transaction = this.db.transaction(storeName, mode);
        return transaction.objectStore(storeName);
    }

    async addItem(storeName, item) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.add(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error adding item: ' + event.target.error);
        });
    }

    async getAllItems(storeName) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readonly');
            const request = store.getAll();
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error getting all items: ' + event.target.error);
        });
    }

    async updateItem(storeName, item) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.put(item);
            request.onsuccess = () => resolve(request.result);
            request.onerror = (event) => reject('Error updating item: ' + event.target.error);
        });
    }

    async deleteItem(storeName, id) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.delete(id);
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Error deleting item: ' + event.target.error);
        });
    }

    async clearStore(storeName) {
        await this.initDB();
        return new Promise((resolve, reject) => {
            const store = this.getStore(storeName, 'readwrite');
            const request = store.clear();
            request.onsuccess = () => resolve();
            request.onerror = (event) => reject('Error clearing store: ' + event.target.error);
        });
    }
}

window.db = new AppDB('ProjectZenithDB', 2);