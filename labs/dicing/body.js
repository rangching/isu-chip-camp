// ═══ 晶圓切割（Dicing）體驗（高中版）：場景與介面 ═══
// 單檔組成：build_lab.py 會把 solver.js 貼到下方標記處，machine kit（中文化）放在前一個 module script。
// 單位：場景用公尺（Y 朝上，地板 y = 0）；晶圓座標 u、v 用 mm；偏移、崩邊、深度用 µm。
const { THREE, Lab, MAT, GEO, mat, clamp, lerp, approach, fmt } = window.LabKit
const Q = new URLSearchParams(location.search)
const EMBED = Q.has('embed')
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const MOBILE = () => innerWidth < 760
const NARROW = () => innerWidth < 1180
/*__SOLVER__*/
const P = DICE.P
// 系列語意色：底 #141414、文字 #ECEEDF、次要 #AAAAAA、電子藍（水、膠帶）、橘（警告）、黃（十字線、門檻）、綠（合格）、紅（報廢）、紫（說明）
const COL = { bg: '#141414', ink: '#ECEEDF', mute: '#AAAAAA', blue: '#58C4DD', orange: '#F2A65A', yellow: '#F9D976', green: '#5CD0B3', red: '#FC6255', violet: '#B79CED' }
const EXAG = 8                       // 3D 晶圓貼圖：垂直切割道方向放大 8 倍（切割道、刀痕、偏移一起放大）
const R = P.waferD / 2

// ═══ 狀態 ═══
const S = {
  step: 1, reached: 1, seed: 1, mis: DICE.randomMisalign(1), set: { x: 0, y: 0, th: 0 },
  rpm: 30000, feed: 20, depth: 500, play: 4, attempts: 0, history: [], res: null, job: null, scope: 'worst', doneShown: false,
}
const align = () => ({ dx: S.mis.dx + S.set.x, dy: S.mis.dy + S.set.y, dth: S.mis.dth + S.set.th })
window.__msgs = []

// ═══ 幾何常數（公尺）═══
const BT = 0.102                 // 機台底座頂面
const CT = BT + 0.050            // 真空吸盤頂面
const TH = P.tapeT / 1e6         // 膠帶 90 µm
const WTH = P.waferT / 1e6       // 晶圓 525 µm
const WT = CT + TH + WTH         // 晶圓頂面
const FO = CT - 0.007            // 鐵框區膠帶底（鐵框夾得比吸盤低，膠帶被拉緊）
const RB = 0.029                 // 刀片半徑（58 mm 輪轂刀片）
const YC_UP = WT + RB + 0.004    // 抬刀時刀片中心高
const ycCut = (depth) => WT - depth / 1e6 + RB

// ═══ 視角 ═══
const V = {
  all: { az: -32, el: 22, dist: 2.05, target: [0.0, 0.15, -0.06] },
  blade: { az: -26, el: 11, dist: 0.62, target: [0.004, WT + 0.016, 0.004] },
  camera: { az: -40, el: 19, dist: 0.7, target: [-0.05, WT + 0.022, 0.004] },
  top: { az: 0, el: 72, dist: 0.7, target: [0.11, WT, 0.014] },
}
const frameX = () => (MOBILE() ? 0 : NARROW() ? -0.17 : 0)

const lab = new Lab({
  prompt: '晶圓切割機：鑽石刀片每分鐘轉幾萬圈，沿著切割道把一片晶圓切成兩百多顆晶粒',
  no: '「義」起解密晶片 · 互動 3D 工作站', title: '晶圓切割（Dicing）', sub: '對位、設參數、切割、檢查：又快又好要怎麼取捨？',
  size: 0.46, theme: 'night', bg: 0x141414, exposure: 0.95, envIntensity: 0.72,
  view: { ...V.all, fov: 30, frameX: frameX() }, pills: [], noIntro: REDUCED, autoOrbit: false,
  labelSide: 'left', labelMinX: MOBILE() ? 0.3 : NARROW() ? 0.15 : 0.22, labelMinY: MOBILE() ? 0.05 : EMBED ? 0.1 : 0.16, labelGap: MOBILE() ? 28 : NARROW() ? 34 : 44,
  cut: { a: [0, 0, 1], b: [0, 1, 0], center: [0, WT + 0.012, 0], reach: 0.5 },
})
lab.bloom.enabled = false   // 關掉泛光：亮金屬（鐵框、θ 台）在某些角度的銳利反光會被放大成一大片白霧，擋住晶圓

// ═══ 材質 ═══
const mPaint = MAT.paint({ color: [0.42, 0.43, 0.43], roughness: 0.45, clearcoat: 0.3 })
const mPaintDark = MAT.paint({ color: [0.11, 0.115, 0.12], roughness: 0.5, clearcoat: 0.3 })
const mStain = MAT.stainless()
const mSteel = MAT.steel()
const mAl = MAT.aluminiumMachined()
const mAlCast = MAT.aluminium()
const mRubber = MAT.rubber()
const mCeramic = MAT.ceramic({ color: [0.8, 0.79, 0.76], roughness: 0.8 })
// 膠帶用標準材質：90 µm 薄殼配物理材質在這個角度會出現過亮像素（泛光成一片白霧）
const mTape = new THREE.MeshStandardMaterial({ color: new THREE.Color(0.07, 0.3, 0.72), roughness: 0.55, metalness: 0, envMapIntensity: 0.7 })
const mSi = mat({ color: [0.3, 0.32, 0.36], metalness: 0.7, roughness: 0.22, finish: null })
const mBlade = mat({ color: [0.5, 0.52, 0.55], metalness: 0.45, roughness: 0.4, finish: 'brushed' })
const mRim = mat({ color: [0.78, 0.8, 0.84], metalness: 0.3, roughness: 0.55, finish: 'cast' })
const mBlack = MAT.anodised({ color: [0.04, 0.04, 0.045] })
const mCover = MAT.anodised({ color: [0.2, 0.22, 0.25] })
const mBrass = MAT.brass()
const mHose = MAT.plastic({ color: [0.55, 0.75, 0.85], roughness: 0.25, clearcoat: 0.5 })
const mLens = MAT.chrome()
const mRing = MAT.glow({ emissive: [0.85, 0.92, 1], emissiveIntensity: 6 })
const mLamp = [[1, 0.25, 0.2], [1, 0.8, 0.25], [0.3, 1, 0.6]].map((c) => MAT.glow({ emissive: c, emissiveIntensity: 0.15 }))

// ═══ 晶圓表面貼圖（Canvas 2D；切割時即時畫上刀痕）═══
const NTEX = 1024, PXMM = NTEX / P.waferD
const wcv = document.createElement('canvas'); wcv.width = wcv.height = NTEX
const wg = wcv.getContext('2d')
const baseCv = document.createElement('canvas'); baseCv.width = baseCv.height = NTEX
const W2P = (u, v) => [(u / R + 1) * NTEX / 2, (1 - v / R) * NTEX / 2]
function drawBase() {
  const g = baseCv.getContext('2d'), p = P.pitch, sw = (P.street / 1000) * EXAG
  g.clearRect(0, 0, NTEX, NTEX)
  g.save(); g.beginPath(); g.arc(NTEX / 2, NTEX / 2, NTEX / 2, 0, Math.PI * 2); g.clip()
  g.fillStyle = '#80868f'; g.fillRect(0, 0, NTEX, NTEX)                         // 切割道（較亮）
  const full = new Set(DICE.DIES.map((d) => d.i + ',' + d.j))
  const n = Math.ceil(R / p)
  for (let i = -n; i < n; i++) for (let j = -n; j < n; j++) {
    const [x0, y1] = W2P(i * p + sw / 2, (j + 1) * p - sw / 2), [x1, y0] = W2P((i + 1) * p - sw / 2, j * p + sw / 2)
    const w = x1 - x0, h = y0 - y1, ok = full.has(i + ',' + j)
    g.fillStyle = ok ? '#25304a' : '#2a2e37'; g.fillRect(x0, y1, w, h)
    g.fillStyle = ok ? '#34456a' : '#30343d'; g.fillRect(x0 + w * 0.22, y1 + h * 0.22, w * 0.56, h * 0.56)  // 核心電路區
    g.fillStyle = ok ? '#41587f' : '#353943'; g.fillRect(x0 + w * 0.26, y1 + h * 0.26, w * 0.22, h * 0.2); g.fillRect(x0 + w * 0.52, y1 + h * 0.52, w * 0.22, h * 0.2)
    g.fillStyle = ok ? '#b39a5c' : '#6f6650'                                       // 銲墊（打線用）
    for (let k = 0; k < 8; k++) { const t = 0.14 + k * 0.1; for (const [a, b] of [[t, 0.07], [t, 0.89], [0.07, t], [0.89, t]]) g.fillRect(x0 + w * a, y1 + h * b, 2.2, 2.2) }
  }
  g.restore()
}
function resetWafer() { drawBase(); wg.clearRect(0, 0, NTEX, NTEX); wg.drawImage(baseCv, 0, 0); waferTex.needsUpdate = true }
const waferTex = new THREE.CanvasTexture(wcv); waferTex.colorSpace = THREE.SRGBColorSpace; waferTex.anisotropy = 8
function paintKerf(pass, f0, f1) {   // 從 f0 畫到 f1（0..1，沿刀方向的比例）
  const L = pass.len, al = align(), X = EXAG / 1000
  const at = (f) => {
    const a = L / 2 - f * L     // 沿刀方向座標（第 1 方向 u 由 −L/2 → +L/2；第 2 方向 v 由 +L/2 → −L/2），由 tableX 反推
    if (pass.ch === 1) { const u = -a; return W2P(u, pass.s + DICE.offset1(al, u) * X) }
    const v = a; return W2P(pass.s + DICE.offset2(al, v) * X, v)
  }
  const [xa, ya] = at(f0), [xb, yb] = at(f1)
  wg.save(); wg.beginPath(); wg.arc(NTEX / 2, NTEX / 2, NTEX / 2, 0, Math.PI * 2); wg.clip()
  wg.lineCap = 'butt'
  wg.strokeStyle = 'rgba(22,26,34,0.62)'; wg.lineWidth = (P.street / 1000) * EXAG * PXMM               // 切過的切割道：濕、變暗
  wg.beginPath(); wg.moveTo(xa, ya); wg.lineTo(xb, yb); wg.stroke()
  wg.strokeStyle = S.depth < P.waferT ? '#3a404c' : '#050506'; wg.lineWidth = Math.max(2, (P.kerf / 1000) * EXAG * PXMM)  // 刀痕
  wg.beginPath(); wg.moveTo(xa, ya); wg.lineTo(xb, yb); wg.stroke(); wg.restore()
  waferTex.needsUpdate = true
}
function paintVerdict(res) {
  const p = P.pitch
  for (const d of res.dies) {
    const [cx, cy] = W2P(d.xc, d.yc), r = p * PXMM * 0.2
    if (d.good) { wg.strokeStyle = '#5CD0B3'; wg.lineWidth = 2.4; wg.beginPath(); wg.arc(cx, cy, r * 0.75, 0, Math.PI * 2); wg.stroke() }
    else { wg.fillStyle = 'rgba(252,98,85,0.28)'; wg.fillRect(cx - p * PXMM * 0.4, cy - p * PXMM * 0.4, p * PXMM * 0.8, p * PXMM * 0.8); wg.strokeStyle = '#FC6255'; wg.lineWidth = 3.2; wg.beginPath(); wg.moveTo(cx - r, cy - r); wg.lineTo(cx + r, cy + r); wg.moveTo(cx + r, cy - r); wg.lineTo(cx - r, cy + r); wg.stroke() }
  }
  waferTex.needsUpdate = true
}

