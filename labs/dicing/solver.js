// ═══ 晶圓切割（Dicing）示意模型：純函式，瀏覽器與 Node 共用 ═══
// 單位：晶圓座標 u、v 用 mm（晶圓中心為原點）；偏移、崩邊、深度用 µm；角度用度；時間用秒。
// 數值為「教學示意」：量級合理（100 mm 晶圓、525 µm 厚、切割道 100 µm、刀痕 30 µm、膠帶 90 µm），
// 但崩邊公式是為了呈現趨勢而設計的經驗式，不對應任何特定機台或刀片。
const DICE = (() => {
  const P = {
    waferD: 100,      // 晶圓直徑 mm（4 吋）
    edgeExcl: 3,      // 邊緣排除 mm：外圈不完整的晶粒不計
    pitch: 5,         // 晶粒間距 mm（5 mm × 5 mm 晶粒，含切割道）
    street: 100,      // 切割道寬 µm
    kerf: 30,         // 刀片切出的刀痕寬 µm（刀片厚約 30 µm）
    guard: 15,        // 晶粒邊緣到電路（密封環內側）的保護帶 µm
    waferT: 525,      // 晶圓厚 µm
    tapeT: 90,        // 切割膠帶厚 µm
    intoMin: 10,      // 切進膠帶建議下限 µm
    intoMax: 60,      // 切進膠帶建議上限 µm
    overrun: 3,       // 每道切割頭尾多走 mm
    tPass: 0.8,       // 每道的抬刀、退回、換道 s
    tRotate: 3,       // 轉 90° 換方向 s
    markX: 35,        // 對位標記離中心 mm（左右各一）
    rpmMin: 20000, rpmMax: 40000, feedMin: 5, feedMax: 80, depthMin: 400, depthMax: 700,
  }
  const R = P.waferD / 2
  const rad = (deg) => (deg * Math.PI) / 180

  // 決定性亂數（mulberry32 + 雜湊），同一片晶圓同一顆晶粒同一條邊每次結果一樣
  function hash(a, b, c, d) {
    let h = 2166136261 >>> 0
    for (const x of [a, b, c, d]) { h ^= (x | 0) + 0x9e3779b9; h = Math.imul(h ^ (h >>> 16), 2246822507); h = Math.imul(h ^ (h >>> 13), 3266489909); h ^= h >>> 16 }
    return h >>> 0
  }
  function rand01(seed, i, j, k) { const h = hash(seed, i, j, k); return (h + 0.5) / 4294967296 }

  // 完整晶粒：四個角都在（半徑 − 邊緣排除）之內
  function dies() {
    const out = [], lim = R - P.edgeExcl, p = P.pitch, n = Math.ceil(R / p)
    for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
      const x0 = i * p, x1 = x0 + p, y0 = j * p, y1 = y0 + p
      const ok = [[x0, y0], [x1, y0], [x0, y1], [x1, y1]].every(([x, y]) => Math.hypot(x, y) <= lim)
      if (ok) out.push({ i, j, xc: x0 + p / 2, yc: y0 + p / 2 })
    }
    return out
  }
  const DIES = dies()

  // 切割道（每個方向）：位置 k·pitch，只取穿過晶圓的；長度 = 弦長 + 頭尾超出
  function streets() {
    const out = [], n = Math.ceil(R / P.pitch)
    for (let k = -n; k <= n; k++) { const s = k * P.pitch; if (Math.abs(s) >= R) continue; const half = Math.sqrt(R * R - s * s); out.push({ k, s, half, len: 2 * half + 2 * P.overrun }) }
    return out
  }
  const STREETS = streets()

  /** 每轉進給量 µm/轉：進給速度 v (mm/s) 除以每秒轉數 */
  const feedPerRev = (feed, rpm) => (feed * 1000) / (rpm / 60)

  /** 切入深度判定：into = 切進膠帶的 µm */
  function depthStatus(depth) {
    const into = depth - P.waferT
    let status
    if (into < 0) status = 'shallow'          // 沒切穿晶圓
    else if (into < P.intoMin) status = 'edge' // 剛好到底：背面容易崩、偶有沒斷
    else if (into <= P.intoMax) status = 'ok'
    else if (into < P.tapeT) status = 'deep'   // 膠帶剩太薄
    else status = 'tapeCut'                    // 切斷膠帶
    return { into, status, separated: status !== 'shallow' && status !== 'tapeCut', correct: status === 'ok' }
  }

  /** 典型（每條邊最大）崩邊 µm：隨每轉進給量上升（二次經驗式，示意）；剛好切到底時背崩放大 */
  function chipTypical(feed, rpm, depth = 560) {
    const f = feedPerRev(feed, rpm)
    const st = depthStatus(depth).status
    return (3 + 0.09 * f + 0.0004 * f * f) * (st === 'edge' ? 1.5 : 1)
  }

  /**
   * 刀痕中心相對切割道中心的偏移 e (µm)。
   * 第 1 方向（沿 u 切、切割道 v = 常數）：e = dy + u·tanθ；第 2 方向（沿 v 切）：e = dx − v·tanθ
   * θ 誤差讓偏移隨離中心的距離線性累積：越遠端偏越多。
   */
  const offset1 = (al, u) => al.dy + u * 1000 * Math.tan(rad(al.dth))
  const offset2 = (al, v) => al.dx - v * 1000 * Math.tan(rad(al.dth))

  /** 對位相機讀數：左右兩個標記（u = ∓35 mm）看到的 Y 偏移、X 偏移、整片最遠端偏移 */
  function alignReadout(al) {
    const left = offset1(al, -P.markX), right = offset1(al, P.markX)
    const farMax = Math.max(Math.abs(al.dy) + R * 1000 * Math.abs(Math.tan(rad(al.dth))), Math.abs(al.dx) + R * 1000 * Math.abs(Math.tan(rad(al.dth))))
    const good = Math.abs(al.dx) <= 5 && Math.abs(al.dy) <= 5 && Math.abs(al.dth) <= 0.006
    return { left, right, x: al.dx, th: al.dth, farMax, good }
  }

  /** 總切割時間 s：每道 (長度 / 進給 + 換道) × 兩個方向 + 轉向 */
  function cutTime(feed) {
    let t = 0
    for (const s of STREETS) t += s.len / feed + P.tPass
    return { seconds: 2 * t + P.tRotate, passes: 2 * STREETS.length, cutMm: 2 * STREETS.reduce((a, s) => a + s.len, 0) }
  }

  /**
   * 主評估：每顆完整晶粒的四條邊
   *   邊界餘裕 m = (切割道 − 刀痕)/2 ± e（刀痕往晶粒靠近時變小）
   *   該邊崩邊 chip = 典型崩邊 × (1 + 0.5·(−ln r))，r 為決定性亂數（少數邊特別大，模擬長尾）
   *   崩邊 > m + 保護帶 → 傷到電路 → 晶粒報廢；m < 0 時歸為「切偏」
   */
  function evaluate({ rpm, feed, depth }, al, seed = 1) {
    const ds = depthStatus(depth)
    const c = chipTypical(feed, rpm, depth)
    const half = (P.street - P.kerf) / 2, p = P.pitch
    const t = cutTime(feed)
    let good = 0, maxChip = 0, nChip = 0, nOff = 0, worst = null, edgeFar = null
    const out = []
    for (const d of DIES) {
      const x0 = d.xc - p / 2, x1 = d.xc + p / 2, y0 = d.yc - p / 2, y1 = d.yc + p / 2
      // 每條邊：toward = 刀痕往這顆晶粒偏了多少 µm（正＝靠近），取晶粒跨距兩端較差者；m = 餘裕
      // 第 1 方向的偏移只跟沿刀方向的位置 u 有關，第 2 方向只跟 v 有關
      const e1 = [offset1(al, x0), offset1(al, x1)], e2 = [offset2(al, y0), offset2(al, y1)]
      const edges = [
        { name: 'top', dir: 1, toward: -Math.min(...e1) },    // 上方切割道 v = y1，晶粒在它下方：刀痕往 +v 偏是遠離
        { name: 'bottom', dir: 1, toward: Math.max(...e1) },  // 下方切割道 v = y0，晶粒在它上方：往 +v 偏是靠近
        { name: 'right', dir: 2, toward: -Math.min(...e2) },  // 右側切割道 u = x1
        { name: 'left', dir: 2, toward: Math.max(...e2) },    // 左側切割道 u = x0
      ]
      for (const ed of edges) { ed.e = ed.toward; ed.m = half - ed.toward }
      let ok = true, reason = null, dChip = 0, dMargin = Infinity, dE = 0, failEdge = null
      edges.forEach((ed, k) => {
        const r = rand01(seed, d.i + 100, d.j + 100, k)
        const chip = c * (1 + 0.5 * -Math.log(r))
        ed.chip = chip
        maxChip = Math.max(maxChip, chip)
        if (chip > dChip) dChip = chip
        if (ed.m < dMargin) { dMargin = ed.m; dE = ed.e }
        if (chip > ed.m + P.guard || ed.m + P.guard < 0) {
          if (ok) { ok = false; reason = ed.m < 5 ? 'offset' : 'chip'; failEdge = ed }
        }
      })
      if (!ds.separated) { ok = false; reason = ds.status }
      if (ok) good++
      else if (reason === 'chip') nChip++
      else if (reason === 'offset') nOff++
      const rec = { i: d.i, j: d.j, xc: d.xc, yc: d.yc, good: ok, reason, chip: dChip, margin: dMargin, e: dE, edges, failEdge }
      out.push(rec)
      const sev = (failEdge ? 1000 : 0) + dChip - dMargin
      if (!worst || sev > worst._sev) worst = { ...rec, _sev: sev }
      const far = Math.hypot(d.xc, d.yc)
      if (!edgeFar || far > edgeFar._r) edgeFar = { ...rec, _r: far }
    }
    const total = DIES.length
    const yld = ds.separated ? good / total : 0
    return {
      status: ds.status, into: ds.into, separated: ds.separated, depthOK: ds.correct,
      fRev: feedPerRev(feed, rpm), typChip: c, maxChip, good: ds.separated ? good : 0, total, yield: yld,
      nChip, nOff, seconds: t.seconds, passes: t.passes, dies: out, worst, edgeFar,
      complete: ds.correct && yld >= 0.9,
    }
  }

  /** 速度 vs 良率曲線：固定轉速、深度、對位，掃描進給速度 */
  function curve({ rpm, depth }, al, seed, feeds) {
    const fs = feeds ?? Array.from({ length: 31 }, (_, k) => P.feedMin + (k * (P.feedMax - P.feedMin)) / 30)
    return fs.map((feed) => { const r = evaluate({ rpm, feed, depth }, al, seed); return { feed, yield: r.yield, seconds: r.seconds } })
  }

  /** 給學員的建議（依結果判斷） */
  function hints(res, al) {
    const h = []
    if (res.status === 'shallow') h.push(`切入深度不夠：還沒切穿 ${P.waferT} µm 厚的晶圓，晶粒沒有分開。`)
    if (res.status === 'tapeCut') h.push(`切太深：把 ${P.tapeT} µm 的膠帶切斷了，晶粒會散落。`)
    if (res.status === 'edge') h.push(`只切到晶圓底：背面崩邊變大，建議多切進膠帶 ${P.intoMin}～${P.intoMax} µm。`)
    if (res.status === 'deep') h.push(`切進膠帶 ${Math.round(res.into)} µm 太多：膠帶剩太薄，之後拉開晶粒時容易破。`)
    if (res.separated) {
      const ar = alignReadout(al)
      if (res.nOff > 0 || ar.farMax > 15) {
        if (Math.abs(ar.left - ar.right) > 6) h.push('左右標記偏移不一樣＝角度 θ 沒對好：遠端的切割道偏最多，回步驟 1 先調 θ。')
        else h.push('有晶粒是被刀片「切偏」弄壞的：回步驟 1 重新對位，讓十字線落在切割道正中央。')
      }
      if (res.yield < 0.9 && res.nChip > res.nOff) h.push(`崩邊太大：每轉進給 ${res.fRev.toFixed(0)} µm 太多。降低進給速度，或提高主軸轉速。`)
      else if (res.nChip > 0 && res.yield >= 0.9) h.push(`有 ${res.nChip} 顆晶粒的崩邊碰到電路：再快一點，崩邊就會變多。`)
      if (res.yield >= 0.9 && res.depthOK) h.push(res.fRev < 70 ? '良率很好！試試提高進給速度（或同時提高轉速），看看能不能更快又保持 90% 以上。' : '又快又好！這就是速度與良率的平衡點。')
    }
    return h
  }

  /** 隨機的初始對位誤差（換一片新晶圓時用） */
  function randomMisalign(seed) {
    const r = (k) => rand01(seed, 7, 11, k)
    const sgn = (k) => (r(k) < 0.5 ? -1 : 1)
    return { dx: sgn(1) * (60 + 100 * r(2)), dy: sgn(3) * (60 + 100 * r(4)), dth: sgn(5) * (0.12 + 0.18 * r(6)) }
  }

  return { P, DIES, STREETS, feedPerRev, depthStatus, chipTypical, offset1, offset2, alignReadout, cutTime, evaluate, curve, hints, randomMisalign, rand01 }
})()
export default DICE
