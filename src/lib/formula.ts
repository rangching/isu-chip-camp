// JSON 公式引擎：移植自「半導體物理及元件」3D IC 互動教材 app.js 的 evaluateCalculatorFormula。
// 公式寫成資料（不用 eval），計算器的輸入框也由資料產生。

export type FNode =
  | number
  | { input: string }
  | { const: number }
  | { op: 'add' | 'sub' | 'mul' | 'div' | 'pow' | 'exp' | 'log' | 'sqrt' | 'ceil' | 'floor' | 'abs'; args: FNode[] };

export function evaluate(node: FNode, inputs: Record<string, number>, depth = 0): number {
  if (depth > 24) throw new Error('計算式巢狀層級過深');
  if (typeof node === 'number') return node;
  if ('input' in node) {
    const v = inputs[node.input];
    if (!Number.isFinite(v)) throw new Error(`輸入 ${node.input} 不是有效數值`);
    return v;
  }
  if ('const' in node) return node.const;
  const a = node.args.map((x) => evaluate(x, inputs, depth + 1));
  let r: number;
  switch (node.op) {
    case 'add': r = a.reduce((s, v) => s + v, 0); break;
    case 'mul': r = a.reduce((s, v) => s * v, 1); break;
    case 'sub': if (a.length !== 2) throw new Error('sub 需要兩個參數'); r = a[0] - a[1]; break;
    case 'div': if (a.length !== 2 || a[1] === 0) throw new Error('分母不可為 0'); r = a[0] / a[1]; break;
    case 'pow': r = Math.pow(a[0], a[1]); break;
    case 'exp': r = Math.exp(a[0]); break;
    case 'log': r = Math.log(a[0]); break;
    case 'sqrt': r = Math.sqrt(a[0]); break;
    case 'ceil': r = Math.ceil(a[0]); break;
    case 'floor': r = Math.floor(a[0]); break;
    case 'abs': r = Math.abs(a[0]); break;
  }
  if (!Number.isFinite(r)) throw new Error('計算結果超出範圍');
  return r;
}

export interface CalcInput { id: string; label: string; unit: string; min: number; max: number; step: number; value: number }
export interface Calculator {
  id: string;
  title: string;
  formula: string; // 給人看的式子
  inputs: CalcInput[];
  outputs: { label: string; unit: string; node: FNode; digits: number; pct?: boolean }[];
  note: string;
}

const I = (input: string) => ({ input });

/** 營隊用的計算器 */
export const CALCULATORS: Record<string, Calculator> = {
  dies: {
    id: 'dies',
    title: '一片晶圓能切出幾顆晶片？',
    formula: '晶粒數 ≈ π(d/2)² ÷ A − πd ÷ √(2A)　；　良品數 ≈ 晶粒數 × 良率',
    inputs: [
      { id: 'd', label: '晶圓直徑 d', unit: 'mm', min: 100, max: 300, step: 50, value: 300 },
      { id: 'A', label: '晶粒面積 A', unit: 'mm²', min: 10, max: 800, step: 10, value: 100 },
      { id: 'Y', label: '良率', unit: '%', min: 10, max: 100, step: 1, value: 85 },
    ],
    outputs: [
      {
        label: '可切晶粒數', unit: '顆', digits: 0,
        node: { op: 'floor', args: [{ op: 'sub', args: [
          { op: 'div', args: [{ op: 'mul', args: [Math.PI, { op: 'pow', args: [{ op: 'div', args: [I('d'), 2] }, 2] }] }, I('A')] },
          { op: 'div', args: [{ op: 'mul', args: [Math.PI, I('d')] }, { op: 'sqrt', args: [{ op: 'mul', args: [2, I('A')] }] }] },
        ] }] },
      },
      {
        label: '預估良品', unit: '顆', digits: 0,
        node: { op: 'floor', args: [{ op: 'mul', args: [{ op: 'div', args: [I('Y'), 100] }, { op: 'sub', args: [
          { op: 'div', args: [{ op: 'mul', args: [Math.PI, { op: 'pow', args: [{ op: 'div', args: [I('d'), 2] }, 2] }] }, I('A')] },
          { op: 'div', args: [{ op: 'mul', args: [Math.PI, I('d')] }, { op: 'sqrt', args: [{ op: 'mul', args: [2, I('A')] }] }] },
        ] }] }] },
      },
    ],
    note: '晶圓越大、晶粒越小，一片能切的越多；邊緣切不完整的晶粒會被扣掉。手機處理器的晶粒大約 100 mm² 上下（示意）。',
  },
  defect: {
    id: 'defect',
    title: '灰塵對良率有多大影響？',
    formula: '良率 Y = e^(−D × A)　（D：每 cm² 的缺陷數，A：晶粒面積 cm²）',
    inputs: [
      { id: 'D', label: '缺陷密度 D', unit: '個/cm²', min: 0.01, max: 2, step: 0.01, value: 0.1 },
      { id: 'A', label: '晶粒面積 A', unit: 'cm²', min: 0.1, max: 8, step: 0.1, value: 1 },
    ],
    outputs: [
      { label: '良率', unit: '%', digits: 1, pct: true, node: { op: 'exp', args: [{ op: 'mul', args: [-1, I('D'), I('A')] }] } },
    ],
    note: '把 D 調大（潔淨室變髒）或把 A 調大（晶片變大），良率都會掉得很快——這就是潔淨室要這麼乾淨的原因。',
  },
};
