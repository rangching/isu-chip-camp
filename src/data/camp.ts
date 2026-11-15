// 營隊基本資料：全部來自活動企劃書（116 年寒假「大學探索之旅」體驗營）。
// 網頁上所有日期、時間、地點都從這裡讀，改這一份就好。

export const CAMP = {
  title: '「義」起解密晶片',
  subtitle: '半導體製程 × 智慧感測創客營',
  host: '義守大學 智慧科技學院 電子工程學系（含半導體學士學位學程）',
  series: '116 年寒假「大學探索之旅」體驗營',
  dateLabel: '116 年 1 月 28 日（四）',
  /** 西元 2027-01-28，臺灣時間 */
  startISO: '2027-01-28T09:30:00+08:00',
  endISO: '2027-01-28T16:30:00+08:00',
  dateISO: '2027-01-28',
  teachers: ['林彥勝 教授', '陳柏勳 副教授'],
  intro:
    '「義」起解密半導體晶片與智慧感測技術！透過 IC 邏輯解密遊戲、擬真製程模擬、潔淨室晶圓切割與微動探針台晶片量測，並動手實作光敏節能與聲控互動感測控制模組，從矽晶圓到智慧感測裝置一氣呵成，探索未來科技核心競爭力！',
  themes: [
    { no: '01', title: '「義」探晶圓製程', desc: '潔淨室晶圓切割與微動探針台晶片量測體驗', color: 'electron' },
    { no: '02', title: 'IC 邏輯解密遊戲', desc: '從 0 與 1 數位邏輯閘到二進位密碼鎖闖關挑戰', color: 'field' },
    { no: '03', title: '智慧感測創客實作', desc: '光感節能與聲控互動感測模組設計', color: 'output' },
  ],
  /** 企劃書公開的聯絡窗口（系辦分機與 e-mail） */
  contact: [
    { role: '營隊規劃', name: '陳柏勳 副教授', ext: '6669', email: 'phchen@isu.edu.tw' },
    { role: '系辦', name: '陳雅怡 秘書', ext: '6652', email: 'yy0605@isu.edu.tw' },
  ],
  phone: '07-6577711',
} as const;

export type Group = 'A' | 'B';

export type PlaceId = 'bus' | 'aic' | 'f5' | 'f6' | 'r3501' | 'r03601';
export const PLACES: Record<PlaceId, { name: string; floor: string; note: string }> = {
  bus: { name: '校本部候車亭', floor: '戶外', note: '報到與賦歸集合點，工讀生會帶你到科技大樓 5 樓。' },
  aic: { name: '智慧科技產研中心', floor: '科技大樓 5F', note: '開場、上午結語、成果展示與大合照。' },
  f5: { name: '半導體製程展示場域', floor: '科技大樓 5F', note: '擬真製程電腦媒介與微動探針台（Probe Station）。' },
  f6: { name: '半導體實體潔淨室', floor: '科技大樓 6F', note: '穿無塵衣、過空氣浴，體驗晶圓切割與顯微檢測。' },
  r3501: { name: '3501 教室', floor: '科技大樓', note: '午餐與午休。' },
  r03601: { name: 'AI 電腦教室（03601）', floor: '科技大樓', note: '下午 IC 邏輯解密與感測器實作。' },
};

/** mission：對應網頁上的任務區塊 id */
export interface Slot {
  start: string; // HH:MM
  end: string;
  title: string;
  place: PlaceId | Partial<Record<Group, PlaceId>>;
  /** A、B 組內容不同時分開寫 */
  byGroup?: Record<Group, string>;
  who: string;
  mission?: string;
}

export const SCHEDULE: Slot[] = [
  { start: '09:00', end: '09:30', title: '學員到校與報到引導', place: 'bus', who: '工讀生引導' },
  { start: '09:30', end: '10:00', title: '半導體產業鏈導覽與「製程尋寶解密」任務說明', place: 'aic', who: '林彥勝 教授、陳柏勳 副教授', mission: 'industry' },
  {
    start: '10:00', end: '11:00', title: '半導體場域實作體驗（第一梯次）',
    place: { A: 'f5', B: 'f6' },
    byGroup: { A: '5F 擬真製程模擬與微動探針台下針電性量測', B: '6F 潔淨室無塵衣著裝、晶圓切割與顯微檢測' },
    who: '林彥勝 教授', mission: 'process',
  },
  {
    start: '11:00', end: '12:00', title: '半導體場域實作體驗（第二梯次，A／B 互換）',
    place: { A: 'f6', B: 'f5' },
    byGroup: { A: '6F 潔淨室無塵衣著裝、晶圓切割與顯微檢測', B: '5F 擬真製程模擬與微動探針台下針電性量測' },
    who: '林彥勝 教授', mission: 'cleanroom',
  },
  { start: '12:00', end: '12:30', title: '製程尋寶微縮密碼核對、上午結語與互動交流', place: 'f5', who: '林彥勝 教授、陳柏勳 副教授', mission: 'hunt' },
  { start: '12:30', end: '13:30', title: '用餐、午休', place: 'r3501', who: '全體師生' },
  { start: '13:30', end: '14:00', title: '從矽晶圓到感測器：IC 數位邏輯閘與智慧感測原理', place: 'r03601', who: '陳柏勳 副教授', mission: 'logic' },
  { start: '14:00', end: '14:30', title: '【關卡一】IC 邏輯解密遊戲：4 位元二進位密碼鎖', place: 'r03601', who: '陳柏勳 副教授', mission: 'lock' },
  { start: '14:30', end: '15:30', title: '【關卡二】智慧感測器控制：光敏節能與拍手聲控', place: 'r03601', who: '陳柏勳 副教授', mission: 'sensors' },
  { start: '15:30', end: '16:00', title: '智慧感測成果展示與學習歷程心得撰寫', place: 'aic', who: '陳柏勳 副教授', mission: 'portfolio' },
  { start: '16:00', end: '16:30', title: '綜合討論、頒發研習證明與全體大合照', place: 'aic', who: '林彥勝 教授、陳柏勳 副教授' },
  { start: '16:30', end: '16:45', title: '賦歸', place: 'bus', who: '工讀生引導' },
];

