// ═══ 微動探針台下針量測（高中版）：場景與介面。build_lab.py 會把 solver.js 塞進下方的 SOLVER 佔位 ═══
const { THREE, Lab, MAT, mat, GEO, approach } = window.LabKit
const Q = new URLSearchParams(location.search)
const EMBED = Q.has('embed')
const REDUCED = matchMedia('(prefers-reduced-motion: reduce)').matches
const MOBILE = () => innerWidth < 760
/*__SOLVER__*/
const P = PS.P
// 系列語意色（同時用形狀區分）
const C = { bg: '#141414', ink: '#ECEEDF', mute: '#AAAAAA', blue: '#58C4DD', orange: '#F2A65A', yellow: '#F9D976', green: '#5CD0B3', red: '#FC6255', violet: '#B79CED' }
const NEEDLE = { A: { name: '左針', pad: 'pad A（左）', col: C.orange, sym: '◎' }, B: { name: '右針', pad: 'pad B（右）', col: C.violet, sym: '◇' } }
const CST = {
  air: { sym: '○', zh: '懸空', col: C.mute },
  off: { sym: '△', zh: '沒對準 pad（落在保護層）', col: C.orange },
  touch: { sym: '◐', zh: '剛碰到（接觸不穩）', col: C.yellow },
  good: { sym: '●', zh: '良好接觸', col: C.green },
  scratch: { sym: '✖', zh: '針壓過大', col: C.red },
}

// ═══ 樣式 ═══
const css = document.createElement('style')
css.textContent = `
.lab-night { --paper:#141414; --ink:#ECEEDF; --mute:#AAAAAA; --faint:#555; --line:#2c2c2c;
  --serif:'PingFang TC','Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif; --sans:'PingFang TC','Noto Sans TC','Microsoft JhengHei',system-ui,sans-serif }
html,body { font-size:15px; background:#141414 }
.lab-pills, .lab-scale, .lab-modes, .lab-ctls { display:none !important }
.lab-prompt { left:12px; top:12px; max-width:calc(100vw - 470px); font-size:14px; padding:.5em .9em; color:#AAAAAA }
.lab-side { top:12px; bottom:12px; right:12px; transform:none; width:420px; overflow-y:auto; overflow-x:hidden; pointer-events:auto; padding:12px 14px 14px; background:rgba(20,20,20,.92); border:1px solid #2c2c2c; border-radius:10px; scrollbar-width:thin }
.lab-no { font-size:13px; color:#AAAAAA; margin-bottom:2px }
.lab-title { font-size:21px; line-height:1.2; font-weight:600 }
.lab-title i { font-size:13px; font-style:normal; color:#AAAAAA; margin-top:2px }
.lab-metric { margin-top:8px } .lab-metric .lbl { font-size:14px; color:#AAAAAA }
.lab-big { font-size:34px; font-family:var(--sans); font-weight:600; line-height:1.1 } .lab-big i { font-size:18px; color:#AAAAAA }
.lab-bar { margin:3px 0 6px } .lab-bar > div { background:${C.green} }
.lab-sub { font-size:14px; color:#cfd1c4; line-height:1.5 }
.lab-how { position:static; width:auto; margin-top:12px; font-size:13px; color:#AAAAAA; display:block !important }
.lab-how summary { font-size:14px } .lab-how .eq { font-size:13px; color:#d6d8cc }
.lab-lab { font-size:14px } .lab-lab small { font-size:12.5px; color:#AAAAAA }
#ps-left { position:absolute; left:12px; top:58px; width:320px; display:flex; flex-direction:column; gap:10px; pointer-events:auto }
.lab-embed .lab-prompt, .lab-embed .lab-no, .lab-embed .lab-title { display:none }
.lab-embed #ps-left { top:12px }
.ps-lbl-on #ps-left { display:none }
.ps-card { background:rgba(20,20,20,.92); border:1px solid #2c2c2c; border-radius:10px; padding:8px 10px 9px }
.ps-card h4 { margin:0 0 6px; font-size:14px; font-weight:600; display:flex; justify-content:space-between; gap:6px; color:${C.ink} }
.ps-card h4 small { font-weight:400; color:#AAAAAA; font-size:13px; text-align:right }
.ps-card canvas { display:block; width:100%; border-radius:6px; background:#0c0d0f }
#cv-map { cursor:pointer; touch-action:manipulation }
.ps-legend { display:flex; flex-wrap:wrap; gap:3px 12px; font-size:13px; color:#AAAAAA; margin-top:6px }
.ps-legend b { font-weight:700; margin-right:3px }
.ps-cstat { font-size:13px; line-height:1.5; margin-top:6px; color:#cfd1c4 }
.ps-cstat div { display:flex; gap:6px } .ps-cstat .t { min-width:3.2em }
.ps-sticky { position:sticky; top:-12px; z-index:2; background:#141414; margin:8px -14px 0; padding:4px 14px 8px; border-bottom:1px solid #2a2a2a }
.ps-steps { display:flex; gap:4px }
.ps-steps span { flex:1; text-align:center; font-size:13px; padding:4px 2px; border-radius:6px; border:1px solid #333; color:#AAAAAA; white-space:nowrap }
.ps-steps span.cur { border-color:${C.blue}; color:${C.ink}; background:rgba(88,196,221,.14); font-weight:600 }
.ps-steps span.done { color:${C.green}; border-color:#2f5a50 }
.ps-hint { margin-top:8px; font-size:14px; line-height:1.55; border-left:3px solid ${C.yellow}; padding:6px 10px; background:rgba(249,217,118,.07); border-radius:4px; color:${C.ink}; min-height:3.2em }
.ps-sec { margin-top:12px; border-top:1px solid #2a2a2a; padding-top:8px }
.ps-sec h3 { margin:0 0 6px; font-size:15px; font-weight:600 } .ps-sec h3 small { font-weight:400; font-size:13px; color:#AAAAAA; margin-left:6px }
.ps-row { display:flex; flex-wrap:wrap; gap:6px; align-items:center; margin-top:6px }
.ps-btn { font:inherit; font-size:14px; color:${C.ink}; background:#1d1f22; border:1px solid #3a3a3a; border-radius:8px; padding:.42em .8em; cursor:pointer; white-space:nowrap; line-height:1.25; touch-action:manipulation }
.ps-btn:hover:not(:disabled) { border-color:#888 } .ps-btn:active:not(:disabled) { transform:translateY(1px) }
.ps-btn.act { background:${C.blue}; color:#0f1418; border-color:${C.blue}; font-weight:600 }
.ps-btn:disabled { opacity:.38; cursor:not-allowed }
.ps-btn:focus-visible { outline:2px solid ${C.yellow}; outline-offset:2px }
.ps-btn.big { width:100%; font-size:15px; padding:.55em; background:#1b2b33; border-color:${C.blue}; font-weight:600 }
.ps-btn.good { flex:1; border-color:${C.green}; color:${C.green}; font-weight:600; font-size:15px; padding:.5em }
.ps-btn.bad { flex:1; border-color:${C.red}; color:${C.red}; font-weight:600; font-size:15px; padding:.5em }
.ps-seg { display:flex; gap:4px; margin-top:6px } .ps-seg .ps-btn { flex:1; padding:.38em .4em }
.ps-seg .tag { display:inline-block; width:.7em; height:.7em; border-radius:50%; margin-right:4px; vertical-align:.02em }
.ps-pad { display:grid; grid-template-columns:auto 1fr; gap:12px; align-items:center; margin-top:8px }
.ps-xy { display:grid; grid-template-columns:repeat(3,48px); grid-template-rows:repeat(3,36px); gap:4px }
.ps-xy .ps-btn { padding:0; font-size:13px }
.ps-xy .mid { display:flex; align-items:center; justify-content:center; font-size:12px; color:#777; text-align:center; line-height:1.1 }
.ps-z { display:flex; flex-direction:column; gap:6px } .ps-z .ps-btn { width:100% }
.ps-stepinfo { font-size:12.5px; color:#AAAAAA; margin-top:4px }
.ps-gauge { display:grid; grid-template-columns:44px 1fr; gap:2px 8px; align-items:center; margin-top:8px; font-size:13px }
.ps-gauge .nm { font-weight:600 }
.ps-bar { position:relative; height:12px; border-radius:6px; background:linear-gradient(to right,#3a3d42 0 62.5%,${C.yellow} 62.5% 68.75%,${C.green} 68.75% 84.375%,${C.red} 84.375% 100%) }
.ps-bar i { position:absolute; top:-6px; width:0; height:0; border-left:6px solid transparent; border-right:6px solid transparent; border-top:9px solid ${C.ink}; transform:translateX(-6px); transition:left .12s }
.ps-gtxt { grid-column:2; color:#cfd1c4; font-size:12.5px }
.ps-zkey { display:flex; flex-wrap:wrap; gap:2px 10px; font-size:12px; color:#AAAAAA; margin-top:6px }
#cv-iv { display:block; width:100%; border-radius:6px; background:#0c0d0f; margin-top:8px }
.ps-read { font-size:14px; margin-top:6px; line-height:1.5; min-height:1.5em }
.ps-fb { font-size:14px; margin-top:8px; line-height:1.55; min-height:1.4em }
.ps-fb .ok { color:${C.green}; font-weight:600 } .ps-fb .ng { color:${C.red}; font-weight:600 }
.ps-tools { margin-top:12px; border-top:1px solid #2a2a2a; padding-top:10px } .ps-tools .ps-btn { flex:1 }
.ps-modal { position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,.6); pointer-events:auto; z-index:6; padding:16px }
.ps-modal.on { display:flex }
.ps-modal .box { max-width:580px; width:100%; max-height:calc(100vh - 32px); overflow:auto; background:#1a1b1d; border:1px solid #3a3a3a; border-radius:12px; padding:16px 18px; line-height:1.65; font-size:15px; color:${C.ink} }
.ps-modal h2 { margin:0 0 8px; font-size:20px } .ps-modal h3 { margin:14px 0 4px; font-size:16px; color:${C.blue} }
.ps-modal p { margin:4px 0 } .ps-modal ul { margin:4px 0; padding-left:1.3em } .ps-modal li { margin:2px 0 }
.ps-modal .kv { display:grid; grid-template-columns:repeat(2,1fr); gap:8px; margin:10px 0 }
.ps-modal .kv div { background:#232528; border-radius:8px; padding:8px 10px; font-size:13px; color:#AAAAAA } .ps-modal .kv b { display:block; font-size:22px; color:${C.ink} }
.ps-modal .close { float:right; margin:-4px -4px 0 8px }
#ps-toast { position:fixed; left:calc((344px + 100vw - 444px) / 2); top:16px; transform:translateX(-50%); max-width:min(460px, calc(100vw - 32px)); background:#2a1715; border:1px solid ${C.red}; color:${C.ink}; padding:8px 14px; border-radius:8px; font-size:14px; line-height:1.45; opacity:0; transition:opacity .25s; pointer-events:none; z-index:5; text-align:center }
#ps-toast.info { background:#13262c; border-color:${C.blue} }
#ps-toast.on { opacity:1 }
@media (max-width:1199px) and (min-width:761px) {
  .lab-side { width:330px; padding:10px 12px }
  .ps-sticky { margin:6px -12px 0; padding:4px 12px 8px; top:-10px }
  #ps-left { width:250px }
  .lab-prompt { max-width:calc(100vw - 370px) }
  .lab-big { font-size:32px } .lab-title { font-size:20px }
  .ps-xy { grid-template-columns:repeat(3,40px); grid-template-rows:repeat(3,32px) }
  .ps-pad { gap:8px }
  #ps-toast { left:calc((274px + 100vw - 354px) / 2) }
}
@media (max-width:760px) {
  .lab-prompt { display:none }
  .lab-side { position:fixed; top:42vh; bottom:0; left:0; right:0; width:auto; border-radius:0; border-width:1px 0 0; padding:10px 14px 30px; background:#141414 }
  .lab-title { font-size:20px } .lab-big { font-size:32px } .lab-no { display:none }
  .ps-sticky { top:-10px }
  #ps-left { position:static; width:auto; margin-top:10px }
  #cv-map { max-width:320px; margin:0 auto }
  .lab-labels .lab-lab { font-size:12px } .lab-labels .lab-lab small { display:none }
  #ps-toast { left:50%; top:calc(42vh - 64px) }
  .ps-lbl-on #ps-left { display:flex }
}`