// ═══ 零件（真實尺寸，公尺）═══
const M = lab.machine
const G = (parent = M) => { const g = new THREE.Group(); parent.add(g); return g }
const rotZ = (geo) => geo.rotateX(Math.PI / 2)     // 沿 Y 的旋轉體 → 沿 Z
// 底座與調整腳
for (const [x, z] of [[-0.2, 0.1], [0.2, 0.1], [-0.2, -0.24], [0.2, -0.24]]) lab.mesh(GEO.disc(0.014, 0.012), mRubber, { name: '調整腳', pos: [x, 0.006, z] })
const base = lab.mesh(GEO.rbox(0.46, BT - 0.012, 0.4, 0.012), mPaint, { name: '機台底座', pos: [0, (BT + 0.012) / 2, -0.07] })
lab.mesh(GEO.rbox(0.3, 0.03, 0.004, 0.002), mPaintDark, { name: '操作面板', pos: [0, 0.062, 0.131] })
for (let k = 0; k < 3; k++) lab.mesh(GEO.disc(0.005, 0.004), [mLamp[2], mBrass, MAT.glow({ emissive: [1, 0.3, 0.2], emissiveIntensity: 1.2 })][k], { name: '按鈕', pos: [0.1 + k * 0.016, 0.062, 0.134], rot: [Math.PI / 2, 0, 0] })
// X 軸伸縮護罩（風琴罩）
{
  const list = []
  list.push(GEO.rbox(0.44, 0.004, 0.15, 0.0012).translate(0, -0.002, 0))
  for (let k = 0; k < 72; k++) list.push(GEO.rbox(0.0032, 0.0035, 0.148, 0.0012).translate(-0.213 + k * 0.006, 0.0018, 0))
  lab.mesh(GEO.merge(list), mRubber, { name: 'X 軸風琴護罩', pos: [0, BT + 0.004, 0] })
}
// Y 軸（換道）滑軌：立柱沿 Z 移動
for (const x of [-0.045, 0.045]) lab.mesh(GEO.rbox(0.014, 0.008, 0.16, 0.002), mSteel, { name: 'Y 軸滑軌', pos: [x, BT + 0.004, -0.185] })

// —— 工作台（沿 X 送料）——
const tableG = G()
const carriage = lab.mesh(GEO.rbox(0.12, 0.022, 0.13, 0.004), mAlCast, { parent: tableG, name: 'X 軸工作台', pos: [0, BT + 0.019, 0], explode: [0, 0, 0] })
const waferG = G(tableG)   // θ 旋轉台以上：吸盤、膠帶、鐵框、晶圓一起轉
const thetaT = lab.mesh(GEO.disc(0.072, 0.014), MAT.steel({ roughness: 0.48, finish: 'cast' }), { parent: waferG, name: 'θ 旋轉台', pos: [0, CT - 0.013, 0], explode: [0, 0.012, 0] })
lab.mesh(GEO.bolts(12, 0.067, 0.0022, 0.0014, { y: 0, socket: true }), mSteel, { parent: waferG, name: '螺絲', pos: [0, CT - 0.006, 0], explode: [0, 0.012, 0], count: 12 })
for (let k = 0; k < 4; k++) {
  const a = Math.PI / 4 + (k * Math.PI) / 2, r = 0.08
  const arm = lab.mesh(GEO.rbox(0.032, 0.006, 0.014, 0.0015), mAlCast, { parent: waferG, name: '鐵框夾臂', pos: [r * Math.cos(a), FO - 0.003, -r * Math.sin(a)], rot: [0, a, 0], explode: [0, 0.012, 0] })
  lab.mesh(GEO.rbox(0.014, 0.003, 0.011, 0.001), mBlack, { parent: waferG, name: '鐵框壓爪', pos: [0.088 * Math.cos(a), FO + TH + 0.0012 + 0.0015, -0.088 * Math.sin(a)], rot: [0, a, 0], explode: [0, 0.05, 0] })
  void arm
}
const chuck = lab.mesh(GEO.disc(0.062, 0.006), mCeramic, { parent: waferG, name: '真空吸盤', pos: [0, CT - 0.003, 0], explode: [0, 0.024, 0] })
// 膠帶只有 90 µm 厚：旋轉體的法向量可能退化（長度 0 → NaN，會在泛光裡變成一大片白光），逐一檢查修正
const fixNormals = (geo) => { const n = geo.attributes.normal; for (let i = 0; i < n.count; i++) { const x = n.getX(i), y = n.getY(i), z = n.getZ(i), l = Math.hypot(x, y, z); if (!(l > 1e-6)) n.setXYZ(i, 0, 1, 0); else n.setXYZ(i, x / l, y / l, z / l) } n.needsUpdate = true; return geo }
const tape = lab.mesh(fixNormals(GEO.lathe([[0, CT], [0.062, CT], [0.079, FO], [0.089, FO], [0.089, FO + TH], [0.079, FO + TH], [0.062, CT + TH], [0, CT + TH]], 128)), mTape, { parent: waferG, name: '切割膠帶', explode: [0, 0.036, 0] })
const frameShape = (() => {
  const s = new THREE.Shape(), ro = 0.096, xf = 0.09, a = Math.acos(xf / ro)
  s.absarc(0, 0, ro, a, Math.PI - a, false); s.lineTo(-xf, -ro * Math.sin(a)); s.absarc(0, 0, ro, Math.PI + a, 2 * Math.PI - a, false); s.lineTo(xf, ro * Math.sin(a))
  const h = new THREE.Path(); h.absarc(0, 0, 0.08, 0, Math.PI * 2, true); s.holes.push(h); return s
})()
const frame = lab.mesh(GEO.extrude(frameShape, 0.0012, 0.0002).rotateX(-Math.PI / 2), MAT.stainless({ roughness: 0.4 }), { parent: waferG, name: '鐵框', pos: [0, FO + TH + 0.0006, 0], explode: [0, 0.046, 0] })
const waferMeshes = new THREE.Group(); waferG.add(waferMeshes)
const wafer = lab.mesh(GEO.disc(0.05, WTH, WTH * 0.3), mSi, { parent: waferMeshes, name: '晶圓', pos: [0, CT + TH + WTH / 2, 0], explode: [0, 0.058, 0] })
const mTop = mat({ color: [1, 1, 1], map: waferTex, metalness: 0.1, roughness: 0.42, clearcoat: 0, iridescence: 0.25, iridescenceIOR: 1.7, envMapIntensity: 0.3, finish: null, noCap: true })
const waferTop = lab.mesh(new THREE.CircleGeometry(0.0499, 128).rotateX(-Math.PI / 2), mTop, { parent: waferMeshes, name: '晶粒', pos: [0, WT + 0.00002, 0], explode: [0, 0.058, 0], shadow: false })

// —— 主軸單元（沿 Z 換道 = spindleG；上下 = zG，原點在刀片中心）——
const spindleG = G()
const column = lab.mesh(GEO.rbox(0.13, 0.235, 0.06, 0.008), mPaint, { parent: spindleG, name: '立柱', pos: [0, BT + 0.008 + 0.1175, -0.18], explode: [0, 0, -0.08] })
lab.mesh(GEO.rbox(0.11, 0.012, 0.05, 0.003), mSteel, { parent: spindleG, name: '滑座', pos: [0, BT + 0.014, -0.18], explode: [0, 0, -0.08] })
// 狀態燈
lab.mesh(GEO.disc(0.004, 0.03), mStain, { parent: spindleG, name: '燈柱', pos: [0.045, BT + 0.243 + 0.015, -0.18], explode: [0, 0.05, -0.08] })
const lamps = mLamp.map((m, k) => lab.mesh(GEO.disc(0.009, 0.012), m, { parent: spindleG, name: '狀態燈', pos: [0.045, BT + 0.243 + 0.036 + k * 0.0125, -0.18], explode: [0, 0.05, -0.08] }))
const zG = G(spindleG)
const plate = lab.mesh(GEO.rbox(0.1, 0.12, 0.012, 0.003), mAlCast, { parent: zG, name: 'Z 軸升降板', pos: [0, 0.02, -0.144], explode: [0, 0.06, -0.06] })
const housing = lab.mesh(rotZ(GEO.lathe([[0, -0.138], [0.024, -0.138], [0.024, -0.062], [0.019, -0.058], [0.019, -0.032], [0.014, -0.028], [0.014, -0.0035], [0, -0.0035]], 96)), mStain, { parent: zG, name: '主軸', explode: [0, 0.06, -0.03] })
const bladeG = lab.add(new THREE.Group(), { parent: zG, name: '刀片組', explode: [0, 0.06, 0.03], count: 0 })   // 刀片組會自轉：組內零件只沿轉軸（z）拆開
const blade = lab.mesh(rotZ(GEO.tube(RB, 0.0185, 0.0004)), mBlade, { parent: bladeG, name: '鑽石刀片', explode: [0, 0, 0.006] })
lab.mesh(rotZ(GEO.tube(RB, RB - 0.0012, 0.00046)), mRim, { parent: bladeG, name: '鑽石刃口', explode: [0, 0, 0.006] })
const hub = lab.mesh(rotZ(GEO.disc(0.016, 0.0025)), mAl, { parent: bladeG, name: '刀片輪轂', pos: [0, 0, -0.0015], explode: [0, 0, -0.004] })
const nut = lab.mesh(rotZ(GEO.disc(0.009, 0.004)), mSteel, { parent: bladeG, name: '固定螺帽', pos: [0, 0, 0.002], explode: [0, 0, 0.02] })
// 輪轂上的孔與記號：看得出刀片在轉
lab.mesh(GEO.merge([0, 1, 2].map((k) => rotZ(GEO.disc(0.0019, 0.0028)).translate(0.011 * Math.cos(k * 2.094), 0.011 * Math.sin(k * 2.094), -0.0012))), mBlack, { parent: bladeG, name: '輪轂孔', explode: [0, 0, -0.004], count: 3 })
lab.mesh(GEO.rbox(0.006, 0.0016, 0.0006, 0.0002).translate(0.0235, 0, 0), MAT.paint({ color: [0.9, 0.85, 0.6] }), { parent: bladeG, name: '刀片記號', explode: [0, 0, 0.006] })
// 刀蓋
const coverShape = (() => { const s = new THREE.Shape(), w = 0.038, y0 = -0.01, y1 = 0.034, r = 0.008; s.moveTo(-w, y0); s.lineTo(w, y0); s.lineTo(w, y1 - r); s.quadraticCurveTo(w, y1, w - r, y1); s.lineTo(-w + r, y1); s.quadraticCurveTo(-w, y1, -w, y1 - r); s.closePath(); return s })()
const cover = lab.mesh(GEO.extrude(coverShape, 0.032, 0.0012).translate(0, 0, -0.006), mCover, { parent: zG, name: '刀蓋', xray: 'shell', explode: [0, 0.1, 0.04] })
// 冷卻水噴嘴（刀片兩側各一支＋前方一支淋水噴嘴）
const yW = WT - ycCut(560)     // 刀片中心到晶圓頂（以標準深度計，噴嘴固定在刀蓋上）
const nozzlePts = (z) => [[-0.033, -0.006, z], [-0.031, -0.014, z], [-0.026, yW + 0.007, z], [-0.018, yW + 0.0045, z]]
const nozL = lab.mesh(GEO.pipe(nozzlePts(0.0034), 0.0011), mBrass, { parent: zG, name: '冷卻水噴嘴', explode: [0, 0.08, 0.05] })
const nozR = lab.mesh(GEO.pipe(nozzlePts(-0.0034), 0.0011), mBrass, { parent: zG, name: '冷卻水噴嘴', explode: [0, 0.08, 0.05] })
const showerPts = [[0.034, -0.004, 0], [0.036, -0.012, 0], [0.031, yW + 0.008, 0], [0.025, yW + 0.0055, 0]]
const nozS = lab.mesh(GEO.pipe(showerPts, 0.0013), mBrass, { parent: zG, name: '淋水噴嘴', explode: [0, 0.08, 0.05] })
const TIPS = [[-0.018, yW + 0.0045, 0.0034, 1, -0.45], [-0.018, yW + 0.0045, -0.0034, 1, -0.45], [0.025, yW + 0.0055, 0, -1, -0.6]]
// 進水管
for (const z of [0.004, -0.004]) lab.mesh(GEO.pipe([[0.01, 0.0335, z], [0.012, 0.05, z - 0.01], [0.012, 0.06, -0.08], [0.02, 0.055, -0.137]], 0.0022), mHose, { parent: zG, name: '冷卻水管', explode: [0, 0.1, 0.0] })
// 對位相機（顯微鏡頭＋環形光源）
const camX = -0.082
const camBody = lab.mesh(GEO.rbox(0.03, 0.042, 0.034, 0.004), mBlack, { parent: zG, name: '對位相機', pos: [camX, 0.026, -0.004], explode: [-0.03, 0.09, 0.02] })
lab.mesh(GEO.rbox(0.05, 0.012, 0.03, 0.002), mAlCast, { parent: zG, name: '相機支架', pos: [camX + 0.03, 0.036, -0.012], explode: [-0.03, 0.09, 0.02] })
const lensTop = 0.005, lensBot = yW + 0.012
lab.mesh(GEO.lathe([[0, lensBot], [0.0085, lensBot], [0.0085, lensBot + 0.004], [0.0072, lensBot + 0.006], [0.0072, lensTop], [0, lensTop]], 64), mLens, { parent: zG, name: '物鏡', pos: [camX, 0, -0.004], explode: [-0.03, 0.09, 0.02] })
lab.mesh(new THREE.TorusGeometry(0.0098, 0.0017, 16, 64).rotateX(Math.PI / 2), mRing, { parent: zG, name: '環形光源', pos: [camX, lensBot + 0.002, -0.004], explode: [-0.03, 0.09, 0.02] })
lab.mesh(rotZ(GEO.disc(0.006, 0.006)), mBlack, { parent: zG, name: '相機接頭', pos: [camX, 0.04, -0.024], explode: [-0.03, 0.09, 0.02] })

