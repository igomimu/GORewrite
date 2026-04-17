/**
 * 棋士写真ストア — IndexedDBで棋士名→写真Base64マッピングを管理
 */

const DB_NAME = 'snap-goban-kishi-photos';
const STORE_NAME = 'photos';
const DB_VERSION = 1;

interface PhotoEntry {
    name: string;       // 正規化済み棋士名（キー）
    photo: string;      // data:image/jpeg;base64,...
    rank: string;       // 段位
}

interface PhotoJSON {
    version: number;
    players: Record<string, { photo: string; rank: string }>;
}

function openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);
        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'name' });
            }
        };
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}

/** CJK異体字を統一する */
const VARIANT_MAP: Record<string, string> = {
    '\u771E': '\u771F', // 眞→真
    '\u8C1E': '\u8ADD', // 谞→諝
    '\u9F4A': '\u6589', // 齊→斉
    '\u9AD9': '\u9AD8', // 髙→高
    '\u6F81': '\u6E0B', // 澁→渋
    '\u908A': '\u8FBA', // 邊→辺
};

/** 名前を正規化: スペース除去 + 異体字統一 */
function normalizeName(name: string): string {
    let s = name.replace(/\u3000/g, '').replace(/ /g, '').trim();
    s = Array.from(s).map(c => VARIANT_MAP[c] || c).join('');
    return s;
}

/** JSONファイルから写真をインポート。登録数を返す。 */
export async function importPhotosFromJSON(file: File): Promise<number> {
    const text = await file.text();
    const data: PhotoJSON = JSON.parse(text);

    if (!data.players || typeof data.players !== 'object') {
        throw new Error('Invalid JSON format');
    }

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    let count = 0;
    for (const [name, entry] of Object.entries(data.players)) {
        const normalized = normalizeName(name);
        const record: PhotoEntry = {
            name: normalized,
            photo: entry.photo,
            rank: entry.rank || '',
        };
        store.put(record);
        count++;
    }

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(count); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}

/** 棋士名から写真を取得。見つからなければnull。 */
export async function getPhoto(name: string): Promise<string | null> {
    if (!name) return null;
    const normalized = normalizeName(name);

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const req = store.get(normalized);
        req.onsuccess = () => {
            db.close();
            const entry = req.result as PhotoEntry | undefined;
            resolve(entry?.photo ?? null);
        };
        req.onerror = () => { db.close(); reject(req.error); };
    });
}

/** 登録済み棋士数を返す。 */
export async function getPhotoCount(): Promise<number> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
        const req = store.count();
        req.onsuccess = () => { db.close(); resolve(req.result); };
        req.onerror = () => { db.close(); reject(req.error); };
    });
}

/** 全写真を削除。 */
export async function clearPhotos(): Promise<void> {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.clear();

    return new Promise((resolve, reject) => {
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => { db.close(); reject(tx.error); };
    });
}