// ═══ 3D 場景（單位：公尺；Y 朝上；地板 y＝0）═══
const V_ALL = { az: 30, el: 28, dist: 2.75, target: [0, 0.22, 0], fov: 30 }
const V_TIP = { az: 18, el: 26, dist: 0.3, target: [0, 0.118, 0], fov: 30 }
const lab = new Lab({
  prompt: '微動探針台：真空夾盤上一片 6 吋晶圓，左右兩支鎢探針下到晶粒的金屬 pad 上，量 I-V 判定好壞',
  no: '晶圓測試（CP）· 互動 3D', title: '微動探針台下針量測', sub: '選晶粒 → 對針下針 → 量 I-V → 判定良品',
  size: 0.75, theme: 'night', bg: 0x141414, exposure: 0.95, envIntensity: 0.95,
  view: { ...V_ALL, frameX: 0 }, pills: [], noIntro: REDUCED || EMBED, autoOrbit: false, labelGap: 40,
})
lab.bloom.strength = 0.25; lab.bloom.threshold = 0.85
document.head.appendChild(css) // 放在 kit 的樣式之後，才蓋得過去
const part = (name, geo, material, o = {}) => lab.mesh(geo, material, { name, ...o })
const M = {
  base: MAT.paint({ color: [0.11, 0.115, 0.125] }),
  stage: MAT.anodised({ color: [0.06, 0.065, 0.075] }),
  alu: MAT.aluminium(), aluM: MAT.aluminiumMachined(),
  chuck: MAT.aluminiumMachined({ color: [0.82, 0.83, 0.85] }),
  groove: MAT.steelDark(),
  scope: MAT.paint({ color: [0.78, 0.79, 0.78] }),
  scopeDark: MAT.satin({ color: [0.05, 0.05, 0.055] }),
  chrome: MAT.chrome(),
  knurl: MAT.aluminiumMachined({ finish: 'knurl', rep: [10, 1] }),
  cap: MAT.plastic({ color: [0.03, 0.03, 0.035] }),
  arm: MAT.stainless(), brass: MAT.brass(),
  tungsten: mat({ color: [0.52, 0.52, 0.55], metalness: 1, roughness: 0.22, finish: null }),
  smu: MAT.paint({ color: [0.09, 0.09, 0.1] }),
  cable: MAT.rubber(),
  ring: mat({ color: [0, 0, 0], emissive: [1, 0.98, 0.92], emissiveIntensity: 2.2, metalness: 0, roughness: 1, finish: null }),
  glass: MAT.glass(),
}
const tagMat = (hex) => { const c = new THREE.Color(hex); return mat({ color: [c.r, c.g, c.b], emissive: [c.r, c.g, c.b], emissiveIntensity: 0.7, metalness: 0, roughness: 0.4, finish: null }) }