// ═══ 標籤（名稱＋一句用途）═══
const L = (obj, name, desc, at) => lab.label(obj, name, { at, value: () => desc })  // 名稱＋一句用途（窄螢幕只顯示名稱，用途見「零件小百科」）
L(waferTop, '晶圓', '上面排著一顆顆晶粒（晶片）', [0.03, 0, 0.026])
L(tape, '切割膠帶（藍膜）', '切開後晶粒還黏在膠帶上不會散掉', [-0.07, FO + 0.004, 0.04])
L(frame, '鐵框', '撐住膠帶，方便搬運與上機', [0.06, 0, 0.07])
L(chuck, '真空吸盤', '多孔陶瓷抽真空，把晶圓吸平吸牢', [0.0, 0.0, 0.062])
L(blade, '鑽石刀片', '刀刃鑲著鑽石顆粒，約 30 µm 厚', [0.006, -0.026, 0])
L(housing, '主軸', '氣浮軸承，每分鐘轉兩萬到四萬圈', [0.0, 0.019, -0.09])
L(cover, '刀蓋', '擋住水花與碎屑，保護人員', [0.03, 0.034, 0.01])
L(nozS, '冷卻水', '純水沖刀口：帶走熱與矽屑', [0.025, yW + 0.0055, 0])
L(camBody, '對位相機', '看切割道，讓刀片對準', [-0.015, 0.0, 0.017])
L(carriage, '工作台（X 軸）', '帶著晶圓往前送＝進給', [0.06, 0, 0.06])
L(column, '立柱（Y、Z 軸）', '換到下一道、升降刀片', [-0.065, 0.06, 0.03])

// ═══ 水花粒子 ═══
const spray = (() => {
  const N = 1400, pos = new Float32Array(N * 3), col = new Float32Array(N * 4), vel = new Float32Array(N * 3), life = new Float32Array(N), max = new Float32Array(N)
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 4))
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); const gr = x.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.45, 'rgba(255,255,255,0.55)'); gr.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64)
  const sprite = new THREE.CanvasTexture(c)
  const m = new THREE.PointsMaterial({ size: 0.0028 * lab.k, map: sprite, vertexColors: true, transparent: true, depthWrite: false, blending: THREE.NormalBlending, sizeAttenuation: true, toneMapped: false })
  const pts = new THREE.Points(g, m); pts.frustumCulled = false; pts.layers.set(1); pts.renderOrder = 4; M.add(pts)
  let head = 0
  const emit = (o, d, sp, spread, n, lf = 0.5) => {
    for (let k = 0; k < n; k++) {
      const i = head; head = (head + 1) % N
      pos[i * 3] = o[0]; pos[i * 3 + 1] = o[1]; pos[i * 3 + 2] = o[2]
      const s = sp * (0.7 + Math.random() * 0.6)
      vel[i * 3] = (d[0] + (Math.random() - 0.5) * spread) * s; vel[i * 3 + 1] = (d[1] + (Math.random() - 0.5) * spread) * s; vel[i * 3 + 2] = (d[2] + (Math.random() - 0.5) * spread) * s
      life[i] = max[i] = lf * (0.6 + Math.random() * 0.8)
    }
  }
  const update = (dt) => {
    for (let i = 0; i < N; i++) {
      if (life[i] <= 0) { col[i * 4 + 3] = 0; continue }
      life[i] -= dt
      vel[i * 3 + 1] -= 9.8 * dt
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt
      const tx = pos[i * 3] - tableG.position.x, tz = pos[i * 3 + 2]
      if (pos[i * 3 + 1] < WT + 0.0004 && Math.hypot(tx, tz) < 0.05) { pos[i * 3 + 1] = WT + 0.0004; vel[i * 3 + 1] *= -0.22; vel[i * 3] *= 0.6; vel[i * 3 + 2] = vel[i * 3 + 2] * 0.6 + (Math.random() - 0.5) * 0.25 }
      const a = Math.sqrt(clamp(life[i] / max[i])) * 0.85
      col[i * 4] = 0.42; col[i * 4 + 1] = 0.8; col[i * 4 + 2] = 0.92; col[i * 4 + 3] = a
    }
    g.attributes.position.needsUpdate = true; g.attributes.color.needsUpdate = true
  }
  return { emit, update, pts }
})()