export function slotPlace(s: Slot, g: Group): PlaceId {
  return typeof s.place === 'string' ? s.place : (s.place[g] ?? 'aic');
}
export function slotText(s: Slot, g: Group) {
  return s.byGroup ? s.byGroup[g] : s.title;
}
const toMin = (hm: string) => { const [h, m] = hm.split(':').map(Number); return h * 60 + m; };
/** 依「營隊當天」與現在時間找出進行中的時段；非營隊日回傳 -1 */
export function currentSlot(now: Date, dateISO: string = CAMP.dateISO): number {
  const tw = new Date(now.getTime() + 8 * 3600_000); // 換成臺灣時間的 UTC 欄位
  const d = tw.toISOString().slice(0, 10);
  if (d !== dateISO) return -1;
  const m = tw.getUTCHours() * 60 + tw.getUTCMinutes();
  return SCHEDULE.findIndex((s) => m >= toMin(s.start) && m < toMin(s.end));
}

// ---------- 產業鏈（依 0709 活動簡報整理） ----------
export interface ChainNode { id: string; stage: 'up' | 'mid' | 'down' | 'end'; name: string; desc: string; examples: string; camp?: string }
export const CHAIN: ChainNode[] = [
  { id: 'eda', stage: 'up', name: 'EDA 與 IP', desc: '畫晶片要用的設計軟體，以及可以買來直接用的電路模組（矽智財）。', examples: 'Synopsys、Cadence、力旺、M31' },
  { id: 'design', stage: 'up', name: 'IC 設計', desc: '決定晶片要做什麼、用哪些邏輯閘組起來，最後交出電路佈局圖（光罩圖）。', examples: '聯發科、瑞昱、聯詠、義隆', camp: '下午關卡一：用邏輯閘做密碼鎖，就是最小的 IC 設計' },
  { id: 'mask', stage: 'mid', name: '光罩與材料', desc: '把設計圖做成光罩；矽晶圓、化學品、氣體等材料也在這一段。', examples: '光罩公司、矽晶圓、特用化學' },
  { id: 'fab', stage: 'mid', name: '晶圓製造（晶圓代工）', desc: '在潔淨室裡重複「薄膜沉積 → 黃光微影 → 蝕刻 → 摻雜」幾百道步驟，把電晶體做在晶圓上。', examples: '台積電、聯電、世界先進', camp: '上午 5F 擬真製程、製程尋寶四站' },
  { id: 'mem', stage: 'mid', name: '記憶體', desc: '專門做 DRAM、Flash 等儲存資料的晶片。', examples: '南亞科、華邦電、旺宏' },
  { id: 'test', stage: 'down', name: '晶圓測試（CP）', desc: '用探針台把針放到每顆晶粒的金屬墊上量電性，先把壞的標出來，省下後面封裝的錢。', examples: '京元電、欣銓、矽格', camp: '上午 5F 微動探針台下針量測' },
  { id: 'pkg', stage: 'down', name: '切割與封裝', desc: '把晶圓切成一顆顆晶粒，黏到基板、打線或覆晶，再包起來保護。', examples: '日月光、矽品、力成', camp: '上午 6F 潔淨室晶圓切割' },
  { id: 'ft', stage: 'down', name: '成品測試（FT）', desc: '封裝好的晶片再測一次功能與可靠度，合格才出貨。', examples: '京元電、致茂（測試設備）' },
  { id: 'app', stage: 'end', name: '終端應用', desc: '手機、AI 伺服器、車用、智慧家電……晶片加上感測器與程式，才變成會思考、會反應的產品。', examples: '手機、AI 伺服器、智慧家庭', camp: '下午關卡二：光控小夜燈與拍手開關' },
];
export const STAGES = [
  { id: 'up', name: '上游', sub: '設計' },
  { id: 'mid', name: '中游', sub: '製造' },
  { id: 'down', name: '下游', sub: '封測' },
  { id: 'end', name: '終端', sub: '應用' },
] as const;

/** 南部半導體 S 廊帶（依 0709 活動簡報） */
export const S_CORRIDOR = [
  { id: 'tainan', name: '南部科學園區（臺南）', note: '晶圓代工先進製程重鎮', x: 22, y: 10 },
  { id: 'luzhu', name: '路竹科學園區', note: '記憶體與光電產業', x: 32, y: 30 },
  { id: 'qiaotou', name: '橋頭科學園區', note: '新興半導體與創新科技聚落', x: 36, y: 44 },
  { id: 'nanzi', name: '楠梓（加工區、中油舊址）', note: '封測大廠聚落；舊煉油廠址轉型為先進製程晶圓廠', x: 34, y: 62 },
  { id: 'isu', name: '義守大學', note: '你今天在這裡！', x: 58, y: 52, me: true },
];
