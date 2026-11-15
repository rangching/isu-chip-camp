export const LEVELS = [
  { min: 0, name: '晶圓新鮮人', en: 'WAFER' },
  { min: 120, name: '製程實習生', en: 'FAB INTERN' },
  { min: 300, name: '量測工程師', en: 'TEST ENGINEER' },
  { min: 520, name: 'IC 設計師', en: 'IC DESIGNER' },
  { min: 760, name: '晶片解密大師', en: 'CHIP MASTER' },
];

export function levelOf(xp: number) {
  let index = 0;
  for (let i = 0; i < LEVELS.length; i++) if (xp >= LEVELS[i].min) index = i;
  const cur = LEVELS[index];
  const next = LEVELS[index + 1];
  const into = xp - cur.min;
  const span = next ? next.min - cur.min : 1;
  return { index, name: cur.name, en: cur.en, nextName: next?.name ?? null, into, span, pct: next ? Math.min(1, into / span) : 1, toNext: next ? next.min - xp : 0 };
}