// ═══ 介面 ═══
const css = document.createElement('style')
css.textContent = `
:root, html.lab-night { --serif:'Songti TC','Noto Serif TC',Georgia,serif; --sans:'PingFang TC','Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif; --mono:ui-monospace,Menlo,Consolas,monospace;
  --paper:#141414; --ink:#ECEEDF; --mute:#AAAAAA; --faint:#55554f; --line:#2e2e2b; --accent:#FC6255;
  --blue:#58C4DD; --orange:#F2A65A; --yellow:#F9D976; --green:#5CD0B3; --red:#FC6255; --violet:#B79CED }
html,body { font-size:16px; background:#141414 }
.lab-pills, .lab-scale, .lab-modes { display:none !important }
.lab-prompt { font-size:clamp(13px,0.95vw,16px); max-width:44vw; left:1.4vw; top:2.2vh; padding:0.5em 0.9em; color:#c9c6bd }
.lab-prompt b { color:var(--yellow) }
.lab-side { top:2.2vh; bottom:2.2vh; right:1.4vw; transform:none; width:clamp(340px,28vw,440px); overflow-y:auto; overflow-x:hidden; pointer-events:auto; padding:12px 16px 18px; scrollbar-width:thin; background:rgba(18,18,18,0.9); border:1px solid rgba(255,255,255,0.07); border-radius:10px }
.lab-no { font-size:13.5px; letter-spacing:0.02em; color:var(--mute) }
.lab-title { font-size:clamp(23px,1.75vw,30px); line-height:1.15 }
.lab-title i { font-size:14px; margin-top:0.35em; color:#c9c6bd; font-style:normal; font-family:var(--sans) }
.lab-metric { margin-top:10px } .lab-metric .lbl { font-size:14px; color:var(--mute) } .lab-metric .lbl b { font-weight:600 }
.lab-big { font-size:clamp(40px,3.1vw,54px) } .lab-big i { font-size:16px; color:#a6a39b; font-style:normal; font-family:var(--sans) }
.lab-bar { margin:0.15em 0 0.6em } .lab-bar > div { background:var(--green) !important } .lab-bar.bad > div { background:var(--red) !important }
.lab-sub { font-size:13.5px; line-height:1.5; color:#c9c6bd }
.lab-ctls { display:none }
.lab-ctl { margin-top:8px } .lab-ctl .row { font-size:14.5px; margin-bottom:0; align-items:center; gap:6px; color:#c9c6bd } .lab-ctl .row b { font-size:16px; margin-left:auto; color:var(--ink) }
.lab-ctl input[type=range] { height:2.2em }
.lab-ctl .ends { font-size:12.5px; color:#8a877f }
.lab-ctl .jog { display:inline-flex; gap:4px; margin-left:6px }
.lab-how { position:static; width:auto; margin-top:12px; font-size:13.5px; color:#a19e96; pointer-events:auto; border-top:1px solid var(--line); padding-top:10px }
.lab-how summary { font-size:14.5px } .lab-how .eq { font-size:12.5px; color:#d6d2c8 }
.lab-lab { font-size:14px; text-shadow:none; background:rgba(16,16,16,0.78); padding:2px 7px 3px; border-radius:5px; line-height:1.3 } .lab-lab small { font-size:12.5px; color:#b9b5ab }
.dc-btn { font:inherit; font-size:14px; color:var(--ink); background:rgba(20,20,20,0.75); border:1px solid #44443f; border-radius:999px; padding:0.34em 0.85em; cursor:pointer; pointer-events:auto; line-height:1.3; white-space:nowrap }
.dc-btn:hover { border-color:#77756d } .dc-btn.act { background:var(--ink); color:#141414; border-color:var(--ink) }
.dc-btn.pri { background:var(--yellow); color:#141414; border-color:var(--yellow); font-weight:600 } .dc-btn.pri:hover { filter:brightness(1.06) }
.dc-btn.sm { padding:0 0.55em; min-width:30px; height:28px; font-size:16px; border-radius:8px }
.dc-btn:focus-visible, .dc-steps button:focus-visible, input:focus-visible, summary:focus-visible { outline:2px solid var(--yellow); outline-offset:2px }
.dc-row { display:flex; flex-wrap:wrap; gap:7px; margin-top:10px; align-items:center } .dc-row .lbl { font-size:13.5px; color:var(--mute); margin-right:2px }
.dc-steps { display:flex; gap:6px; margin-top:12px }
.dc-steps button { flex:1; font:inherit; font-size:14px; color:#c9c6bd; background:transparent; border:1px solid #3a3a35; border-radius:8px; padding:5px 2px 6px; cursor:pointer; line-height:1.25; min-width:0 }
.dc-steps button b { display:block; font-size:11.5px; font-weight:500; color:#8a877f }
.dc-steps button.act { background:var(--ink); color:#141414; border-color:var(--ink) } .dc-steps button.act b { color:#55534d }
.dc-steps button.done { border-color:#356d5f } .dc-steps button.done b::before { content:'✓ '; color:var(--green) }
.dc-steps button:disabled { opacity:0.4; cursor:default }
.dc-sec { display:none; margin-top:12px; border-top:1px solid var(--line); padding-top:10px } .dc-sec.on { display:block }
.dc-sec h3, .dc-h { margin:0 0 6px; font-size:15px; font-weight:600; color:var(--ink) } .dc-h { margin-top:14px } .dc-h small { display:block; font-weight:400; font-size:12.5px; color:var(--mute); margin-top:2px }
.dc-p { margin:0 0 4px; font-size:14px; line-height:1.6; color:#c9c6bd } .dc-p b { color:var(--ink); font-weight:600 }
.dc-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:8px 14px; margin-top:10px }
.dc-grid div { font-size:13px; color:#99968e; line-height:1.3 } .dc-grid b { display:block; font-size:16.5px; color:var(--ink); font-weight:500; font-variant-numeric:tabular-nums }
.dc-grid b.ok, .dc-note.ok { color:var(--green) } .dc-grid b.warn, .dc-note.warn { color:var(--orange) } .dc-grid b.bad, .dc-note.bad { color:var(--red) }
.dc-note { font-size:13.5px; color:#c9c6bd; margin-top:8px; line-height:1.5 }
.dc-verdict { font-size:16px; font-weight:600; padding:7px 10px; border-radius:8px; border:1px solid #3a3a35 }
.dc-verdict.ok { color:var(--green); border-color:#356d5f } .dc-verdict.warn { color:var(--orange); border-color:#6d5536 } .dc-verdict.bad { color:var(--red); border-color:#6d3a36 }
.dc-hints { margin:10px 0 0; padding-left:1.2em; font-size:13.5px; color:#d9d5cb; line-height:1.55 } .dc-hints li { margin-bottom:3px }
#dc-chart { display:block; width:100%; border-radius:6px; margin-top:4px }
.dc-legend { display:flex; flex-wrap:wrap; gap:4px 12px; font-size:12.5px; color:var(--mute); margin-top:6px }
.dc-legend i { display:inline-block; vertical-align:middle; margin-right:4px }
.dc-legend .ln { width:18px; height:0; border-top:2.5px solid } .dc-legend .ln.g { border-color:var(--green) } .dc-legend .ln.o { border-top:2px dotted var(--orange) } .dc-legend .ln.y { border-top:2px dashed var(--yellow) }
.dc-legend .dot { width:10px; height:10px; border-radius:50%; background:var(--yellow) } .dc-legend .dot.h { background:none; border:1.5px solid var(--mute) }
.dc-card { margin-top:14px; border:1px solid #3c3650; border-radius:8px; padding:8px 12px; background:rgba(183,156,237,0.05); font-size:13.5px; color:#cfcbc2; line-height:1.6 }
.dc-card summary { cursor:pointer; color:var(--violet); font-weight:600; font-size:14.5px }
.dc-card p { margin:8px 0 0 } .dc-card b { color:var(--ink) }
.dc-flow { margin:8px 0 0; padding-left:1.4em } .dc-flow li.hl { color:var(--yellow); font-weight:600 }
.dc-tip { color:var(--blue) } .dc-small { font-size:12.5px; color:#8e8b84 }
#dc-views { position:absolute; left:max(16px,1.4vw); top:calc(2.2vh + 2.9em); display:flex; flex-wrap:wrap; gap:6px; align-items:center; pointer-events:auto; max-width:46vw }
#dc-views .lbl { font-size:13.5px; color:var(--mute); margin-right:2px } #dc-views .sep { width:8px }
#dc-panel { position:absolute; left:max(16px,1.4vw); top:calc(2.2vh + 6.1em); width:clamp(320px,26vw,420px); pointer-events:auto; background:rgba(18,18,18,0.9); border:1px solid rgba(255,255,255,0.07); border-radius:10px; padding:9px 11px 11px }
#dc-panel h4 { margin:0 0 6px; font-size:14.5px; font-weight:600; color:var(--ink); display:flex; justify-content:space-between; gap:8px } #dc-panel h4 small { font-weight:400; color:var(--mute); font-size:12.5px }
#dc-panel canvas { display:block; width:100%; border-radius:6px; background:#0b0c0e }
#dc-panel .cap { font-size:13px; color:#b9b5ab; margin-top:7px; line-height:1.5 } #dc-panel .cap:empty, #dc-panel .dc-row:empty { display:none }
#dc-done { position:fixed; inset:0; z-index:10; display:flex; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); padding:16px }
#dc-done.hide { display:none }
#dc-done .card { width:min(440px,100%); background:#1b1b1a; border:1px solid #356d5f; border-radius:12px; padding:18px 20px 16px; color:#d9d5cb; font-size:14.5px; line-height:1.6; box-shadow:0 20px 60px rgba(0,0,0,0.5) }
#dc-done .big { font-size:24px; font-weight:700; color:var(--green) } #dc-done p { margin:6px 0 }
.dc-card.parts { border-color:#2f4a52; background:rgba(88,196,221,0.04) } .dc-card.parts summary { color:var(--blue) }
.dc-card dl { margin:8px 0 0; display:grid; grid-template-columns:auto 1fr; gap:4px 10px } .dc-card dt { color:var(--ink); font-weight:600; white-space:nowrap } .dc-card dd { margin:0 }
html.dc-lbl-on #dc-panel { display:none }
.lab-embed .lab-prompt, .lab-embed .lab-no, .lab-embed .lab-title { display:none }
.lab-embed .lab-metric { margin-top:0 }
.lab-embed #dc-views { top:1.8vh } .lab-embed #dc-panel { top:calc(1.8vh + 3.1em) }
@media (max-width: 1179px) { html.dc-lbl-on #dc-panel { display:block } .lab-lab small { display:none } #dc-views { max-width:calc(100vw - 400px) } }
@media (max-width: 1179px) and (min-width: 760px) { #dc-panel { position:static; width:auto; margin-top:12px; padding:0; background:none; border:none } }
@media (max-width: 759px) {
  html,body { overflow:hidden }
  .lab-prompt { display:none }
  .lab-side { position:fixed; top:50vh; bottom:0; left:0; right:0; width:auto; background:#141414; border:none; border-top:1px solid #2c2c28; border-radius:0; padding:10px 16px 28px; overflow-y:auto }
  .lab-no, .lab-title { display:none } .lab-metric { margin-top:10px } .lab-big { font-size:34px } .lab-sub { font-size:13px }
  .dc-steps { margin-top:6px }
  #dc-views { position:static; max-width:none; margin:0 0 6px; gap:5px } #dc-views .lbl { display:none } #dc-views .dc-btn { font-size:13px; padding:0.3em 0.7em } #dc-views .sep { display:none }
  #dc-panel { position:static; width:auto; margin-top:12px; padding:0; background:none; border:none }
  .dc-steps button { font-size:13.5px }
  .lab-lab { font-size:12.5px } .lab-lab small { display:none }
}
@media (prefers-reduced-motion: reduce) { * { transition:none !important; animation:none !important } }
`
document.head.appendChild(css)
const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstElementChild }
const side = lab.$('.lab-side')
const $ = (s) => lab.ui.querySelector(s)
const $$ = (s) => [...lab.ui.querySelectorAll(s)]
const r1 = (v, d = 1) => (Math.round(v * 10 ** d) / 10 ** d).toFixed(d)
const sgn = (v, d = 1) => (v >= 0 ? '+' : '−') + r1(Math.abs(v), d)
const mmss = (s) => { s = Math.round(s); const m = Math.floor(s / 60); return m ? `${m} 分 ${String(s % 60).padStart(2, '0')} 秒` : `${s} 秒` }
const mark = (kind) => ({ ok: '✓', warn: '▲', bad: '✕' })[kind]

// 步驟列
const steps = el(`<div class="dc-steps" role="tablist">
  <button data-s="1"><b>步驟 1</b>對位</button><button data-s="2"><b>步驟 2</b>設參數</button><button data-s="3"><b>步驟 3</b>切割</button><button data-s="4"><b>步驟 4</b>檢查</button></div>`)
side.appendChild(steps)
// 左側小視窗（相機／剖面／進度／顯微鏡）
const panel = el(`<div id="dc-panel"><h4><span data-r="ptitle">對位相機</span><small data-r="psub"></small></h4><canvas id="dc-cv"></canvas><div class="cap" data-r="pcap"></div><div class="dc-row" data-r="pbtns"></div></div>`)
const CV = panel.querySelector('canvas'); CV.setAttribute('role', 'img')
// 視角與模式
const views = el(`<div id="dc-views"><span class="lbl">視角</span><button class="dc-btn" data-v="all">全景</button><button class="dc-btn" data-v="blade">刀片</button><button class="dc-btn" data-v="camera">相機</button><button class="dc-btn" data-v="top">俯視</button>
  <span class="sep"></span><button class="dc-btn" data-m="labels">標籤</button><button class="dc-btn" data-m="explode">爆炸圖</button><button class="dc-btn" data-m="xray">透視刀蓋</button></div>`)
lab.ui.appendChild(views)

// 各步驟內容
const sec = (id, html) => { const s = el(`<div class="dc-sec" data-step="${id}">${html}</div>`); side.appendChild(s); return s }
const s1 = sec(1, `<h3>步驟 1／4　對位：讓刀片對準切割道</h3>
  <p class="dc-p">晶粒之間留了 100 µm 寬的「切割道」，刀片只能切在這條道上。對位相機看晶圓左右兩個標記：<b>先轉 θ</b>，讓左右兩邊的橫線一樣高；<b>再調 Y</b>，讓黃色十字線落在橫的切割道正中央；<b>最後調 X</b>，對準直的切割道。</p>
  <div data-r="sl1"></div>
  <div class="dc-grid"><div>X 偏移<b data-r="ax"></b></div><div>角度誤差 θ<b data-r="ath"></b></div><div>左標記 Y 偏移<b data-r="ayl"></b></div><div>右標記 Y 偏移<b data-r="ayr"></b></div></div>
  <div class="dc-note" data-r="anote"></div>
  <div class="dc-row"><button class="dc-btn pri" data-a="to2">下一步：設參數 →</button><button class="dc-btn" data-a="newwafer">換一片新晶圓</button></div>`)
const s2 = sec(2, `<h3>步驟 2／4　設參數：轉多快、走多快、切多深</h3>
  <p class="dc-p">刀片每轉一圈，晶圓往前走一小段（<b>每轉進給量</b>）。這段越長，每顆鑽石一次啃掉越多矽，邊緣越容易崩出缺口。切入深度要<b>切穿 525 µm 的晶圓、再切進膠帶一點點</b>：太淺晶粒分不開，太深會把 90 µm 的膠帶切斷。</p>
  <div data-r="sl2"></div>
  <div class="dc-grid"><div>每轉進給量<b data-r="frev"></b></div><div>預估切割時間<b data-r="tpred"></b></div><div>切進膠帶<b data-r="into"></b></div><div>切割道總長<b data-r="cutlen"></b></div></div>
  <div class="dc-note" data-r="pnote"></div>
  <div class="dc-row"><button class="dc-btn pri" data-a="cut">開始切割 →</button><button class="dc-btn" data-a="to1">← 回對位</button></div>`)
const s3 = sec(3, `<h3>步驟 3／4　切割：先切一個方向，轉 90° 再切另一個方向</h3>
  <p class="dc-p">工作台帶著晶圓從刀片下面走過，一道切完就抬刀、換到下一道。冷卻水一直沖在刀口上。切過的切割道會變暗。</p>
  <div class="dc-grid"><div>目前<b data-r="pass"></b></div><div>機台時間<b data-r="clock"></b></div></div>
  <div class="dc-row"><span class="lbl">快轉</span><button class="dc-btn" data-p="4">×4</button><button class="dc-btn" data-p="16">×16</button><button class="dc-btn" data-p="64">×64</button><button class="dc-btn" data-a="finish">直接切完</button></div>
  <div class="dc-note">畫面上的刀片轉動已放慢（真實轉速太快，眼睛和螢幕都跟不上）；機台時間照真實速度計算。</div>`)
const s4 = sec(4, `<h3>步驟 4／4　檢查：顯微鏡看崩邊、算良率</h3>
  <div class="dc-verdict" data-r="verdict"></div>
  <div class="dc-grid"><div>好晶粒<b data-r="good"></b></div><div>切割時間<b data-r="time"></b></div><div>最大崩邊<b data-r="maxc"></b></div><div>典型崩邊<b data-r="typc"></b></div><div>報廢：崩邊<b data-r="nchip"></b></div><div>報廢：切偏<b data-r="noff"></b></div></div>
  <ul class="dc-hints" data-r="hints"></ul>
  <h3 class="dc-h">速度 vs 良率<small>同樣轉速、深度與對位，只改進給速度</small></h3>
  <canvas id="dc-chart"></canvas>
  <div class="dc-legend"><span><i class="ln g"></i>良率</span><span><i class="ln o"></i>切割時間</span><span><i class="ln y"></i>90% 門檻</span><span><i class="dot"></i>這次</span><span><i class="dot h"></i>之前</span></div>
  <div class="dc-row"><button class="dc-btn pri" data-a="retry">再試一次（調參數）</button><button class="dc-btn" data-a="restart">從對位重來</button></div>`)
