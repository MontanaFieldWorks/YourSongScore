// IndexedDB-backed durable local cache for converted audio files. This exists specifically
// for the case where Firebase Storage upload fails (e.g. a CORS misconfiguration on the
// bucket) - the previous fallback was a session-only blob URL, which becomes permanently
// dead the moment the page reloads, making the track genuinely unanalyzable afterward.
// IndexedDB persists across reloads within the same browser/device, closing that gap.
const DB_NAME = "yss_local_files";
const STORE_NAME = "files";
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function saveLocalFile(trackId: string, file: File): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).put(file, trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getLocalFile(trackId: string): Promise<File | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readonly");
    const req = tx.objectStore(STORE_NAME).get(trackId);
    req.onsuccess = () => resolve((req.result as File) || null);
    req.onerror = () => reject(req.error);
  });
}

export async function deleteLocalFile(trackId: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    tx.objectStore(STORE_NAME).delete(trackId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
