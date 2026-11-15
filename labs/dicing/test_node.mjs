// solver 單元測試：node labs/dicing/test_node.mjs
import D from './solver.js'

let pass = 0, fail = 0
const ok = (cond, name, info = '') => { if (cond) { pass++; console.log('  ✓', name) } else { fail++; console.log('  ✗', name, info) } }
const A0 = { dx: 0, dy: 0, dth: 0 }
const SEED = 3
const ev = (o, al = A0) => D.evaluate({ rpm: 30000, feed: 30, depth: 560, ...o }, al, SEED)

console.log('— 幾何與基本量')
ok(D.DIES.length > 200 && D.DIES.length < 320, `完整晶粒數合理（${D.DIES.length} 顆，5 mm 晶粒、100 mm 晶圓）`)
ok(D.STREETS.length === 19, `每個方向 19 道切割道（${D.STREETS.length}）`)
ok(Math.abs(D.feedPerRev(30, 30000) - 60) < 1e-9, '每轉進給：30 mm/s ÷ 500 轉/s = 60 µm/轉')

console.log('— 崩邊趨勢')
const c = (f, r) => D.chipTypical(f, r, 560)
ok(c(10, 30000) < c(30, 30000) && c(30, 30000) < c(60, 30000) && c(60, 30000) < c(80, 30000), '進給越快，崩邊越大')
ok(c(40, 40000) < c(40, 30000) && c(40, 30000) < c(40, 20000), '轉速越高，崩邊越小')
ok(Math.abs(c(20, 20000) - c(40, 40000)) < 1e-9, '只看「進給／轉速」比（每轉進給量）')
ok(c(30, 30000) > 5 && c(30, 30000) < 20, `中等參數典型崩邊在 5～20 µm（${c(30, 30000).toFixed(1)} µm）`)
ok(D.chipTypical(30, 30000, 530) > D.chipTypical(30, 30000, 560), '只切到晶圓底（沒進膠帶）時背崩變大')
const yS = [10, 30, 50, 70].map((f) => ev({ feed: f }).yield)
ok(yS.every((y, k) => k === 0 || y <= yS[k - 1]), `良率隨進給速度下降（${yS.map((y) => (y * 100).toFixed(1)).join(' → ')} %）`)
ok(ev({ feed: 60, rpm: 40000 }).yield > ev({ feed: 60, rpm: 20000 }).yield, '同樣進給，轉速高的良率較好')

console.log('— 對位偏移會切到晶粒')
const r0 = ev({}), r20 = ev({}, { dx: 0, dy: 20, dth: 0 }), r40 = ev({}, { dx: 0, dy: 40, dth: 0 })
ok(r0.yield >= 0.95, `對準時良率高（${(r0.yield * 100).toFixed(1)} %）`)
ok(r20.yield <= r0.yield && r40.yield < 0.2, `偏 40 µm（超過餘裕 35 µm）大量報廢（${(r40.yield * 100).toFixed(1)} %）`)
ok(r40.nOff > r40.nChip, `偏太多時主要原因是「切偏」（切偏 ${r40.nOff}、崩邊 ${r40.nChip}）`)
const bad = r40.dies.find((d) => !d.good)
ok(bad && bad.margin < 0, `被切偏的晶粒餘裕為負（${bad && bad.margin.toFixed(1)} µm）`)
const rx = ev({}, { dx: -40, dy: 0, dth: 0 })
ok(rx.nOff > 100, 'X 方向偏移一樣會切到晶粒（第 2 方向）')

console.log('— 角度誤差累積到遠端')
const th = { dx: 0, dy: 0, dth: 0.04 }
const e0 = Math.abs(D.offset1(th, 0)), eFar = Math.abs(D.offset1(th, 45))
ok(e0 < 1e-9 && eFar > 25, `θ 0.04°：中心偏 ${e0.toFixed(1)} µm、45 mm 外偏 ${eFar.toFixed(1)} µm`)
const rt = ev({}, th)
const near = rt.dies.filter((d) => Math.hypot(d.xc, d.yc) < 20), far = rt.dies.filter((d) => Math.hypot(d.xc, d.yc) > 35)
const yNear = near.filter((d) => d.good).length / near.length, yFar = far.filter((d) => d.good).length / far.length
ok(yFar < yNear, `遠端良率較低（中心 ${(yNear * 100).toFixed(0)} %、遠端 ${(yFar * 100).toFixed(0)} %）`)
const ar = D.alignReadout(th)
ok(Math.abs(ar.left + ar.right) < 1e-9 && Math.abs(ar.left - ar.right) > 40, `左右標記看到的偏移相反（${ar.left.toFixed(1)}、${ar.right.toFixed(1)} µm）`)
ok(D.alignReadout(A0).good && !D.alignReadout({ dx: 0, dy: 8, dth: 0 }).good, '對位完成判定（≤ 5 µm、≤ 0.006°）')

console.log('— 深度判定')
const st = (d) => D.depthStatus(d).status
ok(st(500) === 'shallow' && st(530) === 'edge' && st(560) === 'ok' && st(600) === 'deep' && st(620) === 'tapeCut', '太淺／剛到底／正確／偏深／切斷膠帶')
ok(ev({ depth: 500 }).yield === 0 && !ev({ depth: 500 }).separated, '沒切穿：晶粒沒分開，良率 0')
ok(ev({ depth: 640 }).yield === 0 && ev({ depth: 640 }).status === 'tapeCut', '切斷膠帶：晶粒散落，良率 0')
ok(!ev({ depth: 600 }).complete && ev({ depth: 600 }).yield >= 0.9, '偏深：良率高但深度不對，不算完成')
ok(ev({ depth: 560 }).complete, '深度正確＋良率 ≥ 90%：完成')

console.log('— 良率與時間')
const t30 = D.cutTime(30), t60 = D.cutTime(60)
const manual = 2 * D.STREETS.reduce((a, s) => a + s.len / 30 + D.P.tPass, 0) + D.P.tRotate
ok(Math.abs(t30.seconds - manual) < 1e-9, `時間＝Σ(長度／進給＋換道)×2＋轉向（${t30.seconds.toFixed(1)} s）`)
ok(t30.seconds > 100 && t30.seconds < 200, '30 mm/s 約 2～3 分鐘')
const fixed = 2 * D.STREETS.length * D.P.tPass + D.P.tRotate
ok(Math.abs((t30.seconds - fixed) / (t60.seconds - fixed) - 2) < 1e-9, '進給加倍，切割段時間減半')
ok(r0.yield === r0.good / r0.total && r0.good <= r0.total, '良率＝好晶粒／完整晶粒')
ok(r0.maxChip >= r0.typChip, '最大崩邊 ≥ 典型崩邊')
const again = ev({})
ok(again.good === r0.good && again.maxChip === r0.maxChip, '同一片晶圓（同種子）結果可重現')
const cv = D.curve({ rpm: 30000, depth: 560 }, A0, SEED)
ok(cv.length === 31 && cv[0].seconds > cv[30].seconds && cv[0].yield >= cv[30].yield, '速度 vs 良率曲線：越快時間越短、良率越低')
ok(D.hints(ev({ feed: 70 }), A0).some((h) => h.includes('崩邊')), '崩邊太大時會建議降進給或提高轉速')
ok(D.hints(r40, { dx: 0, dy: 40, dth: 0 }).some((h) => h.includes('對位')), '切偏時會建議重新對位')

console.log(`\n${fail === 0 ? '全部通過' : '有失敗'}：${pass} 通過，${fail} 失敗`)
process.exit(fail ? 1 : 0)
