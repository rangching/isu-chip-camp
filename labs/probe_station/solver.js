// ═══ PS：微動探針台下針量測的純函式模型（瀏覽器與 node 共用；不碰 DOM、不碰 three）═══
// 所有數值都是「示意」：6 吋晶圓＝150 mm；晶粒間距 14 mm、邊緣排除 3 mm → 61 顆完整晶粒。
// 每顆晶粒放一個 1 kΩ 電阻當測試結構，規格 900～1100 Ω；量測機（SMU）掃 −1～+1 V、限流 5 mA。
const PS = (() => {
  const P = {
    waferD: 150, R: 75, excl: 3, pitch: 14, flatHalf: 28.75, // mm（6 吋晶圓主平邊約 57.5 mm）
    Rnom: 1000, specLo: 900, specHi: 1100, // Ω
    Icomp: 5e-3, // A，量測機限流
    vMin: -1, vMax: 1, nPts: 41, // 掃描 −1～+1 V，41 點
    pad: { half: 80, ax: -300, bx: 300, y: 0, margin: 8 }, // µm：pad 160 µm 見方，中心距 600 µm；針尖要離邊緣 8 µm 以上
    od: { good: 10, max: 35 }, // µm：碰到後再下壓 10～35 µm＝良好接觸；超過 35 µm＝針壓過大
    zMin: -60, zMax: 200, zSafe: 50, xyLim: 700, // µm
    step: { xy: { coarse: 50, fine: 10 }, z: { coarse: 25, fine: 5 } },
    seed: 20260121,
    doneN: 6, // 正確判定幾顆算完成
  }
  const TYPE_ZH = { good: '良品', open: '開路', short: '短路', high: '阻值偏高（超規）', low: '阻值偏低（超規）' }
  const COLS = 'ABCDEFGHI'

  // ── 決定性亂數：mulberry32 ＋ Box–Muller
  function mulberry(seed) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let r = Math.imul(a ^ (a >>> 15), 1 | a); r = (r + Math.imul(r ^ (r >>> 7), 61 | r)) ^ r; return ((r ^ (r >>> 14)) >>> 0) / 4294967296 } }
  const gaussOf = (g) => { const u1 = Math.max(g(), 1e-12), u2 = g(); return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2) }
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x))

  // ── 晶粒格點：間距 14 mm、對齊中心；四個角都在 R−邊緣排除 內才算完整晶粒
  function grid() {
    const out = [], h = P.pitch / 2, lim = P.R - P.excl
    for (let j = 4; j >= -4; j--) for (let i = -4; i <= 4; i++) {
      const x = i * P.pitch, y = j * P.pitch
      const full = [[-1, -1], [1, -1], [-1, 1], [1, 1]].every(([sx, sy]) => Math.hypot(x + sx * h, y + sy * h) <= lim)
      out.push({ i, j, x, y, full })
    }
    return out
  }
  const dieName = (i, j) => `${COLS[i + 4]}${5 - j}` // 左上 A1，中心 E5

  // ── 缺陷分布：固定種子；越外圈越容易壞（機率 6% ＋ 55%·(r/rmax)⁴）
  function buildDies(seed = P.seed) {
    const g = mulberry(seed), cells = grid().filter((c) => c.full)
    const rmax = Math.max(...cells.map((c) => Math.hypot(c.x, c.y)))
    return cells.map((c, id) => {
      const r = Math.hypot(c.x, c.y), rn = r / rmax
      const pBad = 0.06 + 0.55 * rn ** 4
      const u = g(), u2 = g(), u3 = g(), z = gaussOf(g)
      const off = c.i === 0 && c.j === 0 ? [0, 0] : [Math.round((g() - 0.5) * 40), Math.round((g() - 0.5) * 40)]
      let type = 'good', R = clamp(P.Rnom * (1 + 0.025 * z), 930, 1070)
      if (c.i === 0 && c.j === 0) type = 'good'
      else if (u < pBad) {
        if (u2 < 0.3) { type = 'open'; R = Infinity }
        else if (u2 < 0.5) { type = 'short'; R = 0.5 }
        else if (u2 < 0.8) { type = 'high'; R = Math.round(P.Rnom * (1.25 + 0.55 * u3)) }
        else { type = 'low'; R = Math.round(P.Rnom * (0.55 + 0.25 * u3)) }
      }
      if (type === 'good') R = Math.round(R)
      return { id, i: c.i, j: c.j, x: c.x, y: c.y, r, rn, name: dieName(c.i, c.j), type, R, off, edge: rn > 0.8 }
    })
  }
  const DIES = buildDies()
  const PARTIAL = grid().filter((c) => !c.full && [[-1, -1], [1, -1], [-1, 1], [1, 1]].some(([sx, sy]) => Math.hypot(c.x + sx * P.pitch / 2, c.y + sy * P.pitch / 2) < P.R - 1))

  /** 晶圓座標（mm，x 右、y 上）→ 晶粒 id；不在任何完整晶粒裡回傳 −1 */
  function dieAt(x, y, dies = DIES) {
    const h = P.pitch / 2
    for (const d of dies) if (Math.abs(x - d.x) <= h && Math.abs(y - d.y) <= h) return d.id
    return -1
  }

  /** 這顆晶粒兩個 pad 的中心（µm，晶粒座標；含晶圓小小的歪斜 off） */
  const padCenters = (die) => ({ A: [P.pad.ax + die.off[0], P.pad.y + die.off[1]], B: [P.pad.bx + die.off[0], P.pad.y + die.off[1]] })
  const onPad = (tip, pc) => Math.abs(tip.x - pc[0]) <= P.pad.half - P.pad.margin && Math.abs(tip.y - pc[1]) <= P.pad.half - P.pad.margin

  /**
   * 接觸判定：tip＝{x,y,z}（µm；z＝針尖離 pad 表面的高度，負的＝碰到後又往下壓了多少）
   *   air 懸空｜off 落在保護層（沒對準 pad）｜touch 剛碰到（接觸不穩）｜good 良好接觸｜scratch 針壓過大
   */
  function contact(tip, pc) {
    const on = onPad(tip, pc)
    if (tip.z > 0) return { state: 'air', od: 0, on }
    if (!on) return { state: 'off', od: -tip.z, on }
    const od = -tip.z
    if (od < P.od.good) return { state: 'touch', od, on }
    if (od <= P.od.max) return { state: 'good', od, on }
    return { state: 'scratch', od, on }
  }
  const CONNECTED = new Set(['touch', 'good', 'scratch'])

  /**
   * 移動一支針：mv＝{dx,dy,dz}（µm）。回傳新位置與事件：
   *   'land' 剛碰到表面｜'scratch-press' 往下壓過頭｜'scratch-drag' 針還壓著就橫移（刮傷）｜null
   */
  function applyMove(tip, mv, pc) {
    const t = { x: clamp(tip.x + (mv.dx || 0), -P.xyLim, P.xyLim), y: clamp(tip.y + (mv.dy || 0), -P.xyLim, P.xyLim), z: clamp(tip.z + (mv.dz || 0), P.zMin, P.zMax) }
    let event = null
    if ((mv.dx || mv.dy) && tip.z <= 0) { t.z = tip.z; event = 'scratch-drag' }
    else if (mv.dz) {
      const a = contact(tip, pc).state, b = contact(t, pc).state
      if (b === 'scratch' && a !== 'scratch') event = 'scratch-press'
      else if (tip.z > 0 && t.z <= 0) event = 'land'
    }
    return { tip: t, event }
  }

  /**
   * 掃 I-V：die＝晶粒，sA、sB＝兩支針的接觸狀態，seed＝雜訊種子。
   * 模型：I＝V／(R＋接觸電阻)，限流 ±5 mA，加一點量測雜訊；任一支針沒接上或晶粒開路 → 只剩雜訊。
   */
  function measureIV(die, sA, sB, seed = 1) {
    const g = mulberry(seed * 2654435761 + die.id * 97 + 13)
    const conn = CONNECTED.has(sA) && CONNECTED.has(sB)
    const rc = (s) => (s === 'touch' ? 150 + 250 * g() : 1.5)
    const Rc = conn ? rc(sA) + rc(sB) : 0
    const Rdev = die.type === 'short' ? 0.5 : die.R
    const jitter = (sA === 'touch' || sB === 'touch') ? 0.04 : 0
    const V = [], I = []
    for (let k = 0; k < P.nPts; k++) {
      const v = P.vMin + (P.vMax - P.vMin) * k / (P.nPts - 1)
      let i
      if (!conn || die.type === 'open') i = 2e-9 * gaussOf(g)
      else {
        i = v / (Rdev + Rc)
        i = clamp(i, -P.Icomp, P.Icomp)
        if (Math.abs(i) < P.Icomp) i = i * (1 + jitter * gaussOf(g)) + 0.3e-6 * gaussOf(g)
      }
      V.push(v); I.push(i)
    }
    return { V, I, conn, Rc }
  }

  /** 從 I-V 判讀：open 開路｜short 短路（一直撞限流）｜pass 合規｜high／low 超規；R＝過原點最小平方的斜率倒數 */
  function classify(iv) {
    const { V, I } = iv
    const imax = Math.max(...I.map(Math.abs))
    if (imax < 1e-6) return { kind: 'open', R: Infinity, imax }
    const nComp = I.filter((i) => Math.abs(i) >= P.Icomp * 0.999).length
    if (nComp > V.length / 2) return { kind: 'short', R: 0, imax }
    let sv = 0, si = 0
    for (let k = 0; k < V.length; k++) if (Math.abs(I[k]) < P.Icomp * 0.999) { sv += V[k] * V[k]; si += V[k] * I[k] }
    const R = sv / si
    const kind = R >= P.specLo && R <= P.specHi ? 'pass' : R > P.specHi ? 'high' : 'low'
    return { kind, R, imax }
  }

  /** 判定對錯：學員說「良品」(good=true) 或「不良」，對照隱藏的真實狀態 */
  const isCorrect = (die, judgedGood) => (die.type === 'good') === judgedGood

  /** 統計：results＝{ [id]: { good: 學員判良品?, correct: 判對? } } */
  function stats(results, scratches = 0) {
    const list = Object.values(results)
    const tested = list.length, goodN = list.filter((r) => r.good).length, correct = list.filter((r) => r.correct).length
    return { tested, goodN, correct, wrong: tested - correct, yield: tested ? goodN / tested : 0, scratches, score: 10 * correct - 5 * scratches, done: correct >= P.doneN }
  }

  /** 給外層網頁的訊息（progress／complete）；yield 為 0～1 的比例（取到小數點下 3 位） */
  function message(event, st) {
    return { source: 'chip-camp-lab', lab: 'probe_station', event, data: { tested: st.tested, correct: st.correct, yield: Math.round(st.yield * 1000) / 1000, scratches: st.scratches } }
  }

  return { P, TYPE_ZH, mulberry, grid, buildDies, DIES, PARTIAL, dieAt, dieName, padCenters, onPad, contact, CONNECTED, applyMove, measureIV, classify, isCorrect, stats, message }
})()
if (typeof window !== 'undefined') window.PS = PS
