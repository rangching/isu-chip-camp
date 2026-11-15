// solver 單元測試：node labs/probe_station/test_node.mjs
// 驗：缺陷分布固定（同種子同結果、邊緣較多不良）、接觸判定、I-V 判讀、判定規則、良率計算、postMessage 格式
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
const HERE = path.dirname(fileURLToPath(import.meta.url))
const load = () => new Function(fs.readFileSync(path.join(HERE, 'solver.js'), 'utf8') + '\nreturn PS')()
const PS = load(), P = PS.P
let n = 0; const fails = []
const ok = (cond, msg) => { n++; if (!cond) fails.push(msg) }
const near = (a, b, tol, msg) => ok(Math.abs(a - b) <= tol, `${msg}: ${a} vs ${b}`)

// ── 1. 晶圓與缺陷分布固定
near(P.waferD, 150, 0, '6 吋晶圓＝150 mm'); near(P.R * 2, P.waferD, 0, '半徑×2＝直徑')
ok(PS.DIES.length === 61, `完整晶粒 61 顆（實得 ${PS.DIES.length}）`)
const sig = (D) => D.map((d) => `${d.name}:${d.type}:${d.R}:${d.off.join(',')}`).join('|')
ok(sig(PS.DIES) === sig(load().DIES), '重新載入後缺陷分布完全相同')
ok(sig(PS.buildDies(P.seed)) === sig(PS.DIES), '同種子重算結果相同')
ok(sig(PS.buildDies(P.seed + 1)) !== sig(PS.DIES), '換種子會不同（確認種子有作用）')
const cnt = {}; for (const d of PS.DIES) cnt[d.type] = (cnt[d.type] || 0) + 1
ok(JSON.stringify(cnt) === JSON.stringify({ high: 5, open: 6, good: 42, low: 3, short: 5 }), `類型數量固定：${JSON.stringify(cnt)}`)
for (const t of ['open', 'short', 'high', 'low']) ok((cnt[t] || 0) >= 2, `${t} 至少 2 顆`)
const bad = (L) => L.filter((d) => d.type !== 'good').length / L.length
const inner = PS.DIES.filter((d) => d.rn <= 0.6), outer = PS.DIES.filter((d) => d.rn > 0.8)
ok(bad(outer) > 2 * bad(inner), `邊緣不良率（${bad(outer).toFixed(2)}）明顯高於中心（${bad(inner).toFixed(2)}）`)
const ctr = PS.DIES.find((d) => d.i === 0 && d.j === 0)
ok(ctr.type === 'good' && ctr.name === 'E5' && ctr.off[0] === 0, '中心晶粒 E5 是良品且無歪斜')
for (const d of PS.DIES) {
  if (d.type === 'good') ok(d.R >= 930 && d.R <= 1070, `${d.name} 良品阻值在規格內`)
  if (d.type === 'high') ok(d.R > P.specHi * 1.1, `${d.name} 偏高明顯超規`)
  if (d.type === 'low') ok(d.R < P.specLo * 0.9, `${d.name} 偏低明顯超規`)
  ok(Math.abs(d.off[0]) <= 20 && Math.abs(d.off[1]) <= 20, `${d.name} 歪斜在 ±20 µm 內`)
}
ok(PS.dieAt(0, 0) === ctr.id && PS.dieAt(6.9, -6.9) === ctr.id, 'dieAt 找到中心晶粒')
ok(PS.dieAt(74, 74) === -1, 'dieAt 晶圓外回傳 −1')

// ── 2. 接觸判定
const pc = PS.padCenters(ctr).A
const st = (x, y, z) => PS.contact({ x, y, z }, pc).state
ok(st(-300, 0, 30) === 'air', '在 pad 上方懸空')
ok(st(-300, 0, 0) === 'touch' && st(-300, 0, -5) === 'touch', '剛碰到（下壓 < 10 µm）＝接觸不穩')
ok(st(-300, 0, -10) === 'good' && st(-300, 0, -25) === 'good' && st(-300, 0, -35) === 'good', '下壓 10～35 µm＝良好接觸')
ok(st(-300, 0, -40) === 'scratch', '下壓 > 35 µm＝針壓過大')
ok(st(-450, 0, -20) === 'off', '沒對準 pad＝落在保護層')
ok(st(-300 + 72, 0, -20) === 'good' && st(-300 + 73, 0, -20) === 'off', 'pad 邊緣 8 µm 內不算對準')
const dd = PS.DIES.find((d) => d.off[0] !== 0)
ok(PS.padCenters(dd).A[0] === -300 + dd.off[0], 'pad 中心含晶粒歪斜')
// 移動事件
let m = PS.applyMove({ x: -300, y: 0, z: 5 }, { dz: -10 }, pc); ok(m.event === 'land' && m.tip.z === -5, '下降碰到表面＝land')
m = PS.applyMove({ x: -300, y: 0, z: -30 }, { dz: -10 }, pc); ok(m.event === 'scratch-press', '再壓下去＝scratch-press')
m = PS.applyMove({ x: -300, y: 0, z: -20 }, { dx: 10 }, pc); ok(m.event === 'scratch-drag' && m.tip.z === -20 && m.tip.x === -290, '壓著橫移＝scratch-drag')
m = PS.applyMove({ x: -300, y: 0, z: 20 }, { dx: 10 }, pc); ok(m.event === null, '懸空橫移沒事')
m = PS.applyMove({ x: 0, y: 0, z: P.zMin }, { dz: -25 }, pc); ok(m.tip.z === P.zMin, 'Z 有下限')

