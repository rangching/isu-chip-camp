import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { GOWN_STEPS } from '../../lib/logic';
import { DoneBar, LabFrame, LearnPanel, Section } from '../../components/common';

/** 固定種子的 0～1 亂數 */
const hr = (n: number) => { const x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
import { campLabUrl } from '../../data/media';
import { useProgress } from '../progress/store';
import { sfx } from '../music/sfx';

function Gowning({ onDone }: { onDone: () => void }) {
  const pool = useMemo(() => [...GOWN_STEPS].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hant')), []);
  const [order, setOrder] = useState<string[]>([]);
  const [bad, setBad] = useState<string | null>(null);
  const [miss, setMiss] = useState(0);
  const done = order.length === GOWN_STEPS.length;
  const pick = (id: string) => {
    if (GOWN_STEPS[order.length].id !== id) { setBad(id); setMiss((m) => m + 1); sfx('wrong'); setTimeout(() => setBad(null), 900); return; }
    const next = [...order, id]; setOrder(next); sfx('snap');
    if (next.length === GOWN_STEPS.length) { sfx('levelup'); onDone(); }
  };
  const last = GOWN_STEPS[order.length - 1];
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>無塵衣著裝順序</h4>
      <p className="muted small" style={{ margin: 0 }}>原則：由上往下、由內往外，手套最後戴，最後過空氣浴。依序點選：</p>
      <div className="pool">
        {pool.map((s) => <button key={s.id} className={`btn sm ${bad === s.id ? 'on' : ''}`} style={bad === s.id ? { borderColor: 'var(--error)', color: 'var(--error)' } : undefined} disabled={order.includes(s.id)} onClick={() => pick(s.id)}>{s.name}</button>)}
      </div>
      <div className="steps">
        {order.map((id, i) => <div key={id} className="step-chip placed"><span className="n">{i + 1}</span>{GOWN_STEPS[i].name}</div>)}
      </div>
      {last && <div className="callout info">{last.name}：{last.why}</div>}
      {done && <div className="callout ok">全部穿好了{miss ? `（放錯 ${miss} 次）` : '，一次全對！'}實際規定以 6F 潔淨室現場說明為準。</div>}
      {!done && <span className="dim small">放錯 {miss} 次</span>}
    </div>
  );
}

/** 空氣浴：粒子被吹走的小動畫 */
function AirShower({ onDone }: { onDone: () => void }) {
  const [t, setT] = useState(-1);
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (t < 0) return;
    if (t >= 10) { onDone(); return; }
    const id = setTimeout(() => setT(t + 1), 1000);
    return () => clearTimeout(id);
  }, [t, onDone]);
  useEffect(() => {
    const c = cv.current; if (!c) return;
    const g = c.getContext('2d')!; c.width = 320; c.height = 200;
    const N = 70;
    const ps = Array.from({ length: N }, (_, i) => ({ x: 136 + hr(i) * 48, y: 30 + hr(i + 500) * 160, vx: 0, vy: 0, alive: true }));
    let raf = 0; const start = performance.now();
    const draw = (now: number) => {
      const running = t >= 0 && t < 10;
      g.clearRect(0, 0, 320, 200);
      g.fillStyle = '#2a3a40'; g.fillRect(0, 0, 18, 200); g.fillRect(302, 0, 18, 200);
      g.fillStyle = '#d7dde0'; g.beginPath(); g.ellipse(160, 46, 18, 20, 0, 0, Math.PI * 2); g.fill();
      g.fillRect(138, 66, 44, 90); g.fillRect(142, 156, 14, 36); g.fillRect(164, 156, 14, 36);
      ps.forEach((p, i) => {
        if (running) {
          const dir = i % 2 ? 1 : -1;
          p.vx += dir * 0.06 + Math.sin(now / 200 + i) * 0.02; p.vy += Math.cos(now / 300 + i) * 0.02;
          if ((now - start) / 1000 > (i % 10) * 0.4) { p.x += p.vx; p.y += p.vy; }
        }
        if (p.x < 18 || p.x > 302) p.alive = false;
        if (p.alive) { g.fillStyle = '#F2A65A'; g.beginPath(); g.arc(p.x, p.y, 2.2, 0, Math.PI * 2); g.fill(); }
      });
      if (running) { g.strokeStyle = 'rgba(88,196,221,.5)'; for (let k = 0; k < 6; k++) { const y = 20 + k * 30 + ((now / 8) % 30); g.beginPath(); g.moveTo(18, y); g.lineTo(60, y); g.moveTo(302, y); g.lineTo(260, y); g.stroke(); } }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [t]);
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>空氣浴</h4>
      <canvas ref={cv} style={{ width: '100%', maxWidth: 360, background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--line)' }} aria-label="空氣浴動畫：橘色微粒被兩側的高速空氣吹走" />
      <div className="row">
        <button className="btn sm primary" disabled={t >= 0 && t < 10} onClick={() => { setT(0); sfx('power'); }}>{t < 0 ? '進入空氣浴' : t >= 10 ? '再吹一次' : `吹淨中… ${10 - t} 秒`}</button>
        <span className="muted small">站在中間、慢慢轉身，讓高速空氣吹掉身上的微粒（橘點）。</span>
      </div>
    </div>
  );
}

const CLASSES = [
  { name: '一般教室', n: 35_000_000, note: '每立方英尺約數百萬顆 0.5 µm 微粒（示意）' },
  { name: 'Class 10,000', n: 10_000, note: '一般電子組裝廠' },
  { name: 'Class 1,000', n: 1_000, note: '封裝、部分製程區' },
  { name: 'Class 100', n: 100, note: '黃光區常見等級' },
  { name: 'Class 1', n: 1, note: '先進製程晶圓廠核心區' },
];
function ClassCompare() {
  const [i, setI] = useState(3);
  const c = CLASSES[i];
  const dots = Math.min(400, Math.max(1, Math.round(Math.log10(c.n + 1) * 52)));
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>潔淨度有多乾淨？</h4>
      <div className="tabs">{CLASSES.map((x, k) => <button key={x.name} className={k === i ? 'on' : ''} onClick={() => setI(k)}>{x.name}</button>)}</div>
      <svg viewBox="0 0 200 100" style={{ width: '100%', background: 'var(--bg-2)', borderRadius: 12, border: '1px solid var(--line)' }} aria-label={`${c.name} 的微粒示意`}>
        {Array.from({ length: dots }, (_, k) => <circle key={k} cx={hr(k) * 196 + 2} cy={hr(k + 999) * 96 + 2} r="1.2" fill="var(--hole)" />)}
      </svg>
      <p className="small" style={{ margin: 0 }}><b>{c.name}</b>：每立方英尺 0.5 µm 以上微粒 ≤ <b className="mono">{c.n.toLocaleString()}</b> 顆。{c.note}。（點數是對數示意，不是真實數量）</p>
    </div>
  );
}