const CH = s4.querySelector('#dc-chart'); CH.setAttribute('role', 'img'); CH.setAttribute('aria-label', '速度與良率關係圖：橫軸進給速度，綠線良率、橘色點線切割時間')
// 說明小卡
side.appendChild(el(`<details class="dc-card"><summary>說明：切割在晶片製程的哪裡？</summary>
  <ol class="dc-flow"><li>晶圓廠做好電路（前段製程）</li><li>晶圓測試：探針逐顆量測</li><li>背面研磨，把晶圓磨薄</li><li>貼上切割膠帶、裝上鐵框</li><li class="hl">切割：把晶圓切成一顆顆晶粒</li><li>黏晶：把晶粒貼到導線架或基板</li><li>打線：用細金屬線連到接腳</li><li>封膠、成品測試</li></ol>
  <p>切割是晶圓做完之後、<b>進入後段封裝之前</b>的步驟；切完的晶粒會被頂針從膠帶下面頂起、吸嘴吸走，送去<b>黏晶</b>與<b>打線</b>。</p>
  <p><b>為什麼要在潔淨室做？</b>這時晶粒表面還沒有封裝保護，一粒灰塵或矽屑就可能刮傷電路、造成短路。所以切割機用純水（去離子水）一邊切一邊沖，人員要穿無塵衣，潔淨室也控制溫度、濕度和靜電。</p>
  <p class="dc-tip">到 6 樓潔淨室時，看看：刀蓋與水管在哪裡？切割時水花往哪噴？螢幕上的對位畫面是不是也有十字線？</p>
  <p class="dc-small">本頁數值為教學示意（100 mm 晶圓、5 mm 晶粒、刀痕 30 µm），不對應特定機台。</p></details>`))
const PARTS = [['晶圓', '上面排著一顆顆晶粒（晶片）'], ['切割膠帶（藍膜）', '切開後晶粒還黏在膠帶上不會散掉'], ['鐵框', '撐住膠帶，方便搬運與上機'], ['真空吸盤', '多孔陶瓷抽真空，把晶圓吸平吸牢'], ['鑽石刀片', '刀刃鑲著鑽石顆粒，約 30 µm 厚'], ['主軸', '氣浮軸承，每分鐘轉兩萬到四萬圈'], ['刀蓋', '擋住水花與碎屑，保護人員'], ['冷卻水', '純水沖刀口：帶走熱與矽屑'], ['對位相機', '看切割道，讓刀片對準'], ['工作台（X 軸）', '帶著晶圓往前送＝進給'], ['立柱（Y、Z 軸）', '換到下一道、升降刀片']]
side.appendChild(el(`<details class="dc-card parts"><summary>零件小百科（11 個主要零件）</summary><dl>${PARTS.map(([a, b]) => `<dt>${a}</dt><dd>${b}</dd>`).join('')}</dl><p class="dc-small">按「標籤」可以在 3D 畫面上看到它們的位置；按「爆炸圖」把零件拆開。3D 晶圓上切割道的寬度方向放大 8 倍、刀片厚度也放大顯示。</p></details>`))
side.appendChild(lab.$('.lab-how')); lab.$('.lab-how').style.display = ''
lab.how('示意模型：每轉進給量 f = 進給速度 ÷ 每秒轉數。典型崩邊隨 f 上升（經驗式，示意）。每顆晶粒四條邊各自抽一個崩邊大小（少數特別大）。刀痕偏離切割道中心 e 由 X、Y 偏移與角度 θ 決定，θ 會讓偏移隨距離累積。崩邊超過「餘裕＋保護帶」就傷到電路、晶粒報廢。', [
  'f [µm/轉] = v [mm/s] × 1000 ÷ (rpm ÷ 60)',
  '典型崩邊 c = 3 + 0.09 f + 0.0004 f²  （µm，示意）',
  '每條邊崩邊 = c × (1 + 0.5 × (−ln r))，r 為 0～1 亂數',
  '偏移 e = Y 偏移 + u × tanθ（方向 1）；X 偏移 − v × tanθ（方向 2）',
  '餘裕 m = (100 − 30) ÷ 2 − e（往晶粒偏時）；崩邊 > m + 15 µm → 報廢',
  '時間 = Σ(切割道長 ÷ v + 0.8 s) × 2 方向 + 轉向 3 s',
  '切進膠帶 = 深度 − 525 µm：< 0 未切斷、0～10 剛到底、10～60 正確、60～90 偏深、≥ 90 切斷膠帶'])
lab.$('.lab-how summary').textContent = '怎麼算的（模型與簡化）'
// 版面：寬螢幕小視窗浮在左邊；窄螢幕與手機放進側欄
if (NARROW()) { side.insertBefore(panel, s1); if (MOBILE()) { side.insertBefore(steps, side.firstChild); side.insertBefore(views, steps) } } else lab.ui.appendChild(panel)
// 完成卡
const done = el(`<div id="dc-done" class="hide" role="dialog" aria-modal="true" aria-label="完成"><div class="card">
  <div class="big">✓ 切割完成！</div><p>深度正確、良率達到 90% 以上。這片晶圓可以送去黏晶與打線了。</p>
  <div class="dc-grid"><div>良率<b data-r="dy"></b></div><div>切割時間<b data-r="dt"></b></div><div>最大崩邊<b data-r="dc"></b></div><div>嘗試次數<b data-r="da"></b></div></div>
  <p class="dc-small">挑戰：提高進給速度或轉速，看看能不能更快、良率還維持 90% 以上？</p>
  <div class="dc-row"><button class="dc-btn pri" data-a="challenge">再挑戰更快</button><button class="dc-btn" data-a="close">看檢查結果</button></div></div></div>`)
document.body.appendChild(done)

// 滑桿（kit 滑桿＋微調鈕）
const SL = {}
function mkSlider(host, key, o) {
  const c = lab.slider({ ...o, onInput: (v) => { o.set(+v); refresh() } })
  host.appendChild(c.wrap)
  if (o.jog) {
    const j = el(`<span class="jog"><button class="dc-btn sm" aria-label="${o.label} 減少">−</button><button class="dc-btn sm" aria-label="${o.label} 增加">＋</button></span>`)
    c.wrap.querySelector('.row').insertBefore(j, c.wrap.querySelector('.row b'))
    j.children[0].onclick = () => c.set(c.value - o.jog); j.children[1].onclick = () => c.set(c.value + o.jog)
  }
  SL[key] = c; return c
}
const h1 = s1.querySelector('[data-r=sl1]'), h2 = s2.querySelector('[data-r=sl2]')
mkSlider(h1, 'th', { id: 'th', label: 'θ 旋轉', min: -0.5, max: 0.5, step: 0.001, value: 0, unit: '°', fmt: (v) => sgn(v, 3), ends: ['−0.5°', '+0.5°'], jog: 0.001, set: (v) => (S.set.th = v) })
mkSlider(h1, 'y', { id: 'y', label: 'Y 位置（換道方向）', min: -200, max: 200, step: 1, value: 0, unit: 'µm', fmt: (v) => sgn(v, 0), ends: ['−200', '+200 µm'], jog: 1, set: (v) => (S.set.y = v) })
mkSlider(h1, 'x', { id: 'x', label: 'X 位置', min: -200, max: 200, step: 1, value: 0, unit: 'µm', fmt: (v) => sgn(v, 0), ends: ['−200', '+200 µm'], jog: 1, set: (v) => (S.set.x = v) })
mkSlider(h2, 'rpm', { id: 'rpm', label: '主軸轉速', min: P.rpmMin, max: P.rpmMax, step: 1000, value: S.rpm, unit: 'rpm', fmt: (v) => fmt(v), ends: ['20,000', '40,000 rpm'], jog: 1000, set: (v) => (S.rpm = v) })
mkSlider(h2, 'feed', { id: 'feed', label: '進給速度', min: P.feedMin, max: P.feedMax, step: 1, value: S.feed, unit: 'mm/s', fmt: (v) => fmt(v), ends: ['5 慢', '80 mm/s 快'], jog: 1, set: (v) => (S.feed = v) })
mkSlider(h2, 'depth', { id: 'depth', label: '切入深度（從晶圓表面算）', min: P.depthMin, max: P.depthMax, step: 5, value: S.depth, unit: 'µm', fmt: (v) => fmt(v), ends: ['400', '700 µm'], jog: 5, set: (v) => (S.depth = v) })

