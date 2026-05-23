interface StoredEvidenceImage {
  key: string;
  blob: Blob;
  name: string;
  type: string;
  size: number;
  updatedAt: string;
}

const dbName = 'swim-california-evidence';
const dbVersion = 1;
const imageStoreName = 'wowsa-images';

function openEvidenceDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === 'undefined') {
    return Promise.reject(new Error('Browser image storage is unavailable.'));
  }

  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, dbVersion);

    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(imageStoreName)) {
        db.createObjectStore(imageStoreName, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(new Error('Could not open browser evidence storage.'));
  });
}

function runImageStore<T>(mode: IDBTransactionMode, operation: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openEvidenceDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const transaction = db.transaction(imageStoreName, mode);
        const store = transaction.objectStore(imageStoreName);
        const request = operation(store);

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(new Error('Evidence storage operation failed.'));
        transaction.oncomplete = () => db.close();
        transaction.onerror = () => {
          db.close();
          reject(new Error('Evidence storage transaction failed.'));
        };
      })
  );
}

export function makeEvidenceImageKey(missionId: string, at: string, fileName: string) {
  const safeName = fileName.replace(/[^a-z0-9._-]+/gi, '-').replace(/^-|-$/g, '') || 'photo';
  return `${missionId}/${at}/${safeName}`;
}

export function saveEvidenceImage(key: string, file: File) {
  const record: StoredEvidenceImage = {
    key,
    blob: file,
    name: file.name,
    type: file.type,
    size: file.size,
    updatedAt: new Date().toISOString()
  };

  return runImageStore('readwrite', (store) => store.put(record));
}

export function getEvidenceImage(key: string) {
  return runImageStore<StoredEvidenceImage | undefined>('readonly', (store) => store.get(key));
}

export function deleteEvidenceImage(key: string) {
  return runImageStore('readwrite', (store) => store.delete(key));
}