export function Cleanroom() {
  const lab = useProgress((s) => s.labs.dicing);
  const setLab = useProgress((s) => s.setLab);
  const award = useProgress((s) => s.award);
  const [gown, setGown] = useState(false);
  const [shower, setShower] = useState(false);
  const onGown = useCallback(() => { setGown(true); award('clean:gown', 15, '無塵衣著裝順序正確'); }, [award]);
  const onShower = useCallback(() => { setShower(true); award('clean:shower', 5, '通過空氣浴'); }, [award]);
  const onMsg = useCallback((d: { lab: string; event: string; data: Record<string, number> }) => {
    if (d.lab !== 'dicing') return;
    setLab('dicing', { ...d.data, ...(d.event === 'complete' ? { complete: 1 } : {}) });
    if (d.event === 'complete') award('dicing:lab', 20, '晶圓切割良率達標');
  }, [setLab, award]);
  return (
    <Section id="cleanroom" no="06" when="6F 潔淨室" title="潔淨室與晶圓切割"
      lead="晶片上的電路比灰塵小上千倍，所以要在潔淨室裡做。先學會正確穿無塵衣、通過空氣浴，再到切割機前把晶圓切成一顆顆晶粒。">
      <div className="grid-3">
        <div className="panel pad"><Gowning onDone={onGown} /></div>
        <div className="panel pad"><AirShower onDone={onShower} /></div>
        <div className="panel pad"><ClassCompare /></div>
      </div>
      <h3 style={{ marginTop: 24 }}>晶圓切割機</h3>
      <LabFrame src={campLabUrl('dicing')} title="晶圓切割（高中版 3D）" onMessage={onMsg}
        desc="對位 → 設參數 → 切割 → 顯微檢查。切太快會崩邊、偏太多會切到晶粒！" badge="營隊專屬工作站" />
      <div className="row" style={{ marginTop: 10 }}>
        {lab ? <>
          {lab.yield !== undefined && <span className="chip output">良率 {Math.round(lab.yield)}%</span>}
          {lab.seconds !== undefined && <span className="chip electron">切割時間 {Math.round(lab.seconds)} 秒</span>}
          {lab.chippingUm !== undefined && <span className="chip hole">最大崩邊 {Math.round(lab.chippingUm)} µm</span>}
          {lab.attempts !== undefined && <span className="chip">第 {lab.attempts} 次</span>}
        </> : <span className="muted small">切割結果會自動記到你的闖關護照。</span>}
      </div>
      <div style={{ marginTop: 16 }}><LearnPanel id="cleanroom" /></div>
      <DoneBar id="cleanroom" ready={gown && !!lab?.complete} xp={40} label="潔淨室通行證"
        hint={`著裝順序全對（${gown ? '✓' : '…'}）並讓切割良率達到 90%（${lab?.complete ? '✓' : '…'}），就能完成任務。${shower ? '' : '別忘了過空氣浴！'}`} />
    </Section>
  );
}
