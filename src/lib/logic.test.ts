import { describe, expect, it } from 'vitest';
import { ClapDetector, bitsToDec, cds, decToBits, diesPerWafer, firstWrong, gate, lockLogic, nightLight, normalize, PROCESS_STEPS, poissonYield, truthTable } from './logic';
import { PRACTICE, PRACTICE_CODE, STATIONS, checkStation, decodeConfig, encodeConfig, makeConfig, configFromHash } from './campConfig';
import { CALCULATORS, evaluate } from './formula';
import { currentSlot, SCHEDULE } from '../data/camp';
import { LEARN } from '../data/learn';
import { BADGES } from '../features/progress/badges';
import { SERIES } from '../data/media';
import fs from 'node:fs';

describe('文字正規化', () => {
  it('全形、大小寫、空白都視為相同', () => {
    expect(normalize(' Ｓｉ Ｏ２ ')).toBe('sio2');
    expect(normalize('光　罩')).toBe('光罩');
  });
});

describe('邏輯閘', () => {
  it('真值表正確', () => {
    expect(truthTable('AND').map((r) => r.y)).toEqual([0, 0, 0, 1]);
    expect(truthTable('OR').map((r) => r.y)).toEqual([0, 1, 1, 1]);
    expect(truthTable('XOR').map((r) => r.y)).toEqual([0, 1, 1, 0]);
    expect(truthTable('NOT').map((r) => r.y)).toEqual([1, 0]);
    expect(gate('NAND', 1, 1)).toBe(0);
  });
  it('二進位轉換', () => {
    expect(bitsToDec([1, 0, 1, 1])).toBe(11);
    expect(decToBits(11)).toEqual([1, 0, 1, 1]);
    for (let n = 0; n < 16; n++) expect(bitsToDec(decToBits(n))).toBe(n);
  });
  it('密碼鎖：XNOR 比對再 AND', () => {
    expect(lockLogic([1, 0, 1, 1], [1, 0, 1, 1])).toEqual({ match: [1, 1, 1, 1], unlock: true });
    expect(lockLogic([1, 1, 1, 1], [1, 0, 1, 1])).toEqual({ match: [1, 0, 1, 1], unlock: false });
  });
});

describe('尋寶設定', () => {
  it('練習模式：正確答案解出 1011，錯的答案回 null', () => {
    STATIONS.forEach((s, i) => expect(checkStation(PRACTICE, i, s.practiceMicro)).toBe(PRACTICE_CODE[i]));
    expect(checkStation(PRACTICE, 0, '錯誤')).toBeNull();
    expect(checkStation(PRACTICE, 0, '')).toBeNull();
  });
  it('老師設定：答案與密碼都不以明文出現在連結', () => {
    const answers = ['氮化矽', 'Mask', '電漿', '晶粒'];
    for (const code of [[0, 0, 0, 0], [1, 1, 1, 1], [0, 1, 1, 0]] as (0 | 1)[][]) {
      const c = makeConfig(answers, code, { salt: 'abc123', label: '測試' });
      const s = encodeConfig(c);
      const back = decodeConfig(s)!;
      expect(back.h).toEqual(c.h);
      answers.forEach((a, i) => expect(checkStation(back, i, a)).toBe(code[i]));
      expect(checkStation(back, 1, 'ｍａｓｋ')).toBe(code[1]);
      const raw = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
      expect(raw).not.toContain('Mask');
    }
  });
  it('從網址片段讀設定', () => {
    const c = makeConfig(['a', 'b', 'c', 'd'], [1, 0, 0, 1], { salt: 's' });
    expect(configFromHash(`#hunt&cfg=${encodeConfig(c)}`)?.salt).toBe('s');
    expect(configFromHash('#cfg=壞掉')).toBeNull();
    expect(decodeConfig('xxx')).toBeNull();
  });
});

describe('感測器', () => {
  it('CdS：越亮讀值越大', () => {
    const lo = cds(1).adc, mid = cds(100).adc, hi = cds(3000).adc;
    expect(lo).toBeLessThan(mid);
    expect(mid).toBeLessThan(hi);
    expect(hi).toBeLessThanOrEqual(1023);
  });
  it('小夜燈遲滯：中間區間維持原狀', () => {
    expect(nightLight(200, false, 300, 400)).toBe(true);
    expect(nightLight(350, true, 300, 400)).toBe(true);
    expect(nightLight(350, false, 300, 400)).toBe(false);
    expect(nightLight(450, true, 300, 400)).toBe(false);
  });
  it('拍手：冷卻時間內不重複觸發', () => {
    const d = new ClapDetector(0.3, 400);
    expect(d.feed(0.8, 0)).toBe(true);
    expect(d.feed(0.8, 100)).toBe(false);
    expect(d.feed(0.1, 600)).toBe(false);
    expect(d.feed(0.5, 600)).toBe(true);
    expect(d.on).toBe(false);
  });
});

describe('製程與良率', () => {
  it('排序檢查', () => {
    const ok = PROCESS_STEPS.map((s) => s.id);
    expect(firstWrong(ok)).toBe(-1);
    expect(firstWrong(['clean', 'coat'])).toBe(1);
  });
  it('晶粒數與良率公式和計算器一致', () => {
    expect(diesPerWafer(300, 100)).toBe(640);
    const out = evaluate(CALCULATORS.dies.outputs[0].node, { d: 300, A: 100, Y: 85 });
    expect(out).toBe(640);
    expect(evaluate(CALCULATORS.defect.outputs[0].node, { D: 0.1, A: 1 })).toBeCloseTo(poissonYield(0.1, 1));
    expect(() => evaluate({ op: 'div', args: [1, 0] }, {})).toThrow();
  });
});

describe('營隊資料', () => {
  it('營隊當天依臺灣時間找到時段', () => {
    expect(currentSlot(new Date('2027-01-28T02:15:00Z'))).toBe(SCHEDULE.findIndex((s) => s.start === '10:00'));
    expect(currentSlot(new Date('2027-01-27T02:15:00Z'))).toBe(-1);
  });
  it('測驗答案索引都有效', () => {
    for (const [, l] of Object.entries(LEARN)) for (const q of l.quiz) expect(q.answer).toBeLessThan(q.options.length);
  });
  it('每枚任務徽章都對應一個有內容的任務', () => {
    for (const b of BADGES.filter((x) => x.mission)) expect(['industry', 'hunt', 'process', 'probe', 'cleanroom', 'logic', 'lock', 'sensors', 'portfolio']).toContain(b.mission);
  });
  it('影片與 3D 檔案都存在', () => {
    for (const u of Object.values(SERIES)) {
      if (u.intro) expect(fs.existsSync(`public/media/intro-${u.id}.mp4`), u.id).toBe(true);
      if (u.demo) expect(fs.existsSync(`public/media/demo-${u.id}.mp4`), u.id).toBe(true);
      if (u.vertical) expect(fs.existsSync(`public/media/v-${u.id}.mp4`), u.id).toBe(true);
      if (u.lab) expect(fs.existsSync(`public/labs/series/${u.id}.html`), u.id).toBe(true);
    }
  });
});
