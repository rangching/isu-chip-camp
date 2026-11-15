// 製程尋寶與密碼鎖的設定。
// 老師在 #teacher 填四站的現場答案與當日 4 位元密碼，產生 #cfg=… 連結；
// 連結裡只放「答案雜湊」與「被答案遮住的密碼位元」，原始碼與網址都看不到答案。
import { answerHash, fnv1a, normalize } from './logic';

export interface Station {
  id: 'dep' | 'litho' | 'etch' | 'pkg';
  name: string;
  short: string;
  where: string;
  /** 練習模式顯示的線索（現場模式改成「到現場找」） */
  practiceClue: string;
  /** 練習模式用的微縮文字（放在顯微鏡裡） */
  practiceMicro: string;
  question: string;
  idea: string;
  unit: string; // 延伸學習的系列單元
}

export const STATIONS: Station[] = [
  {
    id: 'dep', name: '薄膜沉積', short: '沉積', where: '5F 擬真製程展示區',
    question: '沉積時，晶圓上「一層一層長上去」的東西叫什麼？（2 個字）',
    practiceClue: '用顯微鏡看下面那塊晶粒角落的小字。',
    practiceMicro: '薄膜',
    idea: '在晶圓表面鋪上一層很薄的材料（氧化矽、氮化矽、金屬…），厚度只有幾奈米到幾微米。常見方法有 CVD（化學氣相沉積，用氣體反應長膜）與 PVD（物理氣相沉積，例如濺鍍）。',
    unit: 'm11-03',
  },
  {
    id: 'litho', name: '黃光微影', short: '微影', where: '5F 擬真製程展示區',
    question: '微影時，把電路圖案「照」到光阻上要透過哪一片板子？（2 個字）',
    practiceClue: '用顯微鏡看晶粒上的微縮文字。',
    practiceMicro: '光罩',
    idea: '先塗一層感光的光阻，再讓光穿過畫好電路的「光罩」照到晶圓上，顯影後光阻就留下電路形狀。微影區用黃光照明，是為了不讓一般燈光讓光阻提早感光。',
    unit: 'm11-04',
  },
  {
    id: 'etch', name: '蝕刻', short: '蝕刻', where: '5F 擬真製程展示區',
    question: '用帶電氣體把材料「打掉」的乾蝕刻，用的是物質的第四態，叫什麼？（2 個字）',
    practiceClue: '用顯微鏡找找看，小字藏在晶粒的另一角。',
    practiceMicro: '電漿',
    idea: '沒被光阻保護的地方被挖掉，圖案就轉移到下面的薄膜。濕蝕刻用化學溶液、各方向一起吃；乾蝕刻用電漿，可以挖得又直又深。',
    unit: 'm11-05',
  },
  {
    id: 'pkg', name: '切割與封測', short: '封測', where: '6F 潔淨室',
    question: '晶圓上一顆一顆、還沒封裝的小晶片叫什麼？（2 個字）',
    practiceClue: '用顯微鏡看切割道旁邊的小字。',
    practiceMicro: '晶粒',
    idea: '先用探針台測出好壞（CP），再沿著切割道把晶圓切成一顆顆晶粒，黏到基板、打線或覆晶，最後包起來保護並再測一次（FT）。',
    unit: 'm12-04',
  },
];

export interface CampConfig {
  v: 1;
  /** 現場模式（老師設定）或練習模式 */
  mode: 'live' | 'practice';
  salt: string;
  /** 四站答案雜湊 */
  h: string[];
  /** 密碼位元 XOR 答案雜湊最低位，答對才解得開 */
  m: number[];
  /** 現場模式時，老師可替每站寫的提示（例如「看探針台旁的海報」） */
  hints?: string[];
  label?: string;
}

const bitOf = (salt: string, answer: string) => fnv1a(`bit|${salt}|${normalize(answer)}`) & 1;

/** 用明文答案與密碼產生設定（老師端） */
export function makeConfig(answers: string[], code: (0 | 1)[], opts: { mode?: 'live' | 'practice'; salt?: string; hints?: string[]; label?: string } = {}): CampConfig {
  const salt = opts.salt ?? Math.random().toString(36).slice(2, 8);
  return {
    v: 1,
    mode: opts.mode ?? 'live',
    salt,
    h: answers.map((a) => answerHash(salt, a)),
    m: code.map((c, i) => c ^ bitOf(salt, answers[i])),
    hints: opts.hints?.some((x) => x.trim()) ? opts.hints : undefined,
    label: opts.label?.trim() || undefined,
  };
}

/** 學員端：答案對了才回傳這一站的密碼位元 */
export function checkStation(cfg: CampConfig, i: number, answer: string): 0 | 1 | null {
  if (!answer.trim() || answerHash(cfg.salt, answer) !== cfg.h[i]) return null;
  return (cfg.m[i] ^ bitOf(cfg.salt, answer)) as 0 | 1;
}

/** 練習模式：固定密碼 1011，任何人都能在網頁上玩完 */
export const PRACTICE_CODE: (0 | 1)[] = [1, 0, 1, 1];
export const PRACTICE: CampConfig = makeConfig(STATIONS.map((s) => s.practiceMicro), PRACTICE_CODE, { mode: 'practice', salt: 'practice' });

// ---------- 網址片段編解碼（UTF-8 → base64url） ----------
function b64url(s: string) {
  const bytes = new TextEncoder().encode(s);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
function unb64url(s: string) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
}
export const encodeConfig = (c: CampConfig) => b64url(JSON.stringify(c));
export function decodeConfig(s: string): CampConfig | null {
  try {
    const c = JSON.parse(unb64url(s)) as CampConfig;
    if (c?.v !== 1 || !Array.isArray(c.h) || c.h.length !== 4 || !Array.isArray(c.m) || c.m.length !== 4 || typeof c.salt !== 'string') return null;
    return { ...c, mode: c.mode === 'practice' ? 'practice' : 'live' };
  } catch {
    return null;
  }
}
/** 從 location.hash 取出 cfg（#cfg=xxx 或 #mission&cfg=xxx） */
export function configFromHash(hash: string): CampConfig | null {
  const m = /(?:^#|&)cfg=([A-Za-z0-9_-]+)/.exec(hash);
  return m ? decodeConfig(m[1]) : null;
}
export const configId = (c: CampConfig) => `${c.mode}:${c.salt}`;
