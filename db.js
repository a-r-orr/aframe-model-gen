const DB_NAME = 'AssetGenDB';
const STORE_NAME = 'generated_assets';
let db;

/**
 * Initialises the IndexedDB database.
 * @returns {Promise<IDBDatabase>} Promise that resolves with the database instance
 */
function initDB() {
    return new Promise((resolve, reject) => {
        // Open the database
        const request = indexedDB.open(DB_NAME, 1);

        request.onupgradeneeded = (event) => {
            const dbInstance = event.target.result;
            console.log("Database needs upgraded");

            if (!dbInstance.objectStoreNames.contains(STORE_NAME)) {
                const objectStore = dbInstance.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
                // TODO: Add Indexes here if needed
                console.log(`${STORE_NAME} object store created.`)
            }
        };

        request.onerror = (event) => {
            console.error("Database Error: ", event.target.error);
            reject('Database error');
        };

        request.onsuccess = (event) => {
            db = event.target.result;
            console.log('Database opened successfully.');
            resolve(db);
        };
    });
}

/**
 * Adds assets to the database.
 */
function addAsset(prompt, imageBlob, modelBlob) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('Database not initialised. Call initDB() first.');
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Create new asset record
        const newAsset = {
            prompt: prompt,
            imageBlob: imageBlob,
            modelBlob: modelBlob,
            scale: 1,
            created: new Date()
        };

        // Add the record to the object store
        const request = objectStore.add(newAsset);

        request.onsuccess = (event) => {
            console.log(`Asset added for prompt "${prompt}". ID: `, event.target.result)
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Error adding asset: ', event.target.error);
            reject('Error adding asset');
        };
    });
}


/**
 * Updates a model's scale in the database.
 */
function updateModelScale(id, newScale) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('Database not initialised. Call initDB() first.');
        }

        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const objectStore = transaction.objectStore(STORE_NAME);

        // Retrieve the record
        const getRequest = objectStore.get(id);

        getRequest.onsuccess = (event) => {
            const asset = getRequest.result;
            console.log(`Asset retrieved for ID ${id} `, asset);
            asset.scale = newScale;

            const updateAssetRequest = objectStore.put(asset);

            updateAssetRequest.onsuccess = (event2) => {
                console.log('Asset scale updated.');
                resolve(event2.target.result);
            };

            updateAssetRequest.onerror = (event2) => {
                console.error('Error updating asset scale: ', event2.target.error);
            };
            
        };

        getRequest.onerror = (event) => {
            console.error('Error retrieving asset: ', event.target.error);
            reject('Error retrieving asset');
        };
    });
}

function getAsset(id) {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('Database not initialised. Call initDB() first.');
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        const request = objectStore.get(id);

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Error getting asset: ', event.target.error);
            reject('Error getting asset');
        };
    });
}

function getAllAssets() {
    return new Promise((resolve, reject) => {
        if (!db) {
            return reject('Database not initialised. Call initDB() first.');
        }

        const transaction = db.transaction([STORE_NAME], 'readonly');
        const objectStore = transaction.objectStore(STORE_NAME);

        const request = objectStore.getAll();

        request.onsuccess = (event) => {
            resolve(event.target.result);
        };

        request.onerror = (event) => {
            console.error('Error getting assets: ', event.target.error);
            reject('Error getting assets');
        };
    });
}