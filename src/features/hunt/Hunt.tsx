import { useEffect, useRef, useState } from 'react';
import { STATIONS, checkStation, configId } from '../../lib/campConfig';
import { useCfg } from '../../lib/cfgStore';
import { useProgress } from '../progress/store';
import { DoneBar, Extend, LearnPanel, Section, Video } from '../../components/common';
import { sfx } from '../music/sfx';

/** 顯微鏡：畫一顆晶粒，微縮文字要放大才看得到 */
function Microscope({ words }: { words: string[] }) {
  const cv = useRef<HTMLCanvasElement>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const S = 600; c.width = S; c.height = S;
    const g = c.getContext('2d')!;
    g.setTransform(1, 0, 0, 1, 0, 0);
    g.fillStyle = '#0d1416'; g.fillRect(0, 0, S, S);
    g.translate(S / 2 + pan.x, S / 2 + pan.y); g.scale(zoom, zoom); g.translate(-S / 2, -S / 2);
    // 晶粒
    g.fillStyle = '#25343a'; g.fillRect(60, 60, 480, 480);
    g.strokeStyle = '#3f5961'; g.lineWidth = 2; g.strokeRect(60, 60, 480, 480);
    // 電路走線（固定亂數）
    let seed = 7; const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
    g.lineWidth = 1.2;
    for (let i = 0; i < 70; i++) {
      g.strokeStyle = i % 3 ? 'rgba(88,196,221,.35)' : 'rgba(242,166,90,.35)';
      const x = 90 + rnd() * 420, y = 90 + rnd() * 420, horiz = rnd() > 0.5, len = 30 + rnd() * 140;
      g.beginPath(); g.moveTo(x, y); g.lineTo(horiz ? Math.min(510, x + len) : x, horiz ? y : Math.min(510, y + len)); g.stroke();
    }
    // 金屬墊
    g.fillStyle = '#b9a46a';
    for (let k = 0; k < 8; k++) { g.fillRect(80 + k * 56, 72, 30, 22); g.fillRect(80 + k * 56, 506, 30, 22); }
    // 微縮文字：四個角落
    const spots = [[112, 130], [430, 130], [112, 470], [430, 470]];
    g.fillStyle = '#F9D976'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.font = '700 3.2px "Noto Sans TC", sans-serif';
    words.forEach((w, i) => { const [x, y] = spots[i]; g.fillText(w, x, y); g.fillRect(x - 6, y + 3, 12, 0.4); });
    // 切割道
    g.fillStyle = '#141e21'; g.fillRect(0, 0, 600, 56); g.fillRect(0, 544, 600, 56);
  }, [zoom, pan, words]);
  const onDown = (e: React.PointerEvent) => { drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y }; (e.target as HTMLElement).setPointerCapture(e.pointerId); };
  const onMove = (e: React.PointerEvent) => {
    const d = drag.current; if (!d) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect(); const k = 600 / r.width;
    setPan({ x: d.px + (e.clientX - d.x) * k, y: d.py + (e.clientY - d.y) * k });
  };
  return (
    <div className="stack">
      <div className="scope" onPointerDown={onDown} onPointerMove={onMove} onPointerUp={() => (drag.current = null)}
        onWheel={(e) => setZoom((z) => Math.max(1, Math.min(40, z * (e.deltaY < 0 ? 1.15 : 0.87))))}>
        <canvas ref={cv} aria-label="顯微鏡視野：放大並拖曳來找微縮文字" />
      </div>
      <div className="field">
        <label htmlFor="zoom">放大倍率：<b className="mono">{zoom.toFixed(1)}×</b>（拖曳畫面移動、滾輪也能縮放）</label>
        <input id="zoom" type="range" min={1} max={40} step={0.5} value={zoom} onChange={(e) => setZoom(+e.target.value)} />
      </div>
      <button className="btn sm ghost" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>回到全景</button>
    </div>
  );
}