// ── 3. I-V 判讀
const find = (t) => PS.DIES.find((d) => d.type === t)
const meas = (d, a = 'good', b = 'good', s = 1) => PS.classify(PS.measureIV(d, a, b, s))
const g = find('good'), r1 = meas(g)
ok(r1.kind === 'pass' && Math.abs(r1.R - g.R) / g.R < 0.01, `良品 + 良好接觸 → 合規，R≈${g.R}（得 ${r1.R.toFixed(1)}）`)
ok(meas(find('open')).kind === 'open', '開路晶粒 → 開路')
ok(meas(find('short')).kind === 'short', '短路晶粒 → 短路（撞限流）')
ok(meas(find('high')).kind === 'high', '偏高晶粒 → high')
ok(meas(find('low')).kind === 'low', '偏低晶粒 → low')
ok(meas(g, 'off', 'good').kind === 'open' && meas(g, 'air', 'good').kind === 'open', '沒對準或懸空就量 → 開路')
ok(meas(g, 'scratch', 'good').kind === 'pass', '刮傷但接觸仍導通 → 量得到')
const rt = meas(g, 'touch', 'good', 3); ok(rt.R > g.R + 100, `接觸不穩 → 量到的電阻偏大（${rt.R.toFixed(0)} Ω）`)
const iv = PS.measureIV(g, 'good', 'good', 1); ok(iv.V.length === P.nPts && iv.V[0] === -1 && iv.V[P.nPts - 1] === 1, '掃 −1～+1 V')
ok(Math.max(...PS.measureIV(find('short'), 'good', 'good').I.map(Math.abs)) <= P.Icomp, '電流不超過限流 5 mA')
ok(JSON.stringify(PS.measureIV(g, 'good', 'good', 7)) === JSON.stringify(PS.measureIV(g, 'good', 'good', 7)), '同種子雜訊相同')
for (const d of PS.DIES) { const k = meas(d).kind; ok((k === 'pass') === (d.type === 'good'), `${d.name} 良好接觸時判讀與真相一致（${k}/${d.type}）`) }

// ── 4. 判定規則與良率
ok(PS.isCorrect(g, true) && !PS.isCorrect(g, false), '良品判良品＝對')
ok(PS.isCorrect(find('open'), false) && !PS.isCorrect(find('short'), true), '不良判不良＝對')
let s0 = PS.stats({}); ok(s0.tested === 0 && s0.yield === 0 && !s0.done, '沒測時良率 0')
const res = { 1: { good: true, correct: true }, 2: { good: true, correct: false }, 3: { good: false, correct: true }, 4: { good: true, correct: true } }
let s1 = PS.stats(res, 2)
ok(s1.tested === 4 && s1.goodN === 3 && s1.correct === 3, '已測 4、判良 3、判對 3')
near(s1.yield, 0.75, 1e-12, '良率＝良品數／已測數'); near(s1.score, 10 * 3 - 5 * 2, 0, '分數＝10×判對 − 5×刮傷')
const six = {}; for (let k = 0; k < 6; k++) six[k] = { good: k % 2 === 0, correct: true }
ok(PS.stats(six).done && !PS.stats({ ...six, 5: { good: false, correct: false } }).done, '正確判定 ≥ 6 顆才完成')
// ── 5. postMessage 格式
const msg = PS.message('progress', PS.stats({ 1: { good: true, correct: true }, 2: { good: false, correct: true }, 3: { good: true, correct: false } }, 1))
ok(msg.source === 'chip-camp-lab' && msg.lab === 'probe_station' && msg.event === 'progress', '訊息標頭')
ok(JSON.stringify(Object.keys(msg.data)) === JSON.stringify(['tested', 'correct', 'yield', 'scratches']), '訊息欄位')
ok(msg.data.tested === 3 && msg.data.correct === 2 && msg.data.yield === 0.667 && msg.data.scratches === 1, `訊息數值 ${JSON.stringify(msg.data)}`)

console.log(`solver 測試：${n - fails.length}/${n} 通過`)
if (fails.length) { console.log('失敗：\n  ' + fails.join('\n  ')); process.exit(1) }