// 底座與 XY 平台
part('探針台底座', GEO.rbox(0.74, 0.05, 0.56, 0.006), M.base, { pos: [0, 0.025, 0], explode: [0, -0.08, 0], label: '探針台底座', value: () => '又重又穩，擋住振動', at: [-0.3, 0.02, 0.24] })
const stage = new THREE.Group()
stage.add(new THREE.Mesh(GEO.rbox(0.36, 0.018, 0.30, 0.003), M.stage).translateY(0.059))
for (const z of [-0.1, 0.1]) stage.add(new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, 0.34, 24).rotateZ(Math.PI / 2), M.aluM).translateY(0.071).translateZ(z))
stage.add(new THREE.Mesh(GEO.rbox(0.24, 0.012, 0.22, 0.002), M.alu).translateY(0.078))
lab.add(stage, { name: 'XY 平台', explode: [0, -0.04, 0], label: 'XY 移動平台', value: () => '把晶粒送到顯微鏡下', at: [0.17, 0.07, 0.12] })
// 夾盤組（會移動）：晶圓座標 (x,y) mm → 夾盤位移 (−x, +y→+z)
const WT = 0.1092 // 晶圓上表面高度
const chuckG = new THREE.Group()
chuckG.add(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.034, 0.012, 48).translate(0, 0.09, 0), M.aluM))
const chuck = new THREE.Mesh(GEO.disc(0.082, 0.014, 0.0015), M.chuck); chuck.position.y = 0.101; chuckG.add(chuck)
for (const r of [0.022, 0.042, 0.062]) chuckG.add(new THREE.Mesh(new THREE.TorusGeometry(r, 0.0007, 6, 96).rotateX(Math.PI / 2).translate(0, 0.108, 0), M.groove))
lab.add(chuckG, { name: '真空夾盤', explode: [0, 0.03, 0], label: '真空夾盤', value: () => '抽真空吸住晶圓、帶著走', at: [-0.07, 0.1, 0.045] })
// 晶圓：6 吋（150 mm），主平邊朝前；表面是會更新的晶圓圖貼圖
const WTEX = document.createElement('canvas'); WTEX.width = WTEX.height = 1024
const waferTex = new THREE.CanvasTexture(WTEX); waferTex.colorSpace = THREE.SRGBColorSpace; waferTex.anisotropy = 8
const waferGeo = (() => {
  const R = P.R / 1000, fh = P.flatHalf / 1000, fy = -Math.sqrt(R * R - fh * fh)
  const sh = new THREE.Shape(); sh.moveTo(fh, fy); sh.absarc(0, 0, R, Math.atan2(fy, fh), Math.atan2(fy, -fh) + Math.PI * 2, false); sh.closePath()
  const g = GEO.extrude(sh, 0.0011, 0.0001)
  const pos = g.attributes.position, uv = g.attributes.uv
  for (let k = 0; k < pos.count; k++) uv.setXY(k, (pos.getX(k) + R) / (2 * R), (pos.getY(k) + R) / (2 * R))
  g.rotateX(-Math.PI / 2); g.translate(0, WT - 0.00055, 0); return g
})()
const wafer = new THREE.Mesh(waferGeo, mat({ color: [1, 1, 1], map: waferTex, metalness: 0.35, roughness: 0.3, clearcoat: 0.6, clearcoatRoughness: 0.15, finish: null }))
lab.add(wafer, { parent: chuckG, name: '6 吋晶圓', explode: [0, 0.05, 0], label: '6 吋晶圓（直徑 150 mm）', value: () => '61 顆晶粒還沒切開', at: [0.045, WT, 0.05] })
// 顯微鏡
const scope = new THREE.Group()
scope.add(new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.026, 0.47, 48).translate(0, 0.285, -0.23), M.scope))
scope.add(new THREE.Mesh(GEO.rbox(0.07, 0.06, 0.26, 0.01), M.scope).translateY(0.49).translateZ(-0.115))
for (const s of [-1, 1]) scope.add(new THREE.Mesh(GEO.disc(0.022, 0.012).rotateZ(Math.PI / 2), M.scopeDark).translateX(s * 0.042).translateY(0.49).translateZ(-0.17))
scope.add(new THREE.Mesh(GEO.disc(0.027, 0.17), M.scope).translateY(0.385))
scope.add(new THREE.Mesh(GEO.disc(0.042, 0.018), M.scopeDark).translateY(0.292))
const obj0 = new THREE.Mesh(GEO.lathe([[0, 0.228], [0.006, 0.228], [0.009, 0.236], [0.011, 0.25], [0.011, 0.283], [0, 0.283]], 48), M.chrome); scope.add(obj0)
scope.add(new THREE.Mesh(new THREE.TorusGeometry(0.0112, 0.0012, 8, 48).rotateX(Math.PI / 2).translate(0, 0.262, 0), tagMat(C.yellow)))
for (const a of [2.1, -2.1]) { const o = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.008, 0.045, 32).translate(0, -0.0225, 0), M.chrome); o.position.set(Math.sin(a) * 0.026, 0.285, Math.cos(a) * 0.026); o.rotation.set(Math.cos(a) * 0.35, 0, -Math.sin(a) * 0.35); scope.add(o) }
scope.add(new THREE.Mesh(new THREE.TorusGeometry(0.0085, 0.0018, 8, 48).rotateX(Math.PI / 2).translate(0, 0.229, 0), M.ring))
scope.add(new THREE.Mesh(GEO.rbox(0.09, 0.05, 0.09, 0.012), M.scope).translateY(0.545).translateZ(0.005))
for (const s of [-1, 1]) { const e = new THREE.Mesh(new THREE.CylinderGeometry(0.0105, 0.0105, 0.075, 32), M.scopeDark); e.position.set(s * 0.023, 0.585, 0.05); e.rotation.x = 0.75; scope.add(e) }
scope.add(new THREE.Mesh(GEO.disc(0.018, 0.05), M.scopeDark).translateY(0.595).translateZ(-0.02))
lab.add(scope, { name: '顯微鏡', explode: [0, 0.14, 0], label: '顯微鏡', value: () => '放大看 pad 和針尖，對準全靠它', at: [0.02, 0.56, 0.03] })
// 微動探針座 ×2：三軸旋鈕＋會動的探針臂（臂、針座、鎢針）
const knobs = { A: {}, B: {} }, carriage = {}, tipBase = {}
function knob(axis) {
  const g = new THREE.Group(), k = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.02, 48), M.knurl)
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.0125, 0.0125, 0.004, 48).translate(0, 0.012, 0), M.cap)
  const idx = new THREE.Mesh(new THREE.BoxGeometry(0.0025, 0.0012, 0.01).translate(0, 0.0142, 0.004), tagMat(C.ink))
  const spin = new THREE.Group(); spin.add(k, cap, idx); g.add(spin)
  if (axis === 'x') g.rotation.z = -Math.PI / 2; if (axis === '-x') g.rotation.z = Math.PI / 2; if (axis === 'z') g.rotation.x = Math.PI / 2
  g.userData.spin = spin; return g
}
for (const [k, s] of [['A', -1], ['B', 1]]) {
  const g = new THREE.Group(); g.position.set(s * 0.21, 0.05, 0)
  g.add(new THREE.Mesh(GEO.rbox(0.09, 0.03, 0.11, 0.004), M.stage).translateY(0.015))
  g.add(new THREE.Mesh(GEO.rbox(0.075, 0.02, 0.09, 0.003), M.alu).translateY(0.04))
  g.add(new THREE.Mesh(GEO.rbox(0.075, 0.02, 0.075, 0.003), M.aluM).translateY(0.06))
  g.add(new THREE.Mesh(GEO.rbox(0.05, 0.075, 0.045, 0.003), M.alu).translateY(0.1075))
  g.add(new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.006, 0.047), tagMat(NEEDLE[k].col)).translateY(0.078))
  const kx = knob(s > 0 ? 'x' : '-x'); kx.position.set(s * 0.0475, 0.06, 0); g.add(kx)
  const ky = knob('z'); ky.position.set(0, 0.04, 0.055); g.add(ky)
  const kz = knob('y'); kz.position.set(0, 0.155, 0); g.add(kz)
  knobs[k] = { x: kx.userData.spin, y: ky.userData.spin, z: kz.userData.spin }
  lab.add(g, { name: `微動探針座（${NEEDLE[k].name}）`, explode: [s * 0.12, 0, 0.04], label: k === 'A' ? '微動探針座' : undefined, value: () => '轉旋鈕，一格只動幾微米', at: [0, 0.03, 0.055] })
  // 探針臂（carriage，世界座標建在原點，再整組平移）
  const c = new THREE.Group()
  c.add(new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.012, 0.014), M.arm).translateX(s * 0.1225).translateY(0.175))
  c.add(new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.036, 0.014), M.arm).translateX(s * 0.062).translateY(0.16))
  const T = new THREE.Vector3(s * 0.006, WT, 0), B = new THREE.Vector3(s * 0.042, 0.137, 0), d = T.clone().sub(B).normalize(), L = T.distanceTo(B)
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.clone().negate())
  const holder = new THREE.Mesh(new THREE.CylinderGeometry(0.0035, 0.0035, 0.022, 32), M.brass); holder.quaternion.copy(q); holder.position.copy(B).addScaledVector(d, -0.011); c.add(holder)
  const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.0045, 0.0045, 0.005, 32), tagMat(NEEDLE[k].col)); collar.quaternion.copy(q); collar.position.copy(B).addScaledVector(d, -0.017); c.add(collar)
  const needle = new THREE.Mesh(new THREE.CylinderGeometry(0.0009, 0.00006, L, 24), M.tungsten); needle.quaternion.copy(q); needle.position.copy(B).addScaledVector(d, L / 2); c.add(needle)
  lab.add(c, { name: `鎢探針（${NEEDLE[k].name}）`, explode: [s * 0.1, 0.07, 0], label: k === 'B' ? '鎢探針' : undefined, value: () => '很細很硬，針尖只有幾微米', at: [s * 0.03, 0.128, 0] })
  carriage[k] = c; tipBase[k] = T
}
lab.label(knobs.A.x.parent, '三軸旋鈕', { at: [0, 0.01, 0], value: () => 'X 左右・Y 前後・Z 上下' })
// 電源量測單元（SMU）與訊號線
const SCR = document.createElement('canvas'); SCR.width = 320; SCR.height = 200
const scrTex = new THREE.CanvasTexture(SCR); scrTex.colorSpace = THREE.SRGBColorSpace
const smu = new THREE.Group(); smu.position.set(0.25, 0.05, -0.2)
smu.add(new THREE.Mesh(GEO.rbox(0.17, 0.095, 0.12, 0.006), M.smu).translateY(0.0475))
const scr = new THREE.Mesh(new THREE.PlaneGeometry(0.09, 0.056), new THREE.MeshBasicMaterial({ map: scrTex, toneMapped: false })); scr.position.set(-0.028, 0.055, 0.0605); smu.add(scr)
for (const [y, col] of [[0.072, C.green], [0.052, C.yellow], [0.032, C.red]]) smu.add(new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.004, 24).rotateX(Math.PI / 2), tagMat(col)).translateX(0.05).translateY(y).translateZ(0.061))
smu.add(new THREE.Mesh(GEO.disc(0.011, 0.008).rotateX(Math.PI / 2), M.knurl).translateX(0.05).translateY(0.016).translateZ(0.064))
lab.add(smu, { name: '電源量測單元', explode: [0.08, 0.02, -0.08], label: '電源量測單元（SMU）', value: () => '加電壓、量電流', at: [0.06, 0.095, 0] })
const cab = new THREE.Group()
cab.add(new THREE.Mesh(GEO.pipe([[0.2, 0.08, -0.14], [0.12, 0.056, -0.12], [-0.06, 0.056, -0.12], [-0.2, 0.06, -0.08], [-0.21, 0.1, -0.035], [-0.21, 0.13, -0.022]], 0.003), M.cable))
cab.add(new THREE.Mesh(GEO.pipe([[0.27, 0.08, -0.14], [0.24, 0.06, -0.09], [0.215, 0.1, -0.035], [0.21, 0.13, -0.022]], 0.003), M.cable))
lab.add(cab, { name: '訊號線', explode: [0, 0.02, -0.06] })

// ═══ 狀態 ═══
const S = {
  die: -1, target: { x: 0, y: 0 }, chuck: { x: 0, y: 0 }, moving: false,
  tips: { A: { x: -470, y: 170, z: 150 }, B: { x: 520, y: -160, z: 150 } },
  disp: { A: { x: -470, y: 170, z: 150 }, B: { x: 520, y: -160, z: 150 } },
  hurt: { A: false, B: false }, marked: { A: false, B: false }, marks: {},
  who: 'A', step: 'coarse', results: {}, scratches: 0, meas: null, measCount: 0, fb: '', doneShown: false,
  view: 'all', tween: null, hover: -1, flash: 0,
}
const die = () => PS.DIES[S.die]
const pads = () => { const pc = PS.padCenters(die()); return { A: pc.A, B: pc.B } }
const cstate = (k) => (S.die < 0 ? 'air' : PS.contact(S.tips[k], pads()[k]).state)
const stats = () => PS.stats(S.results, S.scratches)
let dirty = true

