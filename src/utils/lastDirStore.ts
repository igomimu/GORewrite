/**
 * IndexedDB を使って最後に開いた/保存したファイルハンドルを永続化する。
 * 次回起動時に startIn として使うことで、前回のフォルダを記憶する。
 */

const DB_NAME = 'snap-goban-settings';
const STORE_NAME = 'fileHandles';
const LAST_SGF_KEY = 'lastSgfHandle';

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, 1);
        req.onupgradeneeded = () => {
            if (!req.result.objectStoreNames.contains(STORE_NAME)) {
                req.result.createObjectStore(STORE_NAME);
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

export async function saveLastDirHandle(handle: any): Promise<void> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        tx.objectStore(STORE_NAME).put(handle, LAST_SGF_KEY);
        await new Promise<void>((res, rej) => {
            tx.oncomplete = () => res();
            tx.onerror = () => rej(tx.error);
        });
        db.close();
    } catch { /* silent */ }
}

export async function loadLastDirHandle(): Promise<any | undefined> {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const req = tx.objectStore(STORE_NAME).get(LAST_SGF_KEY);
        const result = await new Promise<any>((res, rej) => {
            req.onsuccess = () => res(req.result);
            req.onerror = () => rej(req.error);
        });
        db.close();
        return result || undefined;
    } catch {
        return undefined;
    }
}
