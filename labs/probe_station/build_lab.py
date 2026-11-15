# 組檔：solver.js＋body.js＋machine kit（中文化）＋three 0.170（data URL import map）→ 單一 HTML，完全不連網
# 用法：python3 labs/probe_station/build_lab.py   →  public/labs/probe_station.html
import json, re, base64
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parent.parent
THREE = WEB / 'node_modules/three'
KITDIR = Path.home() / '.claude/skills/machine/kit'
OUT = WEB / 'public/labs/probe_station.html'
TITLE = '微動探針台下針量測｜「義」起解密晶片'
DESC = '晶圓測試（CP）互動 3D：選一顆晶粒、用微動探針座把兩支鎢針下到 pad 上、掃 I-V 曲線、判定良品或不良，算出良率。'

# ── kit 中文化與小改（沿用 M12-04 _repl.py，再加本站需要的幾條）
REPL = [
    ("['run', 'Pause', 'Space'], ['explode', 'Explode', 'E'], ['cut', 'Cut away', 'C'], ['xray', 'X-ray', 'X'], ['slow', 'Slow', 'S'], ['labels', 'Labels', 'L']",
     "['run', '暫停', 'Space'], ['explode', '爆炸圖', 'E'], ['cut', '剖面', 'C'], ['xray', 'X 光', 'X'], ['slow', '慢動作', 'S'], ['labels', '標籤', 'L']"),
    ("this.paused ? 'Run' : 'Pause'", "this.paused ? '繼續' : '暫停'"),
    ('<summary>How it is computed</summary>', '<summary>怎麼算的（模型與限制）</summary>'),
    ("'Building · '", "'組裝中 · '"),
    ("`of ${fmt(N)} parts`", "`／${fmt(N)} 個零件`"),
    ("`${fmt(this.tris ?? 0)} triangles · ${this.matCount ?? 0} materials`", "`${fmt(this.tris ?? 0)} 個三角面 · ${this.matCount ?? 0} 種材質`"),
    ("No. ${String(o.no ?? 1).padStart(2, '0')}", "${o.no ?? ''}"),
    ("this._assembly = 1\n", "this._assembly = this.o.noIntro ? 0 : 1\n"),
    ("const side = L.side ?? (s.x < ctr.x ? 'left' : 'right')", "const side = L.side ?? this.o.labelSide ?? (s.x < ctr.x ? 'left' : 'right')"),
    ("it.lx = clamp(xs, W * 0.05, W * 0.7)", "it.lx = clamp(xs, W * (side === 'left' ? (this.o.labelMinX ?? 0.17) : 0.05), W * (this.o.labelMaxX ?? 0.7))"),
    ("const s = p.project(this.camera)\n      const vis = on > 0.01 && s.z < 1 && L.obj.visible !== false",
     "const pw = p.clone(); const s = p.project(this.camera)\n      const vis = on > 0.01 && s.z < 1 && Math.abs(s.x) < 1 && Math.abs(s.y) < 1 && L.obj.visible !== false && !(L.hide && L.hide()) && !(this.o.labelFilter && !this.o.labelFilter(pw, L))"),
    ("const L = { obj, at: new THREE.Vector3(...(o.at ?? [0, 0, 0])), el, small: el.querySelector('small'), value: o.value, side: o.side }",
     "const L = { obj, at: new THREE.Vector3(...(o.at ?? [0, 0, 0])), el, small: el.querySelector('small'), value: o.value, side: o.side, hide: o.hide }"),
    ("if (o.label) this.label(obj, o.label, { at: o.at, value: o.value, side: o.side })", "if (o.label) this.label(obj, o.label, { at: o.at, value: o.value, side: o.side, hide: o.hide })"),
    ("const gap = Math.max(34, H * 0.045)\n      let last = -1e9", "const gap = Math.max(this.o.labelGap ?? 40, H * 0.05)\n      let last = H * (this.o.labelMinY ?? 0) - gap"),
    ("if (e.target.tagName === 'INPUT' && e.key !== ' ') return", "if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON' || e.metaKey || e.ctrlKey || e.altKey) return"),
    # 本站：提示列字樣、只留 E（爆炸圖）與 L（標籤）兩個快捷鍵、拿掉 HDRI 連網
    ('<b>/machine</b>', '<b>CP 晶圓測試</b>'),
    ("{ ' ': 'run', e: 'explode', c: 'cut', x: 'xray', s: 'slow', l: 'labels', b: 'break' }", "{ e: 'explode', l: 'labels' }"),
    ("import { RGBELoader } from 'three/addons/loaders/RGBELoader.js'\n", ''),
    ('if (this.o.hdri) {', 'if (false) { const RGBELoader = null'),
    ('`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${this.o.hdri}_1k.hdr`', "''"),
]