// ═══ 介面 ═══
const el = (h) => { const t = document.createElement('template'); t.innerHTML = h.trim(); return t.content.firstChild }
const side = lab.$('.lab-side')
lab.hero({ label: '良率（依你的判定）', unit: '%', max: 100, digits: 0 })
const left = el(`<div id="ps-left">
  <div class="ps-card" id="card-map"><h4><span>晶圓圖</span><small data-r="mapTag">點一顆晶粒</small></h4><canvas id="cv-map" aria-label="晶圓圖：點選晶粒"></canvas>
    <div class="ps-legend"><span><b style="color:${C.green}">■</b>良品</span><span><b style="color:${C.red}">✕</b>不良</span><span><b style="color:${C.mute}">□</b>未測</span><span><b style="color:${C.blue}">▣</b>選取中</span></div></div>
  <div class="ps-card" id="card-scope"><h4><span>顯微鏡視野</span><small data-r="scopeTag">示意，約 1 mm 寬</small></h4><canvas id="cv-scope"></canvas><div class="ps-cstat" data-r="cstat"></div></div>
</div>`)
lab.ui.appendChild(left)
const sticky = el(`<div class="ps-sticky"><div class="ps-steps" data-r="steps"></div><div class="ps-hint" data-r="hint" aria-live="polite"></div></div>`)
const steps = sticky.firstChild, hintEl = sticky.lastChild
const secCtl = el(`<div class="ps-sec"><h3>② 對針與下針<small>先選針，再按方向</small></h3>
  <div class="ps-seg" data-g="who"><button class="ps-btn" data-who="A"><span class="tag" style="background:${C.orange}"></span>左針 ◎</button><button class="ps-btn" data-who="B"><span class="tag" style="background:${C.violet}"></span>右針 ◇</button><button class="ps-btn" data-who="AB">兩支一起</button></div>
  <div class="ps-seg" data-g="step"><button class="ps-btn" data-step="coarse">粗調</button><button class="ps-btn" data-step="fine">細調</button></div>
  <div class="ps-stepinfo" data-r="stepinfo"></div>
  <div class="ps-pad"><div class="ps-xy">
    <span></span><button class="ps-btn" data-mv="y+" aria-label="Y 往上">↑ Y</button><span></span>
    <button class="ps-btn" data-mv="x-" aria-label="X 往左">← X</button><span class="mid">XY</span><button class="ps-btn" data-mv="x+" aria-label="X 往右">X →</button>
    <span></span><button class="ps-btn" data-mv="y-" aria-label="Y 往下">↓ Y</button><span></span></div>
    <div class="ps-z"><button class="ps-btn" data-mv="z+">▲ 抬起（Z）</button><button class="ps-btn" data-mv="z-">▼ 下降（Z）</button><button class="ps-btn" data-mv="lift">兩針都抬起</button></div></div>
  <div data-r="gauges"></div>
  <div class="ps-zkey"><span>○ 懸空</span><span style="color:${C.yellow}">◐ 剛碰到</span><span style="color:${C.green}">● 良好接觸</span><span style="color:${C.red}">✖ 針壓過大</span></div>
</div>`)
const secIV = el(`<div class="ps-sec"><h3>③ 量測 I-V<small>電壓 −1～+1 V，限流 5 mA</small></h3>
  <button class="ps-btn big" data-a="measure">⚡ 量測 I-V</button><canvas id="cv-iv" aria-label="I-V 曲線"></canvas><div class="ps-read" data-r="read"></div></div>`)
const secJ = el(`<div class="ps-sec"><h3>④ 判定<small>良品規格 900～1100 Ω</small></h3>
  <div class="ps-row"><button class="ps-btn good" data-j="1">■ 良品</button><button class="ps-btn bad" data-j="0">✕ 不良</button></div><div class="ps-fb" data-r="fb" aria-live="polite"></div></div>`)
const tools = el(`<div class="ps-row ps-tools"><button class="ps-btn" data-t="labels">零件標籤</button><button class="ps-btn" data-t="explode">爆炸圖</button><button class="ps-btn" data-t="view">近看針尖</button><button class="ps-btn" data-t="info">說明</button></div>`)
const how = lab.$('.lab-how')
lab.how('每顆晶粒放一個 1 kΩ 電阻當測試元件（示意）。量測機把電壓從 −1 V 掃到 +1 V，電流 I＝V ÷（R＋接觸電阻），最多 5 mA（限流，保護元件）。針尖剛碰到 pad 時接觸電阻約 150～400 Ω 而且會抖；再下壓 10～35 µm 才算良好接觸（約 1.5 Ω）；超過 35 µm 會刮傷 pad，針還壓著就橫移也會刮傷。缺陷用固定亂數種子產生，越靠晶圓邊緣越容易壞（開路、短路、阻值超規）。數字都是教學用示意值。',
  ['I = V ÷ (R + R接觸)', '良品：900 Ω ≤ R ≤ 1100 Ω', '良率 = 判為良品的顆數 ÷ 已測顆數', '分數 = 10 × 判對 − 5 × 刮傷'])
for (const x of [sticky, secCtl, secIV, secJ, tools, how]) side.appendChild(x)
const info = el(`<div class="ps-modal" id="ps-info" role="dialog" aria-label="說明"><div class="box"><button class="ps-btn close" data-close>關閉</button>
  <h2>探針台在做什麼？</h2>
  <p>晶片做好以後，幾十到幾百顆晶粒還整片連在晶圓上。<b>晶圓測試（CP，Chip Probing）</b>就是用很細的探針碰每顆晶粒上的金屬 pad，通電量它的電性，把壞的先找出來。</p>
  <p>這台是實驗室常見的<b>微動探針台</b>：從顯微鏡看、轉旋鈕把針對準，一次量一顆。工廠量產改用「探針卡」一次下很多支針，再配合自動探針機一顆接一顆走。</p>
  <h3>為什麼要先測，再切割、封裝？</h3>
  <p>切割、封裝都要花錢（示意：封裝一顆的成本可能比晶粒本身還高）。先在晶圓上把壞晶粒記下來，之後只封裝好的，就不會把錢浪費在壞晶粒上。良率也會回頭告訴製程哪裡出問題——例如邊緣比較容易壞。</p>
  <h3>這個工作站的規則（示意數字）</h3>
  <ul><li>6 吋晶圓＝直徑 150 mm，上面 61 顆完整晶粒，間距 14 mm。</li>
  <li>每顆晶粒的測試元件是 1 kΩ 電阻，良品規格 900～1100 Ω。</li>
  <li>pad 160 µm 見方（大約兩根頭髮寬），兩個 pad 中心相距 600 µm。</li>
  <li>鎢針針尖只有幾微米；碰到 pad 後再下壓 10～35 µm 才接得穩，壓太深會刮傷 pad（扣 5 分）。</li>
  <li>壞的樣子：開路（電流過不去）、短路（電流一下就衝到 5 mA 上限）、阻值超規（太大或太小）。</li></ul>
  <h3>怎麼玩</h3>
  <p>① 在晶圓圖點一顆晶粒 → ② 用 X／Y 把兩支針移到 pad 上、再用 Z 下針 → ③ 量 I-V → ④ 判定良品或不良。正確判定 6 顆就完成！</p></div></div>`)
const doneM = el(`<div class="ps-modal" id="ps-done" role="dialog" aria-label="完成"><div class="box"><h2>完成！你正確判定了 6 顆晶粒</h2><div class="kv" data-r="kv"></div><p data-r="donetxt"></p><div class="ps-row"><button class="ps-btn big" data-close>繼續量更多晶粒</button></div></div></div>`)
const toastEl = el(`<div id="ps-toast" role="status"></div>`)
for (const x of [info, doneM, toastEl]) lab.ui.appendChild(x)
const R = (k) => lab.ui.querySelector(`[data-r="${k}"]`)
const CV = { map: left.querySelector('#cv-map'), scope: left.querySelector('#cv-scope'), iv: secIV.querySelector('#cv-iv') }

function layout() {
  // 手機：3D 在上、控制面板在下（晶圓圖與顯微鏡放進面板）；桌面：左欄＝晶圓圖＋顯微鏡
  if (MOBILE()) { if (left.parentNode !== side) side.insertBefore(left, secCtl) } else if (left.parentNode !== lab.ui) lab.ui.insertBefore(left, info)
  const dpr = Math.min(2, devicePixelRatio || 1)
  const fit = (cv, ratio, max = 1e9) => { const w = Math.min(max, cv.clientWidth || 300), h = Math.round(w * ratio); cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); cv.style.height = h + 'px'; cv._w = w; cv._h = h; cv._dpr = dpr }
  const smallH = !MOBILE() && innerHeight < 700
  fit(CV.map, smallH ? 0.82 : 1, MOBILE() ? 320 : 1e9); fit(CV.scope, smallH ? 0.56 : 0.64); fit(CV.iv, MOBILE() ? 0.6 : 0.52)
  // 3D 主體放在左欄與右側面板之間
  const lw = MOBILE() || document.documentElement.classList.contains('ps-lbl-on') ? 0 : left.getBoundingClientRect().width + 12
  const sw = MOBILE() ? 0 : side.getBoundingClientRect().width + 12
  lab.view.frameX = ((lw + innerWidth - sw) / 2 - innerWidth / 2) / innerWidth
  lab.o.labelMinX = MOBILE() ? 0.3 : Math.max(0.22, (lw + 250) / innerWidth)
  lab.o.labelMaxX = MOBILE() ? 0.5 : (innerWidth - sw - 230) / innerWidth
  lab.o.labelGap = MOBILE() ? 30 : 40
  if (!S.tween) lab._applyView(curView())
  dirty = true; drawAll(true)
}
const curView = () => ({ ...(S.view === 'tip' ? V_TIP : V_ALL), dist: (S.view === 'tip' ? V_TIP.dist : V_ALL.dist) * (MOBILE() ? 0.95 : innerWidth < 1200 ? 0.9 : 1), frameX: lab.view.frameX ?? 0 })