export function Hunt() {
  const cfg = useCfg((s) => s.cfg);
  const id = configId(cfg);
  const bits = useProgress((s) => s.hunt[id]) ?? [null, null, null, null];
  const setBit = useProgress((s) => s.setHuntBit);
  const award = useProgress((s) => s.award);
  const [inputs, setInputs] = useState(['', '', '', '']);
  const [msg, setMsg] = useState<(string | null)[]>([null, null, null, null]);
  const live = cfg.mode === 'live';
  const solved = bits.filter((b) => b !== null).length;

  const submit = (i: number) => {
    const b = checkStation(cfg, i, inputs[i]);
    if (b === null) { sfx('wrong'); setMsg((m) => m.map((x, k) => (k === i ? '密碼不對，再找找看！注意是 2 個字。' : x))); return; }
    sfx('correct');
    setBit(id, i, b);
    setMsg((m) => m.map((x, k) => (k === i ? null : x)));
    award(`hunt:${id}:${i}`, 10, `解開「${STATIONS[i].name}」站`);
  };

  return (
    <Section id="hunt" no="03" when="09:30–12:30" title="製程尋寶：解開四站微縮密碼"
      lead={live
        ? '你的「先進半導體製程尋寶與微縮密碼解密單」數位版。到 5F、6F 各站找出藏起來的微縮文字，輸入正確答案就會得到 1 個位元，四個位元就是下午 IC 密碼鎖的密碼！'
        : '練習模式：線索藏在右邊的「顯微鏡」裡。把倍率放大、拖曳畫面找到四個角落的微縮文字，回答四站問題，拿到下午密碼鎖的 4 位元密碼。營隊當天老師會給你現場模式的連結。'}>
      <div className="callout info" style={{ marginBottom: 16 }}>
        <b>你的 4 位元密碼</b>
        <span className="code-strip" style={{ display: 'inline-flex', verticalAlign: 'middle', marginLeft: 8 }}>
          {bits.map((b, i) => <span key={i} className={`b ${b !== null ? 'ok' : ''}`} title={STATIONS[i].name}>{b ?? '?'}</span>)}
        </span>
        <span className="muted small" style={{ marginLeft: 10 }}>（由左到右：沉積、微影、蝕刻、封測）</span>
      </div>
      <div className="mission-grid">
        <div className="stations" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}>
          {STATIONS.map((s, i) => (
            <div key={s.id} className={`station ${bits[i] !== null ? 'solved' : ''}`}>
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <span className="kicker">第 {i + 1} 站・{s.where}</span>
                <span className="bit" aria-label={bits[i] !== null ? `位元 ${bits[i]}` : '尚未解開'}>{bits[i] ?? '?'}</span>
              </div>
              <h4 style={{ margin: 0 }}>{s.name}</h4>
              <p className="muted small" style={{ margin: 0 }}>{s.idea}</p>
              <p style={{ margin: 0, fontWeight: 700 }}>{s.question}</p>
              <p className="small" style={{ margin: 0, color: 'var(--field)' }}>線索：{live ? (cfg.hints?.[i] || `到「${s.where}」找微縮文字`) : s.practiceClue}</p>
              {bits[i] === null ? (
                <form className="row" style={{ gap: 6 }} onSubmit={(e) => { e.preventDefault(); submit(i); }}>
                  <input className="input" style={{ flex: 1, minWidth: 0 }} value={inputs[i]} placeholder="輸入答案" aria-label={`${s.name} 的答案`}
                    onChange={(e) => setInputs((a) => a.map((x, k) => (k === i ? e.target.value : x)))} />
                  <button className="btn primary sm" type="submit" style={{ height: 42 }}>解密</button>
                </form>
              ) : <div className="chip output">✓ 已解開，位元 = {bits[i]}</div>}
              {msg[i] && <span className="small" style={{ color: 'var(--error)' }}>{msg[i]}</span>}
            </div>
          ))}
        </div>
        <div className="panel pad stack">
          <h4 style={{ margin: 0 }}>顯微鏡{live ? '（練習用）' : ''}</h4>
          <Microscope words={live ? ['ISU', '晶片', '半導體', '電子系'] : STATIONS.map((s) => s.practiceMicro)} />
          {live && <p className="muted small" style={{ margin: 0 }}>現場模式的答案不在網頁裡。先在這裡練習怎麼找微縮文字，再到場域找真的線索！</p>}
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="grid-2" style={{ alignContent: 'start' }}>
          <Video unit="m11-03" kind="intro" caption="薄膜沉積" />
          <Video unit="m11-04" kind="intro" caption="黃光微影" />
          <Video unit="m11-05" kind="intro" caption="蝕刻" />
          <Video unit="m12-04" kind="intro" caption="量測與晶圓圖" />
        </div>
        <LearnPanel id="hunt" />
      </div>
      <DoneBar id="hunt" ready={solved === 4} xp={50} label="微縮密碼獵人" hint={`解開四站拿到完整密碼（${solved}/4），就能完成任務；密碼下午在「密碼鎖」關卡會用到。`} />
      <Extend units={['m11-03', 'm11-04', 'm11-05']} />
    </Section>
  );
}
