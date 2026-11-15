// 頁面自測：node labs/dicing/test_page.mjs <html 絕對路徑> <輸出資料夾>
// 桌面 1440×900、手機 375×812、?embed（1000×625，16:10）三種截圖；檢查主控台錯誤、外部網路請求，
// 並用程式跑一次完整流程（對位 → 設參數 → 切割 → 檢查），確認 postMessage 有送出。
import fs from 'node:fs'; import os from 'node:os'
const { chromium } = await import(os.homedir() + '/.claude/skills/machine/node_modules/playwright/index.mjs')
const file = process.argv[2], out = process.argv[3]
if (!file || !out) { console.error('用法：node test_page.mjs <html 絕對路徑> <輸出資料夾>'); process.exit(2) }
fs.mkdirSync(out, { recursive: true })
const ARGS = ['--use-angle=metal', '--enable-gpu', '--ignore-gpu-blocklist']
// 優先用 Playwright 自帶的 Chromium；沒裝就用系統的 Google Chrome（不另外下載）
const b = await chromium.launch({ args: ARGS }).catch(() => chromium.launch({ args: ARGS, channel: 'chrome' }))
const res = {}; let failed = false
for (const [w, h, tag, q, mobile] of [[1440, 900, 'd', '', false], [375, 812, 'm', '', true], [1000, 625, 'e', '?embed', false]]) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: mobile ? 2 : 1, isMobile: mobile, hasTouch: mobile })
  const p = await ctx.newPage(); const errs = [], ext = []
  p.on('pageerror', (e) => errs.push(String(e))); p.on('console', (m) => { if (m.type() === 'error') errs.push(m.text()) })
  p.on('request', (r) => { const u = r.url(); if (!/^(data|file|blob|about):/.test(u)) ext.push(u) })
  await p.addInitScript(() => { window.__got = []; addEventListener('message', (e) => { if (e.data && e.data.source === 'chip-camp-lab') window.__got.push(e.data) }) })
  await p.goto('file://' + file + q); await p.waitForFunction(() => window.__ready === true, null, { timeout: 120000 }); await p.waitForTimeout(5200)
  const E = (js, a) => p.evaluate(js, a)
  const shot = async (n, js, wait = 1600) => { if (js) await E(js); await p.waitForTimeout(wait); await p.screenshot({ path: `${out}/${tag}_${n}.png` }) }
  const r = {}
  await shot('1_align', null, 0)
  r.step1 = await E(() => ({ hero: document.querySelector('.lab-big')?.innerText, ath: document.querySelector('[data-r=ath]').innerText }))
  await shot('2_aligned', () => window.__dice.alignPerfect())
  r.aligned = await E(() => document.querySelector('[data-r=anote]').innerText)
  await shot('3_params', () => { window.__dice.setStep(2) })
  r.paramsDefault = await E(() => ({ frev: document.querySelector('[data-r=frev]').innerText, into: document.querySelector('[data-r=into]').innerText }))
  await E(() => window.__dice.setParams({ rpm: 30000, feed: 40, depth: 560 }))
  await shot('4_params_ok', null, 400)
  await E(() => window.__dice.startCut())
  await shot('5_cutting', () => window.__dice.seek(9, 0.45), 2600)
  r.cutting = await E(() => ({ step: window.__dice.S.step, pass: document.querySelector('[data-r=pass]').innerText, clock: document.querySelector('[data-r=clock]').innerText, hero: document.querySelector('.lab-big')?.innerText }))
  if (tag === 'd') { await shot('5b_cutting_all', () => { window.__dice.seek(27, 0.4); window.__dice.goView('all', 0) }, 900); await E(() => { window.__dice.S.play = 16 }) }
  await E(() => window.__dice.finishCut())
  await shot('6_done_card', null, 1800)
  r.result = await E(() => { const x = window.__dice.res; return { yield: x.yield, maxChip: x.maxChip, seconds: x.seconds, complete: x.complete, card: !document.querySelector('#dc-done').classList.contains('hide') } })
  r.msgs = await E(() => window.__got)
  await E(() => document.querySelector('#dc-done [data-a=close]').click())
  await shot('7_inspect', null, 1500)
  if (tag !== 'm') {
    // 第二次：太快 → 良率不足，看建議與速度 vs 良率圖
    await E(() => { document.querySelector('[data-a=retry]').click(); window.__dice.setParams({ rpm: 20000, feed: 80, depth: 560 }); window.__dice.startCut(); window.__dice.finishCut() })
    await shot('8_fast_bad', null, 1500)
    r.bad = await E(() => ({ yield: window.__dice.res.yield, hints: document.querySelector('[data-r=hints]').innerText, attempts: window.__dice.S.attempts }))
    await E(() => { document.querySelector('.lab-side').scrollTop = 1e5 })
    await shot('9_chart', null, 600)
  } else {
    await E(() => { document.querySelector('.lab-side').scrollTop = 700 })
    await shot('8_scroll', null, 600)
  }
  if (tag === 'd') {
    await shot('10_explode', () => { window.__dice.goView('all', 0); window.__lab.toggle('explode', true); window.__lab.toggle('labels', true) }, 2600)
    await shot('11_xray', () => { window.__lab.toggle('explode', false); window.__lab.toggle('xray', true); window.__dice.goView('blade', 0) }, 2000)
    await shot('12_info', () => { window.__lab.toggle('xray', false); document.querySelector('.dc-card').open = true; document.querySelector('.dc-card').scrollIntoView() }, 800)
  }
  r.msgs = await E(() => window.__got)
  r.scrollWidth = await E(() => document.documentElement.scrollWidth); r.vw = w
  r.fps = await E(async () => { const t0 = performance.now(); let n = 0; await new Promise((ok) => { const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else ok() }; requestAnimationFrame(f) }); return n })
  r.tris = await E(() => window.__lab.tris)
  r.ban = await E(() => (document.body.innerText.match(/章|硅|晶圆|视频|软件|质量|信息|DISCO|Disco/g) || []).join(','))
  r.errors = errs.length; r.errList = errs.slice(0, 5); r.external = ext.slice(0, 5)
  const progress = r.msgs.filter((m) => m.event === 'progress').length, complete = r.msgs.filter((m) => m.event === 'complete').length
  r.ok = r.errors === 0 && ext.length === 0 && progress >= 1 && complete >= 1 && r.result.complete && r.scrollWidth <= w && !r.ban
  if (!r.ok) failed = true
  res[tag] = r; await ctx.close()
}
await b.close()
fs.writeFileSync(out + '/result.json', JSON.stringify(res, null, 1))
console.log(JSON.stringify(res, null, 1))
console.log(failed ? '有項目未通過' : '全部通過')
process.exit(failed ? 1 : 0)