// ═══ 小視窗繪圖 ═══
const DPR = Math.min(2, devicePixelRatio || 1)
function fit(cv, ratio) { const w = cv.clientWidth || 380, h = Math.round(w * ratio); if (cv.width !== Math.round(w * DPR) || cv.height !== Math.round(h * DPR)) { cv.width = Math.round(w * DPR); cv.height = Math.round(h * DPR); cv.style.height = h + 'px' } const g = cv.getContext('2d'); g.setTransform(DPR, 0, 0, DPR, 0, 0); return [g, w, h] }
const FONT = (s, w = 400) => `${w} ${s}px 'PingFang TC','Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif`
function txt(g, s, x, y, c = COL.ink, size = 12, align = 'left', w = 400) { g.font = FONT(size, w); g.fillStyle = c; g.textAlign = align; g.textBaseline = 'middle'; g.fillText(s, x, y) }
// 晶粒的顯微紋路（µm 座標 → 畫面）
function dieTexture(g, x0, y0, x1, y1, s, ox, oy) {
  g.fillStyle = '#26314a'; g.fillRect(x0, y0, x1 - x0, y1 - y0)
  g.save(); g.beginPath(); g.rect(x0, y0, x1 - x0, y1 - y0); g.clip()
  g.strokeStyle = 'rgba(120,150,200,0.22)'; g.lineWidth = 1
  const step = 12 * s; for (let x = Math.floor((x0 - ox) / step) * step + ox; x < x1; x += step) { g.beginPath(); g.moveTo(x, y0); g.lineTo(x, y1); g.stroke() }
  for (let y = Math.floor((y0 - oy) / (step * 2)) * step * 2 + oy; y < y1; y += step * 2) { g.beginPath(); g.moveTo(x0, y); g.lineTo(x1, y); g.stroke() }
  g.restore()
}
function drawAlignCam() {
  const [g, W, H] = fit(CV, MOBILE() ? 0.62 : 0.6), al = align(), ar = DICE.alignReadout(al)
  g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, W, H)
  const half = W / 2, s = (half - 8) / 360       // 視野寬 360 µm
  for (const [k, side] of [[0, 'left'], [1, 'right']]) {
    const x0 = k * half + 3, w = half - 6, cx = x0 + w / 2, cy = H / 2 + 8
    g.save(); g.beginPath(); g.rect(x0, 18, w, H - 22); g.clip()
    const eY = side === 'left' ? ar.left : ar.right
    const sy = cy + eY * s, sx = cx - al.dx * s, hw = (P.street / 2) * s
    g.fillStyle = '#7a808a'; g.fillRect(x0, 18, w, H)                                         // 切割道
    // 四塊晶粒（切割道交叉口）
    for (const [a, b, c, d] of [[x0, 18, sx - hw, sy - hw], [sx + hw, 18, x0 + w, sy - hw], [x0, sy + hw, sx - hw, H], [sx + hw, sy + hw, x0 + w, H]]) if (c > a && d > b) dieTexture(g, a, b, c, d, s, sx, sy)
    g.fillStyle = '#b39a5c'; for (const [dx, dy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) g.fillRect(sx + dx * (hw + 40 * s) - 25 * s, sy + dy * (hw + 40 * s) - 25 * s, 50 * s, 50 * s)  // 銲墊
    // 十字線＋刀痕預覽（刀片會切在兩條細線之間）
    g.strokeStyle = COL.yellow; g.lineWidth = 1.4
    g.beginPath(); g.moveTo(x0, cy); g.lineTo(x0 + w, cy); g.moveTo(cx, 18); g.lineTo(cx, H); g.stroke()
    g.setLineDash([4, 3]); g.lineWidth = 1; g.beginPath(); g.moveTo(x0, cy - 15 * s); g.lineTo(x0 + w, cy - 15 * s); g.moveTo(x0, cy + 15 * s); g.lineTo(x0 + w, cy + 15 * s); g.stroke(); g.setLineDash([])
    g.restore()
    const okY = Math.abs(eY) <= 5
    txt(g, `${side === 'left' ? '左標記（u = −35 mm）' : '右標記（u = +35 mm）'}`, cx, 10, COL.mute, 11.5, 'center')
    g.fillStyle = 'rgba(10,10,12,0.78)'; g.fillRect(x0 + 4, H - 24, w - 8, 20)
    txt(g, `${mark(okY ? 'ok' : Math.abs(eY) < 20 ? 'warn' : 'bad')} Y ${sgn(eY)} µm`, cx, H - 14, okY ? COL.green : Math.abs(eY) < 20 ? COL.orange : COL.red, 12.5, 'center', 600)
  }
  g.strokeStyle = '#333'; g.beginPath(); g.moveTo(half, 18); g.lineTo(half, H); g.stroke()
}
function drawSection() {
  const [g, W, H] = fit(CV, MOBILE() ? 0.62 : 0.6), ds = DICE.depthStatus(S.depth)
  g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, W, H)
  // 分段比例：晶圓上面 450 µm 壓縮顯示（有斷線記號），450～720 µm 放大，看得清楚膠帶裡的 10、50、30 µm
  const top = 30, bot = H - 10, BRK = 450, yB = top + (bot - top) * 0.2, sB = (bot - yB) / (720 - BRK)
  const y = (um) => (um <= BRK ? top + ((yB - top) * um) / BRK : yB + (um - BRK) * sB)
  const xL = 12, xR = W - 112, cx = xL + (xR - xL) * 0.58
  g.fillStyle = '#5d5b57'; g.fillRect(xL, y(P.waferT + P.tapeT), xR - xL, bot - y(P.waferT + P.tapeT))
  g.fillStyle = 'rgba(255,255,255,0.1)'; for (let i = 0; i < 70; i++) g.fillRect(xL + ((i * 37) % (xR - xL)), y(P.waferT + P.tapeT) + 3 + ((i * 13) % Math.max(4, bot - y(P.waferT + P.tapeT) - 6)), 2, 2)
  g.fillStyle = '#2f6fd0'; g.fillRect(xL, y(P.waferT), xR - xL, y(P.waferT + P.tapeT) - y(P.waferT))
  g.fillStyle = '#3c4454'; g.fillRect(xL, y(0), xR - xL, y(P.waferT) - y(0))
  // 斷線記號（上面的晶圓壓縮了）
  g.strokeStyle = '#0b0c0e'; g.lineWidth = 5; g.beginPath(); for (let x = xL; x <= xR; x += 10) g.lineTo(x, yB - 3 + ((x / 10) % 2 ? 4 : -4)); g.stroke()
  g.strokeStyle = '#8a8f99'; g.lineWidth = 1; g.beginPath(); for (let x = xL; x <= xR; x += 10) g.lineTo(x, yB - 3 + ((x / 10) % 2 ? 4 : -4)); g.stroke()
  // 刀痕槽與刀片（刀片寬度放大顯示）
  const kw = 16, d = Math.min(S.depth, 715)
  g.fillStyle = '#0b0c0e'; g.fillRect(cx - kw / 2, y(0), kw, y(Math.min(d, P.waferT + P.tapeT)) - y(0))
  g.fillStyle = 'rgba(175,180,190,0.95)'; g.beginPath(); g.moveTo(cx - kw / 2 + 2, 24); g.lineTo(cx + kw / 2 - 2, 24); g.lineTo(cx + kw / 2 - 2, y(d) - 5); g.quadraticCurveTo(cx, y(d) + 3, cx - kw / 2 + 2, y(d) - 5); g.closePath(); g.fill()
  txt(g, '刀片', cx + kw / 2 + 5, top + 6, COL.mute, 11.5)
  txt(g, '晶圓 525 µm', xL + 6, (y(0) + yB) / 2 + 2, COL.ink, 12)
  txt(g, '膠帶 90 µm', xL + 6, (y(P.waferT) + y(P.waferT + P.tapeT)) / 2, '#e3eeff', 12)
  txt(g, '真空吸盤', xL + 6, (y(P.waferT + P.tapeT) + bot) / 2, '#e6e3dc', 11.5)
  // 右側深度尺（顏色＋形狀）
  const zx = xR + 8, band = (a, b, c) => { g.fillStyle = c; g.fillRect(zx, y(a), 7, Math.max(2, y(b) - y(a))) }
  band(0, P.waferT, COL.red); band(P.waferT, P.waferT + P.intoMin, COL.orange); band(P.waferT + P.intoMin, P.waferT + P.intoMax, COL.green); band(P.waferT + P.intoMax, P.waferT + P.tapeT, COL.orange); band(P.waferT + P.tapeT, 720, COL.red)
  txt(g, '✕ 未切斷', zx + 12, (y(0) + y(P.waferT)) / 2, COL.red, 11.5)
  txt(g, '✓ 正確', zx + 12, y(P.waferT + 35), COL.green, 11.5)
  txt(g, '✕ 切斷膠帶', zx + 12, y(P.waferT + P.tapeT + 40), COL.red, 11.5)
  // 深度指標
  const by = y(d)
  g.fillStyle = COL.yellow; g.beginPath(); g.moveTo(zx - 1, by); g.lineTo(zx - 9, by - 5); g.lineTo(zx - 9, by + 5); g.closePath(); g.fill()
  g.strokeStyle = COL.yellow; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(cx + kw / 2, by); g.lineTo(zx - 9, by); g.stroke(); g.setLineDash([])
  const word = { shallow: '還沒切穿晶圓', edge: '剛好切到底，背面容易崩', ok: '切穿，並切進膠帶一點點', deep: '切進膠帶太多', tapeCut: '把膠帶切斷了' }[ds.status]
  const kind = ds.status === 'ok' ? 'ok' : ds.status === 'edge' || ds.status === 'deep' ? 'warn' : 'bad'
  txt(g, `${mark(kind)} 深度 ${S.depth} µm：${word}`, xL, 13, { ok: COL.green, warn: COL.orange, bad: COL.red }[kind], 13, 'left', 600)
}
function drawProgress() {
  const [g, W, H] = fit(CV, MOBILE() ? 0.62 : 0.6)
  g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, W, H)
  const D = H - 20, x0 = (W - D) / 2, y0 = 14
  g.save(); g.beginPath(); g.arc(x0 + D / 2, y0 + D / 2, D / 2, 0, Math.PI * 2); g.clip(); g.drawImage(wcv, x0, y0, D, D); g.restore()
  const J = S.job; if (!J) return
  const p = J.passes[J.idx]
  if (p && !p.rot) {
    const k = D / P.waferD, a = (x) => x0 + D / 2 + x * k, b = (v) => y0 + D / 2 - v * k
    g.strokeStyle = COL.yellow; g.lineWidth = 1.5; g.setLineDash([5, 4]); g.beginPath()
    if (p.ch === 1) { g.moveTo(a(-R), b(p.s)); g.lineTo(a(R), b(p.s)) } else { g.moveTo(a(p.s), b(-R)); g.lineTo(a(p.s), b(R)) }
    g.stroke(); g.setLineDash([])
    const f = clamp((J.tm - p.t0) / (p.tc - p.t0)), al = p.len / 2 - f * p.len
    const [px, py] = p.ch === 1 ? [a(-al), b(p.s)] : [a(p.s), b(al)]
    g.fillStyle = COL.yellow; g.beginPath(); g.arc(px, py, 4.5, 0, Math.PI * 2); g.fill()
  }
  txt(g, '黃色虛線＝現在這一道；圓點＝刀口位置', 8, H - 6, COL.mute, 11)
}
// 顯微鏡：一條晶粒邊緣（切割道水平擺放），上方是被檢查的晶粒
function scopeDie() { const r = S.res; if (!r) return null; if (S.scope === 'worst') return r.worst; if (S.scope === 'far') return r.edgeFar; let best = null; for (const d of r.dies) if (!best || Math.hypot(d.xc, d.yc) < Math.hypot(best.xc, best.yc)) best = d; return best }
function drawScope() {
  const [g, W, H] = fit(CV, MOBILE() ? 0.66 : 0.62), d = scopeDie(); g.fillStyle = '#0b0c0e'; g.fillRect(0, 0, W, H); if (!d) return
  const ed = d.edges.reduce((a, b) => (b.chip - b.m > a.chip - a.m ? b : a))   // 這顆晶粒最危險的一條邊
  const top = 22, s = (H - top - 26) / 280, cy = top + (H - top - 26) / 2 + 20 * s, X = (um) => W / 2 + um * s, Y = (um) => cy + um * s
  const sep = !S.res.separated && S.res.status === 'shallow'
  dieTexture(g, 0, top, W, Y(-P.street / 2), s, 0, 0); dieTexture(g, 0, Y(P.street / 2), W, H, s, 0, 0)
  g.fillStyle = '#7a808a'; g.fillRect(0, Y(-P.street / 2), W, P.street * s)
  // 密封環＋電路邊界（保護帶 15 µm）
  g.fillStyle = '#8f7c4c'; g.fillRect(0, Y(-P.street / 2 - P.guard + 4), W, 3 * s); g.fillRect(0, Y(P.street / 2 + P.guard - 7), W, 3 * s)
  g.strokeStyle = COL.yellow; g.setLineDash([5, 4]); g.lineWidth = 1.2; g.beginPath(); g.moveTo(0, Y(-P.street / 2 - P.guard)); g.lineTo(W, Y(-P.street / 2 - P.guard)); g.stroke(); g.setLineDash([])
  // 刀痕（往晶粒偏 = 往上）
  const kc = -ed.toward, kt = kc - P.kerf / 2, kb = kc + P.kerf / 2
  g.fillStyle = sep ? '#4b5260' : '#050506'; g.fillRect(0, Y(kt), W, P.kerf * s)
  // 崩邊：決定性鋸齒，最大一個正好等於這條邊的崩邊大小
  const rnd = (k) => DICE.rand01(S.seed, d.i + 300, d.j + 300, k)
  const chips = []; const Wum = W / s
  for (let k = 0; k < 9; k++) chips.push({ x: -Wum / 2 + (k + 0.15 + rnd(k) * 0.7) * (Wum / 9), w: 10 + rnd(k + 20) * 26, dpt: ed.chip * (0.18 + 0.5 * rnd(k + 40)) })
  chips[4].dpt = ed.chip; chips[4].w = Math.max(18, ed.chip * 1.1); chips[4].x = 0
  const over = ed.chip > ed.m + P.guard
  const chipPoly = (c, yEdge, dir) => { g.beginPath(); g.moveTo(X(c.x - c.w / 2), Y(yEdge)); g.lineTo(X(c.x - c.w * 0.22), Y(yEdge + dir * c.dpt * 0.7)); g.lineTo(X(c.x + c.w * 0.05), Y(yEdge + dir * c.dpt)); g.lineTo(X(c.x + c.w * 0.3), Y(yEdge + dir * c.dpt * 0.55)); g.lineTo(X(c.x + c.w / 2), Y(yEdge)); g.closePath() }
  for (const c of chips) { chipPoly(c, kt, -1); g.fillStyle = '#050506'; g.fill() }
  for (const c of chips) { chipPoly({ ...c, dpt: c.dpt * 0.45, x: c.x + 30 }, kb, 1); g.fillStyle = '#050506'; g.fill() }
  chipPoly(chips[4], kt, -1); g.strokeStyle = over ? COL.red : COL.orange; g.lineWidth = 2; g.stroke()
  // 標註
  const lx = 8
  txt(g, '晶粒（電路）', lx, Y(-P.street / 2 - P.guard) - 12 * s - 8, COL.ink, 12)
  txt(g, '電路邊界', W - 8, Y(-P.street / 2 - P.guard) - 9, COL.yellow, 11.5, 'right')
  txt(g, '切割道', lx, Y(P.street / 2) - 9, '#e8e8e8', 11.5)
  txt(g, '刀痕', W - 8, Y(kc), '#cfcfcf', 11.5, 'right')
  // 崩邊深度箭頭
  const ax = X(chips[4].x + chips[4].w * 0.05) + 16
  g.strokeStyle = over ? COL.red : COL.orange; g.lineWidth = 1.2; g.beginPath(); g.moveTo(ax, Y(kt)); g.lineTo(ax, Y(kt - ed.chip)); g.stroke()
  g.font = FONT(12, 600); const tw = g.measureText(`崩邊 ${r1(ed.chip)} µm`).width
  g.fillStyle = 'rgba(10,10,12,0.82)'; g.fillRect(ax + 3, Y(kt - ed.chip / 2) - 9, tw + 6, 18)
  txt(g, `崩邊 ${r1(ed.chip)} µm`, ax + 6, Y(kt - ed.chip / 2), over ? COL.red : COL.orange, 12, 'left', 600)
  // 比例尺
  g.fillStyle = COL.ink; g.fillRect(W - 8 - 50 * s, H - 10, 50 * s, 2); txt(g, '50 µm', W - 8 - 25 * s, H - 19, COL.mute, 11, 'center')
  const good = d.good
  g.fillStyle = 'rgba(10,10,12,0.8)'; g.fillRect(0, 0, W, top)
  txt(g, `${good ? '✓ 合格' : '✕ 報廢'}　晶粒（${d.i + 10}, ${d.j + 10}）｜刀痕往晶粒偏 ${sgn(ed.toward)} µm`, 8, top / 2, good ? COL.green : COL.red, 12.5, 'left', 600)
}
function drawChart() {
  const r = S.res; if (!r) return
  const [g, W, H] = fit(CH, 0.52), pl = 40, pr = 44, pt = 10, pb = 30, w = W - pl - pr, h = H - pt - pb
  g.fillStyle = '#0d0e10'; g.fillRect(0, 0, W, H)
  const cv = DICE.curve({ rpm: S.rpm, depth: S.depth }, align(), S.seed)
  const X = (f) => pl + ((f - P.feedMin) / (P.feedMax - P.feedMin)) * w, Y = (y) => pt + (1 - y) * h, Tmax = 720, YT = (t) => pt + (1 - t / Tmax) * h
  g.strokeStyle = '#2a2a2a'; g.lineWidth = 1
  for (const y of [0, 0.25, 0.5, 0.75, 1]) { g.beginPath(); g.moveTo(pl, Y(y)); g.lineTo(pl + w, Y(y)); g.stroke(); txt(g, `${y * 100}%`, pl - 5, Y(y), COL.mute, 10.5, 'right') }
  for (const t of [0, 240, 480, 720]) txt(g, `${t / 60} 分`, pl + w + 5, YT(t), COL.orange, 10.5)
  for (const f of [5, 20, 40, 60, 80]) txt(g, `${f}`, X(f), H - pb + 10, COL.mute, 10.5, 'center')
  txt(g, '進給速度（mm/s）', pl + w / 2, H - 7, COL.mute, 11, 'center')
  g.strokeStyle = COL.yellow; g.setLineDash([5, 4]); g.beginPath(); g.moveTo(pl, Y(0.9)); g.lineTo(pl + w, Y(0.9)); g.stroke()
  g.strokeStyle = COL.orange; g.setLineDash([2, 3]); g.lineWidth = 1.6; g.beginPath(); cv.forEach((c, k) => (k ? g.lineTo(X(c.feed), YT(c.seconds)) : g.moveTo(X(c.feed), YT(c.seconds)))); g.stroke(); g.setLineDash([])
  g.strokeStyle = COL.green; g.lineWidth = 2.2; g.beginPath(); cv.forEach((c, k) => (k ? g.lineTo(X(c.feed), Y(c.yield)) : g.moveTo(X(c.feed), Y(c.yield)))); g.stroke()
  S.history.slice(0, -1).forEach((a) => { g.strokeStyle = COL.mute; g.lineWidth = 1.5; g.beginPath(); g.arc(X(a.feed), Y(a.yield), 4.5, 0, Math.PI * 2); g.stroke() })
  const last = S.history[S.history.length - 1]
  if (last) { g.fillStyle = COL.yellow; g.beginPath(); g.arc(X(last.feed), Y(last.yield), 5.5, 0, Math.PI * 2); g.fill(); g.strokeStyle = '#141414'; g.lineWidth = 1.5; g.stroke() }
}

