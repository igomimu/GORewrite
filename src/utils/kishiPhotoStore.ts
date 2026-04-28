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

/** 簡体字→日本字（新字体）対応表
 * foxwq.com 等の中国系サイト由来SGFは日本人棋士名を簡体字記載する場合があるため、
 * 写真検索時に簡体字版バリアントも試せるようにする。
 * zhconv で写真DB登録名527件から自動抽出（簡体字側が日本字としてDBに無い字のみ採用）。
 */
const SIMPLIFIED_TO_JAPANESE: Record<string, string> = {
    '东': '東', // 东→東
    '临': '臨', // 临→臨
    '为': '為', // 为→為
    '义': '義', // 义→義
    '于': '於', // 于→於
    '云': '雲', // 云→雲
    '亲': '親', // 亲→親
    '仓': '倉', // 仓→倉
    '优': '優', // 优→優
    '伦': '倫', // 伦→倫
    '冈': '岡', // 冈→岡
    '冢': '塚', // 冢→塚
    '准': '準', // 准→準
    '凉': '涼', // 凉→涼
    '则': '則', // 则→則
    '升': '昇', // 升→昇
    '华': '華', // 华→華
    '叶': '葉', // 叶→葉
    '后': '後', // 后→後
    '吕': '呂', // 吕→呂
    '启': '啓', // 启→啓
    '响': '響', // 响→響
    '园': '園', // 园→園
    '圣': '聖', // 圣→聖
    '场': '場', // 场→場
    '复': '復', // 复→復
    '孙': '孫', // 孙→孫
    '宁': '寧', // 宁→寧
    '宪': '憲', // 宪→憲
    '宫': '宮', // 宫→宮
    '尔': '爾', // 尔→爾
    '岛': '島', // 岛→島
    '峰': '峯', // 峰→峯
    '干': '幹', // 干→幹
    '广': '廣', // 广→廣
    '庆': '慶', // 庆→慶
    '张': '張', // 张→張
    '彻': '徹', // 彻→徹
    '恺': '愷', // 恺→愷
    '时': '時', // 时→時
    '晖': '暉', // 晖→暉
    '条': '條', // 条→條
    '杨': '楊', // 杨→楊
    '杰': '傑', // 杰→傑
    '枫': '楓', // 枫→楓
    '树': '樹', // 树→樹
    '桥': '橋', // 桥→橋
    '樱': '櫻', // 樱→櫻
    '汉': '漢', // 汉→漢
    '汤': '湯', // 汤→湯
    '沟': '溝', // 沟→溝
    '泷': '瀧', // 泷→瀧
    '泽': '澤', // 泽→澤
    '洁': '潔', // 洁→潔
    '洼': '窪', // 洼→窪
    '润': '潤', // 润→潤
    '渊': '淵', // 渊→淵
    '滨': '濱', // 滨→濱
    '爱': '愛', // 爱→愛
    '矶': '磯', // 矶→磯
    '种': '種', // 种→種
    '笃': '篤', // 笃→篤
    '筿': '篠', // 筿→篠
    '红': '紅', // 红→紅
    '纪': '紀', // 纪→紀
    '纯': '純', // 纯→純
    '纱': '紗', // 纱→紗
    '绅': '紳', // 绅→紳
    '织': '織', // 织→織
    '结': '結', // 结→結
    '绚': '絢', // 绚→絢
    '绫': '綾', // 绫→綾
    '维': '維', // 维→維
    '胜': '勝', // 胜→勝
    '腾': '騰', // 腾→騰
    '节': '節', // 节→節
    '苏': '蘇', // 苏→蘇
    '茧': '繭', // 茧→繭
    '莹': '瑩', // 莹→瑩
    '萧': '蕭', // 萧→蕭
    '规': '規', // 规→規
    '训': '訓', // 训→訓
    '许': '許', // 许→許
    '识': '識', // 识→識
    '诏': '詔', // 诏→詔
    '诗': '詩', // 诗→詩
    '诚': '誠', // 诚→誠
    '谞': '諝', // 谞→諝
    '谢': '謝', // 谢→謝
    '贞': '貞', // 贞→貞
    '贡': '貢', // 贡→貢
    '贤': '賢', // 贤→賢
    '贵': '貴', // 贵→貴
    '贺': '賀', // 贺→賀
    '赵': '趙', // 赵→趙
    '轩': '軒', // 轩→軒
    '辅': '輔', // 辅→輔
    '辉': '輝', // 辉→輝
    '边': '邊', // 边→邊
    '辽': '遼', // 辽→遼
    '达': '達', // 达→達
    '远': '遠', // 远→遠
    '连': '連', // 连→連
    '郑': '鄭', // 郑→鄭
    '钦': '欽', // 钦→欽
    '钰': '鈺', // 钰→鈺
    '铁': '鉄', // 铁→鉄
    '铃': '鈴', // 铃→鈴
    '铭': '銘', // 铭→銘
    '锐': '鋭', // 锐→鋭
    '锡': '錫', // 锡→錫
    '长': '長', // 长→長
    '间': '間', // 间→間
    '闻': '聞', // 闻→聞
    '阳': '陽', // 阳→陽
    '陈': '陳', // 陈→陳
    '韦': '韋', // 韦→韋
    '风': '風', // 风→風
    '飞': '飛', // 飞→飛
    '饭': '飯', // 饭→飯
    '馆': '舘', // 馆→舘
    '马': '馬', // 马→馬
    '骏': '駿', // 骏→駿
    '鸟': '鳥', // 鸟→鳥
    '鹤': '鶴', // 鹤→鶴
    '龙': '龍', // 龙→龍
};

/** 簡体字を日本字に変換。差がなければ元の文字列を返す。 */
function simplifiedToJapanese(name: string): string {
    return Array.from(name).map(c => SIMPLIFIED_TO_JAPANESE[c] || c).join('');
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

/** 棋士名から写真を取得。見つからなければnull。
 * 1) 異体字正規化後で検索
 * 2) ヒットしなければ簡体字→日本字変換版でも検索（中国系SGFが日本人名を簡体字記載するケース）
 */
export async function getPhoto(name: string): Promise<string | null> {
    if (!name) return null;
    const normalized = normalizeName(name);
    const candidates = [normalized];
    const jVersion = simplifiedToJapanese(normalized);
    if (jVersion !== normalized) candidates.push(jVersion);

    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve) => {
        let i = 0;
        const tryNext = () => {
            if (i >= candidates.length) { db.close(); resolve(null); return; }
            const req = store.get(candidates[i++]);
            req.onsuccess = () => {
                const entry = req.result as PhotoEntry | undefined;
                if (entry) { db.close(); resolve(entry.photo); return; }
                tryNext();
            };
            req.onerror = () => { db.close(); resolve(null); };
        };
        tryNext();
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
