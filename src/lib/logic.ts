// 網站上所有「會算答案」的純函式，集中在這裡方便單元測試。

// ---------- 文字正規化與雜湊 ----------
/** 全形轉半形、去空白、轉小寫：讓「Ｓｉ」「si 」「SI」都算同一個答案 */
export function normalize(s: string): string {
  return s
    .replace(/[！-～]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    .replace(/　/g, ' ')
    .replace(/[\s·・\-_.,，。]/g, '')
    .toLowerCase();
}

/** FNV-1a 32 位元雜湊（同步、夠用來把答案藏起來，不是加密） */
export function fnv1a(s: string): number {
  let h = 0x811c9dc5;
  for (const ch of s) {
    const cp = ch.codePointAt(0)!;
    h ^= cp & 0xff; h = Math.imul(h, 0x01000193);
    h ^= (cp >>> 8) & 0xff; h = Math.imul(h, 0x01000193);
    h ^= (cp >>> 16) & 0xff; h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}
export const answerHash = (salt: string, answer: string) => fnv1a(`${salt}|${normalize(answer)}`).toString(36);

// ---------- 邏輯閘 ----------
export type Gate = 'AND' | 'OR' | 'NOT' | 'NAND' | 'NOR' | 'XOR';
export function gate(g: Gate, a: 0 | 1, b: 0 | 1 = 0): 0 | 1 {
  switch (g) {
    case 'AND': return (a & b) as 0 | 1;
    case 'OR': return (a | b) as 0 | 1;
    case 'NOT': return (a ? 0 : 1);
    case 'NAND': return (a & b ? 0 : 1);
    case 'NOR': return (a | b ? 0 : 1);
    case 'XOR': return (a ^ b) as 0 | 1;
  }
}
export function truthTable(g: Gate): { a: 0 | 1; b: 0 | 1; y: 0 | 1 }[] {
  const rows: { a: 0 | 1; b: 0 | 1; y: 0 | 1 }[] = [];
  for (const a of [0, 1] as const) for (const b of (g === 'NOT' ? [0] : [0, 1]) as (0 | 1)[]) rows.push({ a, b, y: gate(g, a, b) });
  return rows;
}
/** 位元陣列（最高位在前）轉十進位 */
export const bitsToDec = (bits: (0 | 1 | boolean)[]) => bits.reduce<number>((n, b) => n * 2 + (b ? 1 : 0), 0);
export const decToBits = (n: number, width = 4) => Array.from({ length: width }, (_, i) => ((n >> (width - 1 - i)) & 1) as 0 | 1);

/**
 * 4 位元密碼鎖的組合邏輯：每一位用 XNOR 比對（相同才是 1），四個結果再 AND 起來。
 * 回傳每一位的比對結果與最後是否解鎖。
 */
export function lockLogic(sw: (0 | 1)[], code: (0 | 1)[]) {
  const match = sw.map((s, i) => (s === code[i] ? 1 : 0) as 0 | 1);
  const unlock = match.every((m) => m === 1);
  return { match, unlock };
}

// ---------- 光敏電阻 CdS 分壓 ----------
/**
 * 光敏電阻在上、固定電阻在下（接地）：越亮 → CdS 電阻越小 → 中點電壓越高。
 * R_cds ≈ R10 × (lux/10)^(−γ)，γ≈0.7（常見 GL55 系列的示意值）。
 */
export function cds(lux: number, rFixed = 10_000, r10 = 20_000, gamma = 0.7, vcc = 5) {
  const L = Math.max(0.1, lux);
  const rCds = r10 * Math.pow(L / 10, -gamma);
  const v = (vcc * rFixed) / (rCds + rFixed);
  const adc = Math.round((v / vcc) * 1023);
  return { rCds, v, adc };
}

/** 有遲滯的小夜燈：暗於 onBelow 開燈、亮於 offAbove 才關燈；中間維持原狀，避免燈一直閃 */
export function nightLight(adc: number, wasOn: boolean, onBelow: number, offAbove: number): boolean {
  if (adc < onBelow) return true;
  if (adc > offAbove) return false;
  return wasOn;
}

// ---------- 拍手偵測 ----------
/** 音量超過門檻且距離上次觸發超過 refractoryMs 才算一次拍手；每拍一次切換燈 */
export class ClapDetector {
  last = -Infinity;
  on = false;
  constructor(public threshold: number, public refractoryMs: number) {}
  feed(level: number, t: number): boolean {
    if (level >= this.threshold && t - this.last >= this.refractoryMs) {
      this.last = t;
      this.on = !this.on;
      return true;
    }
    return false;
  }
}

/** 由時域取樣算音量（RMS，0～1） */
export function rms(samples: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < samples.length; i++) s += samples[i] * samples[i];
  return samples.length ? Math.sqrt(s / samples.length) : 0;
}

// ---------- 製程順序 ----------
export const PROCESS_STEPS = [
  { id: 'clean', name: '晶圓清洗', short: '清洗' },
  { id: 'oxide', name: '熱氧化（長出 SiO₂）', short: '氧化' },
  { id: 'coat', name: '塗佈光阻', short: '塗光阻' },
  { id: 'expose', name: '曝光（透過光罩照光）', short: '曝光' },
  { id: 'develop', name: '顯影（洗掉照到光的光阻）', short: '顯影' },
  { id: 'etch', name: '蝕刻（挖掉沒被光阻保護的氧化層）', short: '蝕刻' },
  { id: 'strip', name: '去光阻', short: '去光阻' },
  { id: 'metal', name: '金屬沉積（鋪上導線）', short: '金屬' },
] as const;
export type StepId = (typeof PROCESS_STEPS)[number]['id'];
/** 回傳第一個放錯的位置；全對回傳 −1 */
export function firstWrong(order: string[], correct: readonly string[] = PROCESS_STEPS.map((s) => s.id)): number {
  for (let i = 0; i < correct.length; i++) if (order[i] !== correct[i]) return i;
  return order.length === correct.length ? -1 : order.length;
}

export const GOWN_STEPS = [
  { id: 'cap', name: '髮帽', why: '頭髮與頭皮屑是大顆粒來源，最先包起來。' },
  { id: 'mask', name: '口罩', why: '擋住講話、呼吸帶出的飛沫。' },
  { id: 'hood', name: '頭套', why: '從頭包到肩膀，蓋住髮帽與脖子。' },
  { id: 'suit', name: '無塵連身衣', why: '從上往下穿，衣服不碰地，袖口與領口收緊。' },
  { id: 'boots', name: '無塵鞋套', why: '最後處理腳，避免把地上的灰塵帶到身上。' },
  { id: 'gloves', name: '手套', why: '最後戴，手套才不會在穿衣時被弄髒。' },
  { id: 'shower', name: '空氣浴', why: '高速潔淨空氣把身上殘留的微粒吹掉，才能進潔淨室。' },
] as const;

// ---------- 良率 ----------
/** 一片晶圓大約能切出幾顆晶粒（扣掉邊緣不完整的晶粒） */
export function diesPerWafer(waferMm: number, dieAreaMm2: number) {
  const r = waferMm / 2;
  return Math.max(0, Math.floor((Math.PI * r * r) / dieAreaMm2 - (Math.PI * waferMm) / Math.sqrt(2 * dieAreaMm2)));
}
/** 卜瓦松良率模型：Y = exp(−D·A)，D 為每 cm² 缺陷數，A 為晶粒面積 cm² */
export const poissonYield = (defectPerCm2: number, dieAreaCm2: number) => Math.exp(-defectPerCm2 * dieAreaCm2);

// ---------- 二進位小遊戲 ----------
export function randomTarget(seed: number, max = 15) {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return Math.floor((x - Math.floor(x)) * (max + 1));
}
