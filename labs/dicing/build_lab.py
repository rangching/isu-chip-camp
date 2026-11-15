# 組檔：machine kit 的 template.html（去掉外部字型）＋ kit（中文化）＋ three 0.170（data URL import map）＋ solver.js ＋ body.js
# → 單一 HTML，完全不需網路。用法：python3 labs/dicing/build_lab.py
import base64, json, re
from pathlib import Path

HERE = Path(__file__).resolve().parent
WEB = HERE.parents[1]                                   # .../web
THREE = WEB / 'node_modules/three'                      # three@0.170.0（npm 已安裝）
KIT_DIR = Path.home() / '.claude/skills/machine/kit'
OUT = WEB / 'public/labs/dicing.html'

# ── kit 中文化與小改（沿用 M12-04 的取代表，每一條都必須命中）──
REPL = [
    ("['run', 'Pause', 'Space'], ['explode', 'Explode', 'E'], ['cut', 'Cut away', 'C'], ['xray', 'X-ray', 'X'], ['slow', 'Slow', 'S'], ['labels', 'Labels', 'L']",
     "['run', '暫停', 'Space'], ['explode', '爆炸圖', 'E'], ['cut', '剖面', 'C'], ['xray', 'X 光', 'X'], ['slow', '慢動作', 'S'], ['labels', '標籤', 'L']"),
    ("this.paused ? 'Run' : 'Pause'", "this.paused ? '繼續' : '暫停'"),
    ('<summary>How it is computed</summary>', '<summary>怎麼算的</summary>'),
    ("'Building · '", "'組裝中 · '"),
    ("`of ${fmt(N)} parts`", "`／${fmt(N)} 個零件`"),
    ("`${fmt(this.tris ?? 0)} triangles · ${this.matCount ?? 0} materials`", "`${fmt(this.tris ?? 0)} 個三角面 · ${this.matCount ?? 0} 種材質`"),
    ('No. ${String(o.no ?? 1).padStart(2, \'0\')}', '${o.no ?? \'\'}'),
    ('<b>/machine</b>', '<b>半導體製程體驗</b>'),
    ("this._assembly = 1\n", "this._assembly = this.o.noIntro ? 0 : 1\n"),
    ("const side = L.side ?? (s.x < ctr.x ? 'left' : 'right')", "const side = L.side ?? this.o.labelSide ?? (s.x < ctr.x ? 'left' : 'right')"),
    ("it.lx = clamp(xs, W * 0.05, W * 0.7)", "it.lx = clamp(xs, W * (side === 'left' ? (this.o.labelMinX ?? 0.17) : 0.05), W * (this.o.labelMaxX ?? 0.7))"),
    ("const s = p.project(this.camera)\n      const vis = on > 0.01 && s.z < 1 && L.obj.visible !== false",
     "const s = p.project(this.camera)\n      const vis = on > 0.01 && s.z < 1 && Math.abs(s.x) < 1 && Math.abs(s.y) < 1 && L.obj.visible !== false"),
    ("const gap = Math.max(34, H * 0.045)\n      let last = -1e9", "const gap = Math.max(this.o.labelGap ?? 40, H * 0.05)\n      let last = H * (this.o.labelMinY ?? 0) - gap"),
    ("if (e.target.tagName === 'INPUT' && e.key !== ' ') return", "if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON' || e.target.tagName === 'SUMMARY' || e.metaKey || e.ctrlKey || e.altKey) return"),
    # 不載入任何外部 HDRI（保留程式產生的攝影棚環境光）
    ("new RGBELoader().load(`https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/${this.o.hdri}_1k.hdr`,", "new RGBELoader().load(`${this.o.hdri}`,"),
]


def kit_source():
    kit = (KIT_DIR / 'lab-kit.js').read_text()
    for a, b in REPL:
        assert a in kit, '取代表沒命中：' + a[:60]
        kit = kit.replace(a, b)
    # 手機：3D 只佔上半部，控制面板在下半部
    kit = kit.replace('innerHeight', 'LAB_H()')
    kit = kit.replace("export const LAYER_FX = 1",
                      "export const LAYER_FX = 1\nexport const LAB_H = () => (innerWidth < 760 ? Math.round(innerHeight * 0.5) : innerHeight)\nwindow.LAB_H = LAB_H", 1)
    kit = kit.replace('const LabKit = { THREE,', 'const LabKit = { LAB_H, THREE,')
    return kit


def bundle(specs):
    """把 kit 用到的 three/addons 模組（含其相對匯入）改寫成 bare specifier，供 import map 用 data URL 提供"""
    mods, todo = {}, list(specs)
    while todo:
        spec = todo.pop()
        if spec in mods:
            continue
        rel = spec[len('three/addons/'):]
        src = (THREE / 'examples/jsm' / rel).read_text()

        def fix(mm, rel=rel):
            q, p = mm.group(1), mm.group(2)
            if p.startswith('.'):
                full = (Path('/x') / Path(rel).parent / p).resolve()
                ns = 'three/addons/' + str(full)[len('/x/'):]
                todo.append(ns)
                return f'from {q}{ns}{q}'
            return mm.group(0)
        mods[spec] = re.sub(r"from\s+(['\"])([^'\"]+)\1", fix, src)
    return mods


def main():
    kit = kit_source()
    durl = lambda s: 'data:text/javascript;base64,' + base64.b64encode(s.encode()).decode()
    imap = {'imports': {'three': 'data:text/javascript;base64,' + base64.b64encode((THREE / 'build/three.module.min.js').read_bytes()).decode()}}
    for k, v in sorted(bundle(re.findall(r"from '(three/addons/[^']+)'", kit)).items()):
        imap['imports'][k] = durl(v)

    solver = (HERE / 'solver.js').read_text()
    solver = re.sub(r'^export default DICE\s*$', '', solver, flags=re.M)
    assert 'export ' not in solver
    body = (HERE / 'body.js').read_text().replace('/*__SOLVER__*/', solver)
    assert '/*__SOLVER__*/' not in body

    tpl = (KIT_DIR / 'template.html').read_text()
    head = tpl[:tpl.index('</head>')]
    head = re.sub(r'<link[^>]*fonts\.(googleapis|gstatic)[^>]*>\n?', '', head)        # 不載入外部字型
    head = head.replace('<html lang="en">', '<html lang="zh-Hant-TW">')
    head = re.sub(r'<title>[^<]*</title>', '<title>晶圓切割體驗｜「義」起解密晶片</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">',
                  '<meta name="description" content="晶圓切割（Dicing）互動 3D 工作站（高中版）：對位、設參數、切割、檢查，體驗速度與良率的取捨。">', head)
    head = re.sub(r'<script type="importmap">.*?</script>', lambda m: '<script type="importmap">' + json.dumps(imap) + '</script>', head, flags=re.S)
    head += '<meta name="theme-color" content="#141414">\n'
    html = (head + '</head>\n<body>\n<!-- Machine Skill kit（MIT）：已內嵌、已中文化 -->\n<script type="module">' + kit + '</script>\n'
            '<script type="module">\n' + body + '</script>\n</body>\n</html>\n')
    assert 'googleapis' not in html and 'polyhaven' not in html and 'jsdelivr' not in html
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(html)
    mb = OUT.stat().st_size / 1e6
    print(f'wrote {OUT}  {mb:.2f} MB')
    assert mb <= 1.6, '超過 1.6 MB'


if __name__ == '__main__':
    main()