// ═══ 晶圓圖（2D）═══
const MAPPAD = 20
function mapXf() { const w = CV.map._w, h = CV.map._h, s = (Math.min(w, h) - 2 * MAPPAD) / P.waferD; return { s, cx: w / 2 + 4, cy: h / 2 } }
function waferPath(g, cx, cy, s) {
  const R = P.R * s, fh = P.flatHalf, fy = Math.sqrt(P.R ** 2 - fh ** 2)
  g.beginPath(); g.arc(cx, cy, R, Math.atan2(fy, fh), Math.atan2(fy, -fh), true); g.closePath()
}
function drawDieCell(g, d, x, y, w, sel) {
  const r = S.results[d.id]
  if (r && r.good) { g.fillStyle = C.green; g.fillRect(x, y, w, w) }
  else if (r) { g.fillStyle = '#3a2022'; g.fillRect(x, y, w, w); g.strokeStyle = C.red; g.lineWidth = Math.max(1.6, w * 0.13); g.beginPath(); g.moveTo(x + w * 0.2, y + w * 0.2); g.lineTo(x + w * 0.8, y + w * 0.8); g.moveTo(x + w * 0.8, y + w * 0.2); g.lineTo(x + w * 0.2, y + w * 0.8); g.stroke() }
  else { g.fillStyle = '#1e232b'; g.fillRect(x, y, w, w); g.strokeStyle = 'rgba(170,170,170,.7)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, w - 1, w - 1) }
  if (sel) { g.strokeStyle = C.blue; g.lineWidth = 3; g.strokeRect(x - 1.5, y - 1.5, w + 3, w + 3) }
}
function drawMap() {
  const cv = CV.map, g = cv.getContext('2d'); g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0)
  const { s, cx, cy } = mapXf(), w = cv._w, h = cv._h
  g.clearRect(0, 0, w, h); g.fillStyle = '#0c0d0f'; g.fillRect(0, 0, w, h)
  waferPath(g, cx, cy, s); g.fillStyle = '#2b313b'; g.fill(); g.strokeStyle = '#7d8590'; g.lineWidth = 1.5; g.stroke()
  g.save(); waferPath(g, cx, cy, s); g.clip()
  g.fillStyle = '#353b46'; for (const c of PS.PARTIAL) g.fillRect(cx + (c.x - 7) * s + 1, cy - (c.y + 7) * s + 1, 14 * s - 2, 14 * s - 2)
  g.restore()
  for (const d of PS.DIES) drawDieCell(g, d, cx + (d.x - 7) * s + 1, cy - (d.y + 7) * s + 1, 14 * s - 2, false)
  if (S.hover >= 0 && S.hover !== S.die) { const d = PS.DIES[S.hover]; g.strokeStyle = 'rgba(236,238,223,.9)'; g.lineWidth = 2; g.strokeRect(cx + (d.x - 7) * s, cy - (d.y + 7) * s, 14 * s, 14 * s) }
  if (S.die >= 0) { const d = die(); drawDieCell(g, d, cx + (d.x - 7) * s + 1, cy - (d.y + 7) * s + 1, 14 * s - 2, true) }
  g.font = '11px PingFang TC, Noto Sans TC, sans-serif'; g.fillStyle = '#8a8f96'; g.textAlign = 'center'; g.textBaseline = 'middle'
  for (let i = -4; i <= 4; i++) g.fillText('ABCDEFGHI'[i + 4], cx + i * 14 * s, cy - 75 * s - 9)
  g.textAlign = 'right'; for (let j = 4; j >= -4; j--) g.fillText(String(5 - j), cx - 75 * s - 5, cy - j * 14 * s)
  g.textAlign = 'center'; g.fillText('平邊', cx, cy + 69.27 * s - 7)
  g.textAlign = 'left'; g.fillText('6 吋＝150 mm', 4, h - 8)
}
function drawWaferTex() {
  const g = WTEX.getContext('2d'), k = 1024 / P.waferD, X = (x) => (x + P.R) * k, Y = (y) => (P.R - y) * k
  g.fillStyle = '#5a606c'; g.fillRect(0, 0, 1024, 1024)
  g.fillStyle = '#6a717e'; for (const c of PS.PARTIAL) g.fillRect(X(c.x - 7) + 2, Y(c.y + 7) + 2, 14 * k - 4, 14 * k - 4)
  for (const d of PS.DIES) {
    const x = X(d.x - 7) + 2, y = Y(d.y + 7) + 2, w = 14 * k - 4, r = S.results[d.id]
    g.fillStyle = r ? (r.good ? '#4fc7a6' : '#6a3a3a') : '#8b93a1'; g.fillRect(x, y, w, w)
    g.fillStyle = 'rgba(30,34,40,.35)'; g.fillRect(x + w * 0.3, y + w * 0.44, w * 0.4, w * 0.12)
    g.fillStyle = '#d4d8de'; g.fillRect(x + w * 0.2, y + w * 0.42, w * 0.1, w * 0.16); g.fillRect(x + w * 0.7, y + w * 0.42, w * 0.1, w * 0.16)
    if (r && !r.good) { g.strokeStyle = C.red; g.lineWidth = 7; g.beginPath(); g.moveTo(x + 10, y + 10); g.lineTo(x + w - 10, y + w - 10); g.moveTo(x + w - 10, y + 10); g.lineTo(x + 10, y + w - 10); g.stroke() }
    if (d.id === S.die) { g.strokeStyle = C.blue; g.lineWidth = 8; g.strokeRect(x - 2, y - 2, w + 4, w + 4) }
  }
  waferTex.needsUpdate = true
}