// ═══ 步驟與讀數 ═══
let VIEW = 'all', TW = null
let labelsTouched = false
function goView(v, dur = 1.0) {
  if (!labelsTouched && !MOBILE() && lab._started) lab.toggle('labels', v === 'all')
  syncModes()
  VIEW = v; for (const b of views.querySelectorAll('[data-v]')) b.classList.toggle('act', b.dataset.v === v)
  const to = { ...V[v], fov: 30, frameX: frameX() }
  if (dur <= 0 || REDUCED) { lab.setView(to); TW = null; return }
  const c = lab.controlsOrbit, p = lab.camera.position.clone().sub(c.target), r = p.length()
  TW = { t0: performance.now(), dur: dur * 1000, from: { az: (Math.atan2(p.x, p.z) * 180) / Math.PI, el: (Math.asin(p.y / r) * 180) / Math.PI, dist: r / 2.4, target: c.target.clone().divideScalar(lab.k).toArray() }, to }
}
function tween() {
  if (!TW) return
  const k = clamp((performance.now() - TW.t0) / TW.dur), e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2, f = TW.from, t = TW.to
  let daz = t.az - f.az; while (daz > 180) daz -= 360; while (daz < -180) daz += 360
  lab.setView({ ...t, az: f.az + daz * e, el: lerp(f.el, t.el, e), dist: lerp(f.dist, t.dist, e), target: f.target.map((x, i) => lerp(x, t.target[i], e)) })
  if (k >= 1) TW = null
}
const setTxt = (k, v, cls) => { for (const n of lab.ui.querySelectorAll(`[data-r="${k}"]`)) { n.innerHTML = v; if (cls !== undefined) n.className = cls } }
const kindOf = (v, a, b) => (Math.abs(v) <= a ? 'ok' : Math.abs(v) <= b ? 'warn' : 'bad')
function setStep(n) {
  S.step = n; S.reached = Math.max(S.reached, n)
  for (const b of steps.children) { const k = +b.dataset.s; b.classList.toggle('act', k === n); b.classList.toggle('done', k < S.reached && k !== n); b.disabled = (k > S.reached) || (S.job && S.step === 3 && k !== 3) || (k === 3 && !S.job) || (k === 4 && !S.res) }
  for (const s of side.querySelectorAll('.dc-sec')) s.classList.toggle('on', +s.dataset.step === n)
  const pt = { 1: ['對位相機', '視野 360 µm'], 2: ['剖面示意', '刀片切多深？'], 3: ['切割進度', '俯視晶圓'], 4: ['顯微檢查', '晶粒邊緣'] }[n]
  setTxt('ptitle', pt[0]); setTxt('psub', pt[1]); CV.setAttribute('aria-label', `${pt[0]}：${pt[1]}`)
  const pb = panel.querySelector('[data-r=pbtns]')
  pb.innerHTML = n === 4 ? `<button class="dc-btn" data-sc="worst">最嚴重的一顆</button><button class="dc-btn" data-sc="far">最遠端</button><button class="dc-btn" data-sc="center">中心</button>` : ''
  setTxt('pcap', { 1: '黃色十字線＝刀片會切的位置（虛線之間是 30 µm 刀痕）。灰色寬帶是切割道。', 2: '刀片從上面切下來：要切穿晶圓，只切進藍色膠帶一點點（綠色區）。橘色▲是剛到底或偏深。', 3: '', 4: '黑色是刀痕與崩掉的缺口；缺口越過黃色虛線（電路邊界）就傷到電路，晶粒報廢。' }[n])
  lab.hero({ 1: { label: '整片最遠端的刀痕偏移', unit: 'µm', max: 150, digits: 1 }, 2: { label: '每轉進給量', unit: 'µm/轉', max: 240, digits: 0 }, 3: { label: '切割進度', unit: '%', max: 100, digits: 0 }, 4: { label: '良率', unit: '%', max: 100, digits: 1 } }[n])
  goView({ 1: 'camera', 2: 'blade', 3: 'blade', 4: 'top' }[n])
  if (MOBILE() || NARROW()) side.scrollTop = 0
  refresh()
}
function refresh() {
  const al = align(), ar = DICE.alignReadout(al)
  // 步驟 1
  setTxt('ax', `${mark(kindOf(ar.x, 5, 20))} ${sgn(ar.x)} µm`, kindOf(ar.x, 5, 20))
  setTxt('ath', `${mark(kindOf(ar.th, 0.006, 0.02))} ${sgn(ar.th, 3)}°`, kindOf(ar.th, 0.006, 0.02))
  setTxt('ayl', `${mark(kindOf(ar.left, 5, 20))} ${sgn(ar.left)} µm`, kindOf(ar.left, 5, 20))
  setTxt('ayr', `${mark(kindOf(ar.right, 5, 20))} ${sgn(ar.right)} µm`, kindOf(ar.right, 5, 20))
  setTxt('anote', ar.good ? '✓ 對位完成：刀痕離切割道中心不到 5 µm。' : Math.abs(ar.left - ar.right) > 6 ? '▲ 左右標記的 Y 偏移不一樣：晶圓轉歪了，先調 θ 讓兩邊一樣。' : '▲ 左右一樣了，再調 Y 和 X，把十字線移到切割道正中央。', 'dc-note ' + (ar.good ? 'ok' : 'warn'))
  // 步驟 2
  const fr = DICE.feedPerRev(S.feed, S.rpm), ds = DICE.depthStatus(S.depth), tp = DICE.cutTime(S.feed)
  const fk = fr <= 60 ? 'ok' : fr <= 100 ? 'warn' : 'bad'
  setTxt('frev', `${mark(fk)} ${r1(fr, 0)} µm/轉`, fk)
  setTxt('tpred', mmss(tp.seconds))
  const dk = ds.status === 'ok' ? 'ok' : ds.status === 'edge' || ds.status === 'deep' ? 'warn' : 'bad'
  setTxt('into', `${mark(dk)} ${ds.into < 0 ? `還差 ${-ds.into} µm 才切穿` : `${ds.into} µm`}`, dk)
  setTxt('cutlen', `${fmt(tp.cutMm / 1000, 2)} m（${tp.passes} 道）`)
  setTxt('pnote', fk === 'bad' ? '✕ 每轉進給太大：崩邊會很嚴重。降低進給速度或提高轉速。' : fk === 'warn' ? '▲ 每轉進給偏大：快，但崩邊會變大，良率可能下降。' : '✓ 每轉進給量不大，崩邊應該小；但切得越慢，時間越長。', 'dc-note ' + fk)
  if (S.step === 1) lab.setHero(ar.farMax, { state: ar.good ? '✓ 對準了' : ar.farMax < 20 ? '▲ 快對準了' : '✕ 還沒對準', sub: `左 ${sgn(ar.left)}、右 ${sgn(ar.right)} µm · X ${sgn(ar.x)} µm · 容許約 ±15 µm`, bad: ar.farMax > 15 })
  if (S.step === 2) lab.setHero(fr, { state: fk === 'ok' ? '✓ 崩邊小' : fk === 'warn' ? '▲ 崩邊變大' : '✕ 崩邊嚴重', sub: `${fmt(S.rpm)} rpm · ${S.feed} mm/s · 深度 ${S.depth} µm · 預估 ${mmss(tp.seconds)}`, bad: fk === 'bad' })
  if (S.step === 1) drawAlignCam()
  if (S.step === 2) drawSection()
  if (S.step === 4) { drawScope(); drawChart(); for (const b of panel.querySelectorAll('[data-sc]')) b.classList.toggle('act', b.dataset.sc === S.scope) }
  for (const b of s3.querySelectorAll('[data-p]')) b.classList.toggle('act', +b.dataset.p === S.play)
}

