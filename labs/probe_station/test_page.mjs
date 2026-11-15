// 頁面自測：node labs/probe_station/test_page.mjs <html 絕對路徑> <輸出資料夾>
// 桌面 1440×900、手機 375×812、?embed（1280×800 與 960×600）截圖；主控台錯誤、外部網路請求、水平捲動檢查；
// 桌面用真的滑鼠點擊跑一次完整流程（點晶圓圖選晶粒 → 按鈕對針、下針 → 量測 → 判定），確認 postMessage 送出，再把流程跑到完成。
import fs from 'node:fs'
import os from 'node:os'
const { chromium } = await import(os.homedir() + '/.claude/skills/machine/node_modules/playwright/index.mjs')
const file = process.argv[2], out = process.argv[3]
if (!file || !out) { console.error('用法：node test_page.mjs <html 絕對路徑> <輸出資料夾>'); process.exit(2) }
fs.mkdirSync(out, { recursive: true })
const LA = { args: ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist'] }
// 先用 Playwright 自帶的 Chromium；沒裝就改用系統的 Google Chrome
const b = await chromium.launch(LA).catch(() => chromium.launch({ ...LA, channel: 'chrome' }))
const res = {}; let failed = false
const CONF = [[1440, 900, 'd', ''], [375, 812, 'm', ''], [1280, 800, 'e', '?embed'], [960, 600, 'e2', '?embed']]
const ONLY = process.argv[4] ? process.argv[4].split(',') : null // 第 3 個參數可只跑部分版面，例如 d,m
for (const [w, h, tag, qs] of CONF) {
  if (ONLY && !ONLY.includes(tag)) continue
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: tag === 'm' ? 2 : 1, hasTouch: tag === 'm' })
  const p = await ctx.newPage(); const errs = [], net = []
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('request', (r) => { const u = r.url(); if (!/^(file|data|blob):/.test(u)) net.push(u) })
  await p.goto('file://' + file + qs)
  try { await p.waitForFunction(() => window.__ready === true, null, { timeout: 60000 }) } catch (e) { console.log('載入失敗', tag, errs); await p.screenshot({ path: `${out}/${tag}_fail.png` }); failed = true; res[tag] = { errors: errs }; await ctx.close(); continue }
  await p.waitForTimeout(tag === 'd' ? 4200 : 1500)
  const E = (js, a) => p.evaluate(js, a); const r = {}
  await E(() => window.addEventListener('message', (e) => { (window.__got ||= []).push(e.data) }))
  const snap = async (n) => { await p.waitForTimeout(400); await p.screenshot({ path: `${out}/${tag}_${n}.png` }) }
  const clickDie = async (name) => { const id = await E((nm) => window.__ps.PS.DIES.find((d) => d.name === nm).id, name); await p.locator('#cv-map').scrollIntoViewIfNeeded(); const pt = await E((i) => window.__ps.mapPoint(i), id); await p.mouse.click(pt.x, pt.y); await p.waitForTimeout(80)
    if ((await E(() => window.__ps.S.die)) !== id) { r.clickMissed = (r.clickMissed || 0) + 1; await E((i) => window.__ps.select(i), id) }
    return id }
  const btn = (sel) => p.locator(sel).first().click()
  await snap('0_start')
  if (tag === 'd' || tag === 'e') {
    // ── 真實點擊流程：E5（中心，良品）
    const id = await clickDie('E5'); await p.waitForTimeout(1600)
    r.selected = await E(() => ({ die: window.__ps.S.die, moving: window.__ps.S.moving, hint: document.querySelector('[data-r=hint]').innerText }))
    r.selectedOK = r.selected.die === id && !r.selected.moving
    await snap('1_selected')
    // 用按鈕把兩支針對準 pad（粗調 50 µm、細調 10 µm）
    for (const k of ['A', 'B']) {
      await btn(`[data-who=${k}]`)
      const { tip, pc } = await E((kk) => ({ tip: window.__ps.S.tips[kk], pc: window.__ps.PS.padCenters(window.__ps.PS.DIES[window.__ps.S.die])[kk === 'A' ? 'A' : 'B'] }), k)
      for (const [ax, d] of [['x', pc[0] - tip.x], ['y', pc[1] - tip.y]]) {
        const sg = d > 0 ? '+' : '-'; let rem = Math.abs(d)
        await btn('[data-step=coarse]'); while (rem >= 50) { await btn(`[data-mv="${ax}${sg}"]`); rem -= 50 }
        await btn('[data-step=fine]'); while (rem >= 10) { await btn(`[data-mv="${ax}${sg}"]`); rem -= 10 }
      }
    }
    await snap('2_aligned')
    // 兩支一起下針：粗調到碰到，細調再壓 20 µm
    await btn('[data-who=AB]'); await btn('[data-step=coarse]')
    while ((await E(() => window.__ps.S.tips.A.z)) > 0) await btn('[data-mv="z-"]')
    await btn('[data-step=fine]'); while ((await E(() => window.__ps.S.tips.A.z)) > -20) await btn('[data-mv="z-"]')
    r.contact = await E(() => [document.querySelector('[data-r=cstat]').innerText, window.__ps.S.tips.A.z, window.__ps.S.scratches])
    await snap('3_contact')
    await btn('[data-a=measure]'); await p.waitForTimeout(1600)
    r.read = await E(() => document.querySelector('[data-r=read]').innerText)
    await snap('4_iv')
    await btn('[data-j="1"]'); await p.waitForTimeout(300)
    r.fb = await E(() => document.querySelector('[data-r=fb]').innerText)
    r.firstMsg = await E(() => (window.__got || [])[0])
    r.msgOK = !!r.firstMsg && r.firstMsg.source === 'chip-camp-lab' && r.firstMsg.lab === 'probe_station' && r.firstMsg.event === 'progress' && r.firstMsg.data.tested === 1 && r.firstMsg.data.correct === 1
    await snap('5_judged')
  }
  if (tag === 'd') {
    // ── 刮傷：在 D5 下針過頭
    const id2 = await clickDie('D5'); await p.waitForTimeout(1500); await E(() => window.__ps.align())
    await btn('[data-who=AB]'); await btn('[data-step=coarse]'); for (let i = 0; i < 4; i++) await btn('[data-mv="z-"]')
    r.scratch = await E(() => ({ n: window.__ps.S.scratches, toast: document.querySelector('#ps-toast').innerText, z: window.__ps.S.tips.A.z }))
    await snap('6_scratch')
    await btn('[data-mv="z+"]'); await btn('[data-mv="z+"]'); void id2
    // ── 沒對準就量 → 開路
    await E(() => { const S = window.__ps.S; S.tips.A = { x: -450, y: 0, z: -20 }; window.__ps.measure(); window.__ps.settle() })
    r.misaligned = await E(() => window.__ps.S.meas.cls.kind)
    await p.waitForTimeout(300); await snap('7_open_misaligned')
    // ── 程式跑完到完成：挑真實狀態不同的晶粒，正確判定
    const plan = await E(() => { const D = window.__ps.PS.DIES; const want = ['open', 'short', 'high', 'good', 'low', 'good']; const used = new Set([window.__ps.S.die, D.find((d) => d.name === 'E5').id]); return want.map((t) => { const d = D.find((x) => x.type === t && !used.has(x.id)); used.add(d.id); return d.id }) })
    for (const id of plan) {
      await E((i) => { const q = window.__ps; q.select(i); q.settle(); q.align(); for (const k of ['A', 'B']) q.S.tips[k].z = -20; q.settle(); q.measure(); q.settle() }, id)
      await E((i) => window.__ps.judge(window.__ps.PS.DIES[i].type === 'good'), id)
    }
    await p.waitForTimeout(1200)
    r.msgs = await E(() => window.__got.map((m) => `${m.event}:${JSON.stringify(m.data)}`))
    r.completeOK = r.msgs.some((m) => m.startsWith('complete:'))
    r.doneCard = await E(() => document.querySelector('#ps-done').classList.contains('on'))
    await snap('8_done')
    await E(() => document.querySelector('#ps-done').classList.remove('on'))
    await btn('[data-t=labels]'); await p.waitForTimeout(800); await snap('9_labels')
    await btn('[data-t=explode]'); await p.waitForTimeout(1800); await snap('10_explode')
    await btn('[data-t=explode]'); await btn('[data-t=labels]'); await btn('[data-t=view]'); await p.waitForTimeout(1500); await snap('11_tipview')
    await btn('[data-t=view]'); await btn('[data-t=info]'); await snap('12_info')
    await E(() => document.querySelector('#ps-info').classList.remove('on'))
  }
  if (tag === 'm') {
    await clickDie('E4'); await p.waitForTimeout(1600)
    await E(() => { const q = window.__ps; q.align(); for (const k of ['A', 'B']) q.S.tips[k].z = -20; q.settle(); q.measure(); q.settle() })
    await p.waitForTimeout(300)
    for (const [n, sel] of [['1_map', '#cv-map'], ['2_ctl', '[data-who=A]'], ['3_iv', '#cv-iv'], ['4_judge', '[data-j="1"]']]) { await p.locator(sel).scrollIntoViewIfNeeded(); await snap(n) }
    await btn('[data-j="0"]'); await p.waitForTimeout(300); await snap('5_fb')
    r.msgOK = (await E(() => (window.__got || []).length)) === 1
    await E(() => { document.querySelector('.lab-side').scrollTop = 0 }); await btn('[data-t=labels]').catch(() => {})
    await p.locator('[data-t=labels]').scrollIntoViewIfNeeded(); await p.waitForTimeout(700); await E(() => { document.querySelector('.lab-side').scrollTop = 0 }); await snap('6_labels')
  }
  r.scrollWidth = await E(() => document.documentElement.scrollWidth); r.vw = w
  r.overflowX = r.scrollWidth > w
  r.fps = await E(async () => { const t0 = performance.now(); let n = 0; await new Promise((ok) => { const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else ok() }; requestAnimationFrame(f) }); return n })
  r.ban = await E(() => (document.body.innerText.match(/章|硅|晶圆|视频|软件|Keithley|Cascade|FormFactor|Keysight/g) || []).join(','))
  r.errors = errs.length; r.errList = errs.slice(0, 5); r.net = net.slice(0, 5)
  if (r.clickMissed || errs.length || net.length || r.overflowX || r.ban || r.msgOK === false || r.completeOK === false || r.selectedOK === false) failed = true
  res[tag] = r; await ctx.close()
}
await b.close()
fs.writeFileSync(out + '/result.json', JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1))
console.log(failed ? '頁面自測：有問題（見上）' : '頁面自測：通過')
process.exit(failed ? 1 : 0)