// ═══ 顯微鏡視野（Canvas 2D 俯視）═══
const FOV = 1000 // µm
function drawScope() {
  const cv = CV.scope, g = cv.getContext('2d'); g.setTransform(cv._dpr, 0, 0, cv._dpr, 0, 0)
  const w = cv._w, h = cv._h, s = w / FOV, X = (x) => w / 2 + x * s, Y = (y) => h / 2 - y * s
  g.clearRect(0, 0, w, h)
  if (S.die < 0) { g.fillStyle = '#101215'; g.fillRect(0, 0, w, h); g.fillStyle = C.mute; g.font = '14px PingFang TC, Noto Sans TC, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('先在晶圓圖選一顆晶粒', w / 2, h / 2); return }
  const d = die(), pc = pads()
  // 晶粒表面：保護層與底下的金屬走線（淡）
  g.fillStyle = '#1c232c'; g.fillRect(0, 0, w, h)
  g.strokeStyle = 'rgba(120,140,160,.13)'; g.lineWidth = Math.max(1, 6 * s)
  for (let yy = -500; yy <= 500; yy += 70) { g.beginPath(); g.moveTo(0, Y(yy + d.off[1])); g.lineTo(w, Y(yy + d.off[1])); g.stroke() }
  // 電阻（蛇形線，測試元件）
  g.strokeStyle = 'rgba(242,166,90,.85)'; g.lineWidth = Math.max(1.5, 14 * s); g.lineJoin = 'round'; g.beginPath()
  const x0 = pc.A[0] + P.pad.half, x1 = pc.B[0] - P.pad.half, oy = pc.A[1], n = 7
  g.moveTo(X(x0), Y(oy))
  for (let i = 0; i <= n; i++) { const xx = x0 + 30 + (x1 - x0 - 60) * i / n, yy = oy + (i % 2 ? -110 : 110); g.lineTo(X(xx), Y(oy)); g.lineTo(X(xx), Y(yy)); g.lineTo(X(xx + (x1 - x0 - 60) / n / 2), Y(yy)) }
  g.lineTo(X(x1), Y(oy)); g.stroke()
  g.fillStyle = 'rgba(242,166,90,.9)'; g.font = `${Math.max(11, 13)}px PingFang TC, Noto Sans TC, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'bottom'; g.fillText('電阻（測試元件）', X((x0 + x1) / 2), Y(oy + 130))
  // pad
  for (const [k, c] of [['A', pc.A], ['B', pc.B]]) {
    const hx = P.pad.half, gr = g.createLinearGradient(X(c[0] - hx), Y(c[1] + hx), X(c[0] + hx), Y(c[1] - hx)); gr.addColorStop(0, '#d9dde3'); gr.addColorStop(1, '#8f959f')
    g.fillStyle = gr; g.fillRect(X(c[0] - hx), Y(c[1] + hx), 2 * hx * s, 2 * hx * s); g.strokeStyle = '#eef0f3'; g.lineWidth = 1; g.strokeRect(X(c[0] - hx) + 0.5, Y(c[1] + hx) + 0.5, 2 * hx * s - 1, 2 * hx * s - 1)
    g.fillStyle = '#c9ccd2'; g.textBaseline = 'top'; g.fillText(k === 'A' ? 'pad A' : 'pad B', X(c[0]), Y(c[1] - hx) + 3)
  }
  // 針痕／刮痕
  for (const m of S.marks[S.die] || []) {
    if (m.kind === 'mark') { g.fillStyle = 'rgba(60,64,70,.75)'; g.beginPath(); g.ellipse(X(m.x), Y(m.y), 3, 2, 0, 0, Math.PI * 2); g.fill() }
    else { g.strokeStyle = 'rgba(70,40,40,.9)'; g.lineWidth = 4; g.lineCap = 'round'; g.beginPath(); g.moveTo(X(m.x) - 4, Y(m.y) - 2); g.lineTo(X(m.x2 ?? m.x) + 4, Y(m.y2 ?? m.y) + 2); g.stroke(); g.strokeStyle = C.red; g.lineWidth = 1.2; g.stroke(); g.lineCap = 'butt' }
  }
  // 十字準線＋比例尺
  g.strokeStyle = 'rgba(88,196,221,.25)'; g.lineWidth = 1; g.beginPath(); g.moveTo(w / 2, 0); g.lineTo(w / 2, h); g.moveTo(0, h / 2); g.lineTo(w, h / 2); g.stroke()
  g.fillStyle = C.ink; g.fillRect(10, h - 12, 100 * s, 3); g.font = '11px PingFang TC, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText('100 µm', 10, h - 15)
  // 針：先畫影子（離表面越高，影子離針尖越遠），再畫針（越高越模糊＝景深）
  for (const k of ['A', 'B']) {
    const t = S.disp[k], sg = k === 'A' ? -1 : 1, z = Math.max(0, t.z)
    const tx = X(t.x), ty = Y(t.y), dx = sg, dy = -0.32, len = 700 * s
    const body = (ox, oy) => { g.beginPath(); g.moveTo(tx + ox, ty + oy); g.lineTo(tx + ox + dx * len - dy * 13, ty + oy + dy * len - 13); g.lineTo(tx + ox + dx * len + dy * 13, ty + oy + dy * len + 13); g.closePath() }
    const off = z * 0.45 * s
    g.save(); g.filter = `blur(${Math.min(6, 1 + z / 25).toFixed(1)}px)`; g.fillStyle = 'rgba(0,0,0,.55)'; body(off, off * 0.9); g.fill(); g.restore()
    g.save(); g.filter = z > 2 ? `blur(${Math.min(3.5, z / 45).toFixed(1)}px)` : 'none'
    const gr = g.createLinearGradient(tx, ty - 12, tx, ty + 12); gr.addColorStop(0, '#e9ecef'); gr.addColorStop(1, '#7e848c'); g.fillStyle = gr; body(0, 0); g.fill(); g.restore()
    g.strokeStyle = NEEDLE[k].col; g.lineWidth = 2
    if (k === 'A') { g.beginPath(); g.arc(tx, ty, 6, 0, Math.PI * 2); g.stroke() } else { g.beginPath(); g.moveTo(tx, ty - 7); g.lineTo(tx + 7, ty); g.lineTo(tx, ty + 7); g.lineTo(tx - 7, ty); g.closePath(); g.stroke() }
    const st = cstate(k)
    if (st === 'good') { g.strokeStyle = C.green; g.lineWidth = 2; g.beginPath(); g.arc(tx, ty, 11, 0, Math.PI * 2); g.stroke() }
    if (st === 'scratch') { g.strokeStyle = C.red; g.lineWidth = 2.5; g.beginPath(); g.moveTo(tx - 12, ty - 12); g.lineTo(tx + 12, ty + 12); g.moveTo(tx + 12, ty - 12); g.lineTo(tx - 12, ty + 12); g.stroke() }
    g.fillStyle = NEEDLE[k].col; g.font = '12px PingFang TC, sans-serif'; g.textAlign = k === 'A' ? 'left' : 'right'; g.textBaseline = 'bottom'
    g.fillText(NEEDLE[k].name, clampN(tx + dx * len * 0.55, 4, w - 4), ty + dy * len * 0.55 - 12)
  }
  if (S.moving) { g.fillStyle = 'rgba(12,13,15,.7)'; g.fillRect(0, 0, w, h); g.fillStyle = C.ink; g.font = '14px PingFang TC, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('夾盤移動中…', w / 2, h / 2) }
}
const clampN = (x, a, b) => Math.min(b, Math.max(a, x))

// ═══ I-V 曲線 ═══
function drawIV(cv, compact = false) {
  const g = cv.getContext('2d'), dpr = cv._dpr ?? 1; g.setTransform(dpr, 0, 0, dpr, 0, 0)
  const w = cv._w ?? cv.width, h = cv._h ?? cv.height
  g.clearRect(0, 0, w, h); g.fillStyle = compact ? '#0b1a14' : '#0c0d0f'; g.fillRect(0, 0, w, h)
  const m = S.meas && S.meas.dieId === S.die ? S.meas : null
  const big = m && m.cls.imax > 1.6e-3
  const Ymax = big ? 5.5 : 1.6 // mA
  const L = compact ? 8 : 44, Rr = compact ? 8 : 10, T = compact ? 8 : 12, B = compact ? 8 : 30
  const X = (v) => L + (v + 1) / 2 * (w - L - Rr), Y = (i) => T + (1 - (i + Ymax) / (2 * Ymax)) * (h - T - B)
  const fs = compact ? 0 : 11
  g.strokeStyle = '#24272c'; g.lineWidth = 1
  for (const v of [-1, -0.5, 0, 0.5, 1]) { g.beginPath(); g.moveTo(X(v), T); g.lineTo(X(v), h - B); g.stroke() }
  const tk = big ? [-5, -2.5, 0, 2.5, 5] : [-1.5, -1, -0.5, 0, 0.5, 1, 1.5]
  for (const i of tk) { g.beginPath(); g.moveTo(L, Y(i)); g.lineTo(w - Rr, Y(i)); g.stroke() }
  g.strokeStyle = '#555b63'; g.beginPath(); g.moveTo(X(0), T); g.lineTo(X(0), h - B); g.moveTo(L, Y(0)); g.lineTo(w - Rr, Y(0)); g.stroke()
  // 規格區：900～1100 Ω 兩條斜線之間
  g.fillStyle = 'rgba(92,208,179,.16)'; g.beginPath(); g.moveTo(X(-1), Y(-1e3 / 900)); g.lineTo(X(1), Y(1e3 / 900)); g.lineTo(X(1), Y(1e3 / 1100)); g.lineTo(X(-1), Y(-1e3 / 1100)); g.closePath(); g.fill()
  g.strokeStyle = 'rgba(92,208,179,.6)'; g.setLineDash([4, 3]); g.beginPath(); g.moveTo(X(-1), Y(-1e3 / 900)); g.lineTo(X(1), Y(1e3 / 900)); g.moveTo(X(-1), Y(-1e3 / 1100)); g.lineTo(X(1), Y(1e3 / 1100)); g.stroke()
  if (big) { g.strokeStyle = 'rgba(242,166,90,.7)'; g.beginPath(); g.moveTo(L, Y(5)); g.lineTo(w - Rr, Y(5)); g.moveTo(L, Y(-5)); g.lineTo(w - Rr, Y(-5)); g.stroke() }
  g.setLineDash([])
  if (fs) {
    g.font = `${fs}px PingFang TC, Noto Sans TC, sans-serif`; g.fillStyle = '#8a8f96'; g.textAlign = 'center'; g.textBaseline = 'top'
    for (const v of [-1, -0.5, 0, 0.5, 1]) g.fillText(String(v), X(v), h - B + 3)
    g.fillText('電壓 V（伏特）', (L + w) / 2 + 40, h - 13)
    g.textAlign = 'right'; g.textBaseline = 'middle'; for (const i of tk) if (i % 1 === 0 || !big) g.fillText(String(i), L - 4, Y(i))
    g.save(); g.translate(11, (T + h - B) / 2); g.rotate(-Math.PI / 2); g.textAlign = 'center'; g.fillText('電流 I（mA）', 0, 0); g.restore()
    g.fillStyle = 'rgba(92,208,179,.95)'; g.textAlign = 'left'; g.textBaseline = 'bottom'; g.fillText('規格區 900～1100 Ω', X(0.08), Y(1e3 / 900 * 0.6) - 16)
    if (big) { g.fillStyle = C.orange; g.textAlign = 'left'; g.fillText('限流 5 mA', X(-0.95), Y(5) - 2) }
  }
  if (!m) { if (fs) { g.fillStyle = '#666'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.font = '13px PingFang TC, sans-serif'; g.fillText('還沒量測', w * 0.3, Y(-0.8)) } return }
  const nShow = m.done ? m.iv.V.length : Math.max(1, Math.floor((performance.now() - m.t0) / 1100 * m.iv.V.length))
  g.strokeStyle = C.blue; g.lineWidth = compact ? 2 : 2; g.beginPath()
  for (let k = 0; k < nShow; k++) { const x = X(m.iv.V[k]), y = Y(m.iv.I[k] * 1e3); k ? g.lineTo(x, y) : g.moveTo(x, y) } g.stroke()
  if (!compact) { g.fillStyle = C.blue; for (let k = 0; k < nShow; k += 4) { g.beginPath(); g.arc(X(m.iv.V[k]), Y(m.iv.I[k] * 1e3), 2.4, 0, Math.PI * 2); g.fill() } }
}

// ═══ 文字狀態 ═══
const zTxt = (z) => (z > 0 ? `+${z} µm` : z === 0 ? '0 µm（剛好碰到）' : `下壓 ${-z} µm`)
function gaugeHTML() {
  return ['A', 'B'].map((k) => {
    const t = S.tips[k], st = CST[cstate(k)], f = clampN((100 - t.z) / 160, 0, 1) * 100
    return `<div class="ps-gauge"><span class="nm" style="color:${NEEDLE[k].col}">${NEEDLE[k].name}</span><div class="ps-bar"><i style="left:${f.toFixed(1)}%"></i></div>
      <span></span><span class="ps-gtxt"><b style="color:${st.col}">${st.sym} ${st.zh}</b>　Z ${zTxt(t.z)}${t.z > 100 ? '（更高）' : ''}</span></div>`
  }).join('')
}
function hint() {
  if (S.die < 0) return '① 在晶圓圖上點一顆晶粒（也可以直接點 3D 裡的晶圓）。提示：邊緣的晶粒比較容易出問題喔！'
  if (S.moving) return '夾盤正在把晶粒送到顯微鏡底下……'
  const d = die(), pc = pads(), m = S.meas && S.meas.dieId === d.id ? S.meas : null
  if (S.results[d.id] && m) return `${d.name} 判定好了！在晶圓圖點下一顆。換晶粒時兩支針會自動抬起，XY 位置會記住，下針會快很多。`
  for (const k of ['A', 'B']) if (cstate(k) === 'off') return `${NEEDLE[k].name}落在 pad 外面（壓在保護層上）！先按「▲ 抬起」，再用 X／Y 對準。`
  for (const k of ['A', 'B']) if (!PS.onPad(S.tips[k], pc[k])) return `② 選「${NEEDLE[k].name}」，用 X／Y 把它移到 <b>${NEEDLE[k].pad}</b> 正上方：看顯微鏡，針尖的${k === 'A' ? '圓圈 ◎' : '菱形 ◇'}要落在亮亮的方塊裡。`
  const s = ['A', 'B'].map(cstate)
  if (s.includes('scratch')) return '針壓太深了！按「▲ 抬起」退回綠色區，否則會一直刮傷 pad。'
  if (s.includes('air')) return '② 兩支針都對準了！選「兩支一起」按「▼ 下降」：看針尖和影子慢慢靠在一起、畫面變清楚，就是快碰到了。'
  if (s.includes('touch')) return '剛碰到 pad 還不夠穩：改用「細調」再往下壓一點點，讓 Z 量表的箭頭進到<b style="color:#5CD0B3">綠色區</b>。'
  if (!m) return '③ 兩支針都良好接觸！按「⚡ 量測 I-V」。'
  if (!m.done) return '量測中：電壓從 −1 V 慢慢掃到 +1 V……'
  return '④ 看 I-V 曲線：線越陡＝電阻越小。整條線落在綠色規格區（900～1100 Ω）才是良品。按「良品」或「不良」。'
}
function readTxt(m) {
  const c = m.cls, warn = ['A', 'B'].filter((k) => !['good', 'scratch'].includes(m[k === 'A' ? 'sA' : 'sB']))
  let t = c.kind === 'open' ? `<b style="color:${C.ink}">電流幾乎是 0</b>（小於 1 µA）：電好像流不過去。`
    : c.kind === 'short' ? `<b style="color:${C.ink}">電流一下子就衝到 5 mA 上限</b>（限流）：電阻幾乎是 0。`
      : `量到 <b style="color:${C.ink};font-size:16px">R ≈ ${Math.round(c.R).toLocaleString('zh-TW')} Ω</b>（斜率的倒數；規格 900～1100 Ω）`
  if (warn.length) t += `<br><span style="color:${C.yellow}">△ 注意：量的時候${warn.map((k) => NEEDLE[k].name).join('和')}沒有良好接觸，這個結果可能不準。</span>`
  return t
}
function feedback(d, good, ok, m) {
  const why = { good: '阻值在規格內', open: '電阻斷掉了，電流過不去', short: '電阻被短路，電流直接衝到上限', high: `阻值 ${d.R} Ω，比規格大`, low: `阻值 ${d.R} Ω，比規格小` }[d.type]
  if (ok) return `<span class="ok">✓ 判對了！</span>${d.name} 是<b>${PS.TYPE_ZH[d.type]}</b>（${why}）。+10 分`
  const bad = ['A', 'B'].filter((k) => !['good', 'scratch'].includes(m[k === 'A' ? 'sA' : 'sB']))
  let t = `<span class="ng">✗ 判錯了：</span>${d.name} 其實是<b>${PS.TYPE_ZH[d.type]}</b>（${why}）。`
  if (bad.length) t += `你量的時候${bad.map((k) => NEEDLE[k].name).join('和')}沒有良好接觸，所以量到的不是晶粒真正的樣子——先把針下好再量，可以重量後改判。`
  else t += '再看一次 I-V 曲線和綠色規格區，可以重量後改判。'
  return t
}
let lastUI = ''
function updateUI() {
  const st = stats(), d = S.die >= 0 ? die() : null, m = d && S.meas && S.meas.dieId === d.id ? S.meas : null
  lab.setHero(st.yield * 100, { state: `已測 ${st.tested} 顆`, sub: `判對 <b style="color:${C.green}">${st.correct}</b>／目標 ${P.doneN}　·　刮傷 <b style="color:${st.scratches ? C.red : C.ink}">${st.scratches}</b> 次　·　分數 <b>${st.score}</b>` })
  const c = [d && !S.moving, ['A', 'B'].every((k) => ['good', 'scratch'].includes(cstate(k))), !!(m && m.done), !!(d && S.results[d.id] && m)]
  const cur = c.findIndex((x) => !x)
  if (cur !== S.lastCur) { S.lastCur = cur; requestAnimationFrame(() => scrollToStep(cur)) }
  steps.innerHTML = ['選晶粒', '對針下針', '量測', '判定'].map((t, i) => `<span class="${i === cur ? 'cur' : c[i] ? 'done' : ''}">${c[i] && i !== cur ? '✓' : i + 1} ${t}</span>`).join('')
  const h = hint(); if (hintEl.innerHTML !== h) hintEl.innerHTML = h
  R('gauges').innerHTML = gaugeHTML()
  const xy = P.step.xy[S.step], z = P.step.z[S.step]
  R('stepinfo').textContent = `每按一下：XY 移 ${xy} µm、Z 移 ${z} µm（${S.step === 'coarse' ? '粗調，快' : '細調，準'}）` + (matchMedia('(hover: hover)').matches ? '　鍵盤：方向鍵／PageUp／PageDown' : '')
  for (const b of secCtl.querySelectorAll('[data-who]')) b.classList.toggle('act', b.dataset.who === S.who)
  for (const b of secCtl.querySelectorAll('[data-step]')) b.classList.toggle('act', b.dataset.step === S.step)
  for (const b of secCtl.querySelectorAll('[data-mv]')) b.disabled = !d || S.moving
  secIV.querySelector('[data-a=measure]').disabled = !d || S.moving || !!(m && !m.done)
  for (const b of secJ.querySelectorAll('[data-j]')) b.disabled = !(m && m.done)
  R('read').innerHTML = m && m.done ? readTxt(m) : m ? '掃描中……' : ''
  R('fb').innerHTML = d && S.fbDie === d.id ? S.fb : ''
  R('mapTag').textContent = d ? `${d.name}（${st.tested} 顆已測）` : '點一顆晶粒'
  R('scopeTag').textContent = d ? `晶粒 ${d.name} · 約 1 mm 寬（示意）` : '示意，約 1 mm 寬'
  R('cstat').innerHTML = ['A', 'B'].map((k) => { const s = CST[cstate(k)]; return `<div><span class="t" style="color:${NEEDLE[k].col}">${NEEDLE[k].sym} ${NEEDLE[k].name}</span><span style="color:${s.col}">${s.sym} ${s.zh}</span></div>` }).join('')
  for (const b of tools.querySelectorAll('[data-t]')) { const t = b.dataset.t; b.classList.toggle('act', t === 'labels' ? lab.target.labels > 0.5 : t === 'explode' ? lab.target.explode > 0.5 : t === 'view' ? S.view === 'tip' : false) }
  tools.querySelector('[data-t=view]').textContent = S.view === 'tip' ? '回到全景' : '近看針尖'
}
function scrollToStep(cur) {
  // 面板放不下全部時，自動捲到目前這一步（上方的步驟條與提示固定不動）
  const tgt = cur === 0 ? (MOBILE() ? left : null) : cur === 1 ? (MOBILE() ? left.querySelector('#card-scope') : secCtl) : cur === -1 ? secJ : secIV
  const top = tgt ? Math.max(0, tgt.offsetTop - sticky.offsetHeight - 6) : 0
  if (Math.abs(side.scrollTop - top) > 4) side.scrollTo({ top, behavior: REDUCED ? 'auto' : 'smooth' })
}
function drawAll(force) {
  drawMap(); drawScope(); drawIV(CV.iv)
  SCR._w = 320; SCR._h = 200; drawIV(SCR, true); scrTex.needsUpdate = true
  if (force) drawWaferTex()
  updateUI()
}
let toastT = 0
function toast(msg, kind = 'warn') { toastEl.innerHTML = msg; toastEl.className = 'on' + (kind === 'info' ? ' info' : ''); clearTimeout(toastT); toastT = setTimeout(() => { toastEl.className = '' }, 2600) }

// ═══ 動作 ═══
function post(event, st) { const msg = PS.message(event, st); (window.__msgs ||= []).push(msg); try { window.parent.postMessage(msg, '*') } catch (e) { /* 沒有外層也沒關係 */ } }
function selectDie(id) {
  if (id < 0 || id === S.die) return
  S.die = id; const d = die()
  S.target = { x: d.x, y: d.y }
  for (const k of ['A', 'B']) { if (S.tips[k].z < P.zSafe) S.tips[k].z = P.zSafe; S.hurt[k] = false; S.marked[k] = false }
  if (REDUCED) S.chuck = { ...S.target }
  S.moving = true; dirty = true; drawWaferTex()
}
function move(kind) {
  if (S.die < 0) return toast('先在晶圓圖選一顆晶粒', 'info')
  if (S.moving) return
  const who = S.who === 'AB' ? ['A', 'B'] : [S.who]
  if (kind === 'lift') { for (const k of ['A', 'B']) { S.tips[k].z = Math.max(S.tips[k].z, P.zSafe); S.hurt[k] = false; S.marked[k] = false } dirty = true; return }
  const ax = kind[0], sg = kind[1] === '+' ? 1 : -1, st = P.step[ax === 'z' ? 'z' : 'xy'][S.step]
  const mv = { dx: ax === 'x' ? sg * st : 0, dy: ax === 'y' ? sg * st : 0, dz: ax === 'z' ? sg * st : 0 }
  const pc = pads()
  for (const k of who) {
    const before = { ...S.tips[k] }, r = PS.applyMove(S.tips[k], mv, pc[k]); S.tips[k] = r.tip
    if (r.tip.z > 0) { S.hurt[k] = false; S.marked[k] = false }
    if ((r.event === 'scratch-press' || r.event === 'scratch-drag') && !S.hurt[k]) {
      S.hurt[k] = true; S.scratches++; S.flash = 1
      ;(S.marks[S.die] ||= []).push({ kind: 'scratch', x: before.x, y: before.y, x2: r.tip.x, y2: r.tip.y })
      toast(r.event === 'scratch-press' ? `${NEEDLE[k].name}：針壓過大，刮傷 pad！（−5 分）<br>按「▲ 抬起」退回綠色區` : `${NEEDLE[k].name}：針還壓著就橫移，刮傷 pad！（−5 分）<br>要先抬起再移動`)
    }
    if (PS.contact(r.tip, pc[k]).state === 'good' && !S.marked[k]) { S.marked[k] = true; (S.marks[S.die] ||= []).push({ kind: 'mark', x: r.tip.x, y: r.tip.y }) }
  }
  dirty = true
}
function measure() {
  if (S.die < 0) return toast('先在晶圓圖選一顆晶粒', 'info')
  if (S.moving) return
  const d = die(), sA = cstate('A'), sB = cstate('B'); S.measCount++
  const iv = PS.measureIV(d, sA, sB, S.measCount)
  S.meas = { dieId: d.id, iv, cls: PS.classify(iv), sA, sB, t0: performance.now(), done: REDUCED }
  if (S.fbDie === d.id) S.fb = ''
  dirty = true
}
function judge(good) {
  const d = S.die >= 0 ? die() : null, m = S.meas
  if (!d || !m || m.dieId !== d.id || !m.done) return toast('先量測這顆晶粒，再判定', 'info')
  const ok = PS.isCorrect(d, good)
  S.results[d.id] = { good, correct: ok }
  S.fb = feedback(d, good, ok, m); S.fbDie = d.id
  const st = stats(); post('progress', st)
  drawWaferTex(); dirty = true
  if (st.done && !S.doneShown) { S.doneShown = true; post('complete', st); setTimeout(() => showDone(st), REDUCED ? 0 : 700) }
}
function showDone(st) {
  const truth = PS.DIES.filter((d) => d.type === 'good').length
  R('kv').innerHTML = `<div>已測<b>${st.tested} 顆</b></div><div>判對<b>${st.correct} 顆</b></div><div>良率（你的判定）<b>${(st.yield * 100).toFixed(0)} %</b></div><div>刮傷 pad<b style="color:${st.scratches ? C.red : C.green}">${st.scratches} 次</b></div><div>分數<b>${st.score}</b></div><div>整片真實良率（示意）<b>${(truth / PS.DIES.length * 100).toFixed(0)} %</b></div>`
  R('donetxt').innerHTML = `你剛完成了一小段<b>晶圓測試（CP）</b>。工廠會把不良晶粒記在晶圓圖上，切割之後只把良品拿去封裝——這就是「先測再封裝」能省錢的原因。${st.scratches ? '下次試試用「細調」慢慢下針，避免刮傷 pad。' : '而且你一次都沒刮傷 pad，手很穩！'}`
  doneM.classList.add('on')
}
function setView(v) {
  const from = { ...lab.view }; S.view = v; const to = curView()
  if (REDUCED) { lab._applyView(to); lab.view = to; return }
  S.tween = { from, to, t: 0 }
}
function toggleTool(t) {
  if (t === 'labels') { lab.toggle('labels'); document.documentElement.classList.toggle('ps-lbl-on', lab.target.labels > 0.5); layout() }
  if (t === 'explode') { lab.toggle('explode'); if (lab.target.explode > 0.5 && lab.target.labels < 0.5) toggleTool('labels') }
  if (t === 'view') setView(S.view === 'tip' ? 'all' : 'tip')
  if (t === 'info') info.classList.add('on')
  dirty = true
}

// ═══ 事件 ═══
secCtl.addEventListener('click', (e) => {
  const b = e.target.closest('button'); if (!b) return
  if (b.dataset.who) S.who = b.dataset.who
  if (b.dataset.step) S.step = b.dataset.step
  if (b.dataset.mv) move(b.dataset.mv)
  dirty = true
})
secIV.querySelector('[data-a=measure]').addEventListener('click', measure)
secJ.addEventListener('click', (e) => { const b = e.target.closest('[data-j]'); if (b) judge(b.dataset.j === '1') })
tools.addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (b) toggleTool(b.dataset.t) })
for (const m of [info, doneM]) m.addEventListener('click', (e) => { if (e.target === m || e.target.closest('[data-close]')) m.classList.remove('on') })
const mapPick = (e) => { const r = CV.map.getBoundingClientRect(), { s, cx, cy } = mapXf(); return PS.dieAt((e.clientX - r.left - cx) / s, -(e.clientY - r.top - cy) / s) }
CV.map.addEventListener('click', (e) => { const id = mapPick(e); if (id >= 0) selectDie(id) })
CV.map.addEventListener('pointermove', (e) => { const id = mapPick(e); if (id !== S.hover) { S.hover = id; drawMap() } })
CV.map.addEventListener('pointerleave', () => { S.hover = -1; drawMap() })
// 3D：點晶圓也能選晶粒（拖曳＝轉視角，不算點選）
const ray = new THREE.Raycaster(), gl = lab.renderer.domElement; let down = null
gl.addEventListener('pointerdown', (e) => { down = [e.clientX, e.clientY] })
gl.addEventListener('pointerup', (e) => {
  if (!down || Math.hypot(e.clientX - down[0], e.clientY - down[1]) > 6) return
  const r = gl.getBoundingClientRect(); ray.setFromCamera(new THREE.Vector2((e.clientX - r.left) / r.width * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), lab.camera)
  const hit = ray.intersectObject(wafer)[0]; if (!hit) return
  const p = wafer.worldToLocal(hit.point.clone()); selectDie(PS.dieAt(p.x * 1000, -p.z * 1000))
})
addEventListener('keydown', (e) => {
  if (e.metaKey || e.ctrlKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return
  const k = { ArrowLeft: 'x-', ArrowRight: 'x+', ArrowUp: 'y+', ArrowDown: 'y-', PageUp: 'z+', PageDown: 'z-' }[e.key]
  if (k) { e.preventDefault(); move(k) }
  if (e.key === 'Escape') { info.classList.remove('on'); doneM.classList.remove('on') }
})
addEventListener('resize', () => layout())

// ═══ 每一格 ═══
lab.onTick((sdt, _l, dt) => {
  let busy = false
  // 夾盤移動（晶粒到顯微鏡下）
  const ex = S.target.x - S.chuck.x, ey = S.target.y - S.chuck.y
  if (Math.hypot(ex, ey) > 0.03) { S.chuck.x = approach(S.chuck.x, S.target.x, 0.22, dt); S.chuck.y = approach(S.chuck.y, S.target.y, 0.22, dt); busy = true }
  else { S.chuck.x = S.target.x; S.chuck.y = S.target.y; if (S.moving) { S.moving = false; dirty = true } }
  lab.place(chuckG, -S.chuck.x / 1000, 0, S.chuck.y / 1000)
  // 針（畫面平滑跟上）；3D 位移放大給眼睛看：XY 1 µm→20 µm，Z 1 µm→120 µm
  for (const k of ['A', 'B']) {
    const a = S.disp[k], t = S.tips[k]
    for (const c of ['x', 'y', 'z']) { const nv = REDUCED ? t[c] : approach(a[c], t[c], 0.06, dt); if (Math.abs(nv - t[c]) > 0.05) busy = true; a[c] = Math.abs(nv - t[c]) <= 0.05 ? t[c] : nv }
    const sg = k === 'A' ? -1 : 1
    lab.place(carriage[k], (a.x - sg * 300) * 2e-5, a.z > 0 ? a.z * 1.2e-4 : a.z * 0.5e-5, -a.y * 2e-5)
    knobs[k].x.rotation.y = a.x * 0.012; knobs[k].y.rotation.y = a.y * 0.012; knobs[k].z.rotation.y = a.z * 0.03
  }
  // 量測掃描
  if (S.meas && !S.meas.done) { busy = true; if (performance.now() - S.meas.t0 > 1150) { S.meas.done = true; dirty = true } }
  // 鏡頭轉場
  if (S.tween) {
    const tw = S.tween; tw.t = Math.min(1, tw.t + dt / 0.9); const e = tw.t < 0.5 ? 4 * tw.t ** 3 : 1 - (-2 * tw.t + 2) ** 3 / 2
    const v = { ...tw.to, az: tw.from.az + (tw.to.az - tw.from.az) * e, el: tw.from.el + (tw.to.el - tw.from.el) * e, dist: tw.from.dist + (tw.to.dist - tw.from.dist) * e, target: tw.from.target.map((x, i) => x + (tw.to.target[i] - x) * e) }
    lab._applyView(v); if (tw.t >= 1) { lab.view = tw.to; S.tween = null }
  }
  if (busy || dirty) { drawScope(); drawIV(CV.iv) }
  if (dirty) { dirty = false; drawAll(false) }
})

// ═══ 啟動 ═══
drawWaferTex()
lab.start()
how.style.display = ''
layout()
setTimeout(layout, 60)
// 測試掛勾（Playwright 自測用；不影響學員操作）
window.__ps = {
  S, PS, select: selectDie, move, measure, judge, stats, layout,
  settle() { S.chuck = { ...S.target }; S.moving = false; for (const k of ['A', 'B']) S.disp[k] = { ...S.tips[k] }; if (S.meas) S.meas.done = true; dirty = true },
  mapPoint(id) { const r = CV.map.getBoundingClientRect(), { s, cx, cy } = mapXf(), d = PS.DIES[id]; return { x: r.left + cx + d.x * s, y: r.top + cy - d.y * s } },
  align() { const pc = pads(); for (const k of ['A', 'B']) S.tips[k] = { x: pc[k][0], y: pc[k][1], z: S.tips[k].z }; dirty = true; return pc },
}
requestAnimationFrame(() => requestAnimationFrame(() => { window.__ready = true }))