// ═══ 切割工作 ═══
function buildJob() {
  const passes = []; let t = 0
  for (const ch of [1, 2]) {
    if (ch === 2) { passes.push({ rot: true, t0: t, t1: t + P.tRotate }); t += P.tRotate }
    for (const s of DICE.STREETS) { const dur = s.len / S.feed; passes.push({ ch, s: s.s, len: s.len, t0: t, tc: t + dur, t1: t + dur + P.tPass, done: 0 }); t += dur + P.tPass }
  }
  return { passes, T: t, tm: 0, idx: 0 }
}
function startCut() {
  if (S.job) return
  resetWafer(); S.res = null; S.job = buildJob(); S.play = S.play || 4
  setStep(3)
}
function finishPass(p) { if (!p.rot && p.done < 1) { paintKerf(p, p.done, 1); p.done = 1 } }
function finishCut() {
  const J = S.job; if (!J) return
  J.tm = J.T; for (const p of J.passes) finishPass(p); J.idx = J.passes.length - 1
  completeCut()
}
function completeCut() {
  const J = S.job; S.job = null
  S.attempts++
  const res = DICE.evaluate({ rpm: S.rpm, feed: S.feed, depth: S.depth }, align(), S.seed)
  S.res = res; S.history.push({ feed: S.feed, rpm: S.rpm, yield: res.yield })
  paintVerdict(res)
  S.scope = 'worst'
  setStep(4)
  // 第 4 步讀數
  const yk = res.yield >= 0.9 ? 'ok' : res.yield >= 0.7 ? 'warn' : 'bad'
  setTxt('good', `${res.good}／${res.total} 顆`)
  setTxt('time', mmss(res.seconds))
  setTxt('maxc', `${r1(res.maxChip)} µm`)
  setTxt('typc', `${r1(res.typChip)} µm`)
  setTxt('nchip', `${res.separated ? res.nChip : '—'} 顆`)
  setTxt('noff', `${res.separated ? res.nOff : '—'} 顆`)
  const why = !res.separated ? (res.status === 'shallow' ? '✕ 沒切穿，晶粒沒分開' : '✕ 膠帶被切斷，晶粒散落') : res.complete ? '✓ 達標：深度正確、良率 ≥ 90%' : !res.depthOK ? `▲ 良率 ${r1(res.yield * 100)}%，但切入深度不對` : '✕ 良率未達 90%'
  setTxt('verdict', why, 'dc-verdict ' + (res.complete ? 'ok' : yk === 'ok' ? 'warn' : 'bad'))
  setTxt('hints', DICE.hints(res, align()).map((h) => `<li>${h}</li>`).join('') || '<li>試著改變參數，看看良率與時間怎麼變。</li>')
  lab.setHero(res.yield * 100, { state: res.complete ? '✓ 達標' : '✕ 未達標', sub: `好晶粒 ${res.good}／${res.total} · 最大崩邊 ${r1(res.maxChip)} µm · ${mmss(res.seconds)}`, bad: !res.complete })
  refresh()
  post('progress', res)
  if (res.complete) { post('complete', res); showDone(res) }
  void J
}
function post(event, r) {
  const msg = { source: 'chip-camp-lab', lab: 'dicing', event, data: { yield: +(r.yield * 100).toFixed(1), seconds: Math.round(r.seconds), chippingUm: +r.maxChip.toFixed(1), attempts: S.attempts } }
  window.__msgs.push(msg)
  try { window.parent.postMessage(msg, '*') } catch (e) { /* 沒有外層頁面時忽略 */ }
}
function showDone(r) {
  setTxt('dy', `${r1(r.yield * 100)}%`); setTxt('dt', mmss(r.seconds)); setTxt('dc', `${r1(r.maxChip)} µm`); setTxt('da', `${S.attempts} 次`)
  for (const n of done.querySelectorAll('[data-r]')) { const k = n.dataset.r; n.textContent = { dy: `${r1(r.yield * 100)}%`, dt: mmss(r.seconds), dc: `${r1(r.maxChip)} µm`, da: `${S.attempts} 次` }[k] }
  done.classList.remove('hide'); done.querySelector('[data-a=challenge]').focus({ preventScroll: true })
}
function newWafer(keepAlign) {
  S.seed += 1
  if (!keepAlign) { S.mis = DICE.randomMisalign(S.seed); for (const k of ['x', 'y', 'th']) SL[k].set(0) }
  S.res = null; resetWafer()
}

// ═══ 事件 ═══
steps.addEventListener('click', (e) => { const b = e.target.closest('button'); if (b && !b.disabled) setStep(+b.dataset.s) })
views.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.v) goView(b.dataset.v); if (b.dataset.m) { if (b.dataset.m === 'labels') labelsTouched = true; lab.toggle(b.dataset.m); syncModes() } })
function syncModes() { for (const b of views.querySelectorAll('[data-m]')) b.classList.toggle('act', lab.target[b.dataset.m] > 0.5); document.documentElement.classList.toggle('dc-lbl-on', lab.target.labels > 0.5) }
addEventListener('keydown', (e) => { if (e.key.toLowerCase() === 'l') labelsTouched = true; setTimeout(syncModes, 0) })
panel.addEventListener('click', (e) => { const b = e.target.closest('[data-sc]'); if (b) { S.scope = b.dataset.sc; refresh() } })
side.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return
  const a = b.dataset.a
  if (b.dataset.p) { S.play = +b.dataset.p; refresh() }
  if (a === 'to2') setStep(2)
  if (a === 'to1') setStep(1)
  if (a === 'newwafer') { newWafer(false); refresh() }
  if (a === 'cut') startCut()
  if (a === 'finish') finishCut()
  if (a === 'retry') { newWafer(true); setStep(2) }
  if (a === 'restart') { newWafer(false); S.reached = 1; setStep(1) }
})
done.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b && e.target !== done) return
  done.classList.add('hide')
  if (b?.dataset.a === 'challenge') { newWafer(true); setStep(2) }
})
addEventListener('keydown', (e) => { if (e.key === 'Escape') done.classList.add('hide') })
addEventListener('resize', () => { refresh(); goView(VIEW, 0) })

// ═══ 每一幀：機構運動、水花、刀片 ═══
const lampOn = (k) => mLamp.forEach((m, i) => (m.emissiveIntensity = i === k ? 7 : 0.12))
let tx = 0.09, iz = 0, yc = YC_UP, rot = 0, spin = 0, flip = 0, cutting = false
let wasBuilding = false
lab.onTick((sdt) => {
  tween()
  if (wasBuilding && !lab._building) { setStep(S.step) }
  wasBuilding = !!lab._building
  const ar = align()
  let txT = 0.09, izT = 0, ycT = YC_UP, rotT = 0, snap = false
  cutting = false
  if (S.step === 1) { flip += sdt; const left = Math.floor(flip / 4) % 2 === 0; txT = camX - (left ? -P.markX : P.markX) / 1000; izT = 0 }
  if (S.step === 4) { txT = 0.11; izT = 0; rotT = 0 }
  const J = S.job
  if (J && S.step === 3) {
    J.tm = Math.min(J.T, J.tm + sdt * S.play)
    while (J.idx < J.passes.length - 1 && J.tm >= J.passes[J.idx].t1) { finishPass(J.passes[J.idx]); J.idx++ }
    const p = J.passes[J.idx], next = J.passes.slice(J.idx + 1).find((q) => !q.rot)
    snap = true
    if (p.rot) {
      const f = clamp((J.tm - p.t0) / (p.t1 - p.t0)), e = f * f * (3 - 2 * f)
      rotT = (Math.PI / 2) * e; txT = next ? next.len / 2000 : 0; izT = next ? -next.s / 1000 : 0; ycT = YC_UP
    } else {
      rotT = p.ch === 2 ? Math.PI / 2 : 0
      if (J.tm < p.tc) {
        const f = clamp((J.tm - p.t0) / (p.tc - p.t0))
        txT = (p.len / 2 - f * p.len) / 1000; izT = -p.s / 1000; ycT = ycCut(S.depth); cutting = true
        if (f > p.done) { paintKerf(p, p.done, f); p.done = f }
      } else {
        finishPass(p)
        const f = clamp((J.tm - p.tc) / (p.t1 - p.tc)), up = clamp(f / 0.25), mv = clamp((f - 0.2) / 0.8), e = mv * mv * (3 - 2 * mv)
        ycT = lerp(ycCut(S.depth), YC_UP, up)
        const nx = next ? next.len / 2000 : 0.09, nz = next && next.ch === p.ch ? -next.s / 1000 : 0
        txT = lerp(-p.len / 2000, nx, e); izT = lerp(-p.s / 1000, nz, e); rotT = p.ch === 2 ? Math.PI / 2 : 0
      }
    }
    const done = J.tm >= J.T
    const pi = J.passes.filter((q) => !q.rot).indexOf(p), np = J.passes.filter((q) => !q.rot).length
    lab.setHero((J.tm / J.T) * 100, { state: cutting ? `方向 ${p.ch}：切割中` : p.rot ? '轉 90° 換方向' : '抬刀、換道', sub: `${fmt(S.rpm)} rpm · ${S.feed} mm/s · 深度 ${S.depth} µm` })
    setTxt('pass', p.rot ? '轉 90°' : `方向 ${p.ch}，第 ${pi + 1 - (p.ch === 2 ? DICE.STREETS.length : 0)}／${DICE.STREETS.length} 道`)
    setTxt('clock', `${mmss(J.tm)}／${mmss(J.T)}`)
    drawProgress()
    if (done) completeCut()
  }
  // 平滑或直接跟隨
  const k = snap ? 1 : 1 - Math.exp(-sdt / 0.35)
  tx = lerp(tx, txT, k); iz = lerp(iz, izT, k); yc = lerp(yc, ycT, snap ? 1 : 1 - Math.exp(-sdt / 0.25)); rot = lerp(rot, rotT, k)
  tableG.position.x = tx; spindleG.position.z = iz; zG.position.y = yc
  waferG.rotation.y = rot + (ar.dth * Math.PI) / 180 * 0 // θ 誤差太小看不見，不畫
  // 刀片轉動（畫面放慢：真實 500 轉/秒 → 約 3 轉/秒）
  const spinning = S.step === 2 || S.step === 3
  spin = approach(spin, spinning ? S.rpm / 30000 : 0, 0.6, sdt)
  bladeG.rotation.z -= sdt * spin * 3 * Math.PI * 2
  // 水花：切割時從噴嘴與刀口噴出（座標換到機台座標）
  if (cutting && !REDUCED) {
    const base = [0, yc, iz], n = Math.round(sdt * 1500)
    for (const [x, y, z, dx, dy] of TIPS) spray.emit([base[0] + x, base[1] + y, base[2] + z], [dx * 0.8, dy, 0], 0.32, 0.2, Math.ceil(n / 5), 0.14)
    spray.emit([0.006, WT + 0.0008, iz], [0.9, 1.0, 0], 0.32, 0.8, Math.ceil(n / 3), 0.2)
  }
  spray.update(sdt)
  lampOn(S.step === 3 ? 2 : S.step === 4 && S.res && !S.res.complete ? 0 : 1)
})

// ═══ 開始 ═══
resetWafer()
setStep(1)
goView('all', 0)
lab.start(); lab._started = true
if (!MOBILE()) lab.toggle('labels', true)
syncModes()
setTimeout(() => { if (S.step === 1 && VIEW === 'all') goView('camera', 1.6) }, REDUCED ? 0 : 4200)
// 測試用介面
window.__dice = {
  S, DICE, refresh, setStep, startCut, finishCut, goView,
  alignPerfect() { SL.x.set(-S.mis.dx); SL.y.set(-S.mis.dy); SL.th.set(-S.mis.dth); refresh() },
  setParams({ rpm, feed, depth }) { if (rpm) SL.rpm.set(rpm); if (feed) SL.feed.set(feed); if (depth) SL.depth.set(depth); refresh() },
  get res() { return S.res },
  seek(i, f = 0.5, play = 0.15) { const J = S.job; if (!J) return; const p = J.passes.filter((q) => !q.rot)[i]; J.tm = p.t0 + f * (p.tc - p.t0); S.play = play },
}
setTimeout(() => { window.__ready = true }, 50)