def bundle(specs):
    """把 kit 用到的 three/addons 模組（含相對 import）各自轉成 data URL 模組"""
    mods, todo = {}, list(specs)
    while todo:
        spec = todo.pop()
        if spec in mods: continue
        rel = spec[len('three/addons/'):]
        src = (THREE / 'examples/jsm' / rel).read_text()
        def fix(mm):
            q, p = mm.group(1), mm.group(2)
            if p.startswith('.'):
                full = (Path('/x') / Path(rel).parent / p).resolve(); ns = 'three/addons/' + str(full)[len('/x/'):]
                todo.append(ns); return f'from {q}{ns}{q}'
            return mm.group(0)
        mods[spec] = re.sub(r"from\s+(['\"])([^'\"]+)\1", fix, src)
    return mods

def main():
    kit = (KITDIR / 'lab-kit.js').read_text()
    for x, y in REPL:
        assert x in kit, '找不到 kit 片段：' + x[:60]
        kit = kit.replace(x, y)
    # 手機：3D 只用上半部（LAB_H），控制面板在下
    kit = kit.replace('innerHeight', 'LAB_H()')
    kit = kit.replace('export const LAYER_FX = 1', 'export const LAYER_FX = 1\nexport const LAB_H = () => (innerWidth < 760 ? Math.round(innerHeight * 0.42) : innerHeight)\nwindow.LAB_H = LAB_H', 1)
    kit = kit.replace('const LabKit = { THREE,', 'const LabKit = { LAB_H, THREE,')
    tpl = (KITDIR / 'template.html').read_text()
    tpl = tpl.replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    tpl = re.sub(r'<title>[^<]*</title>', f'<title>{TITLE}</title>', tpl)
    tpl = re.sub(r'<meta name="description" content="[^"]*">', f'<meta name="description" content="{DESC}">', tpl)
    tpl = re.sub(r'<link [^>]*>\n', '', tpl)  # 拿掉 Google Fonts（不連網，用系統中文字型）
    mods = bundle(re.findall(r"from '(three/addons/[^']+)'", kit))
    durl = lambda b: 'data:text/javascript;base64,' + base64.b64encode(b).decode()
    imap = {'imports': {'three': durl((THREE / 'build/three.module.min.js').read_bytes())}}
    for k, v in sorted(mods.items()): imap['imports'][k] = durl(v.encode())
    tpl = re.sub(r'<script type="importmap">.*?</script>', lambda m: '<script type="importmap">\n' + json.dumps(imap) + '\n</script>', tpl, flags=re.S)
    tpl = re.sub(r'<!-- lab-kit:start -->.*?<!-- lab-kit:end -->', lambda m: '<!-- Machine Skill kit（MIT）：已內嵌、已中文化 -->\n<script type="module">' + kit + '</script>', tpl, flags=re.S)
    body = (HERE / 'body.js').read_text().replace('/*__SOLVER__*/', (HERE / 'solver.js').read_text())
    a = tpl.index('<script type="module">\nconst {'); b = tpl.index('</script>', a)
    html = tpl[:a] + '<script type="module">\n' + body + tpl[b:]
    for bad in ('https://', 'http://'):
        hits = [m.start() for m in re.finditer(re.escape(bad), html)]
        # 只允許出現在註解／字串裡的 w3.org 命名空間（SVG xmlns）
        hits = [h for h in hits if not html.startswith('http://www.w3.org', h)]
        for h in hits: print('注意：含網址', html[h:h + 80].replace('\n', ' '))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html)
    print('wrote', OUT, round(OUT.stat().st_size / 1e6, 3), 'MB')

if __name__ == '__main__':
    main()
