import { useState } from 'react';
import { bitsToDec, cds, gate, randomTarget, truthTable, type Gate } from '../../lib/logic';
import { DoneBar, Extend, LearnPanel, Section, Video } from '../../components/common';
import { useProgress } from '../progress/store';
import { sfx } from '../music/sfx';

const GATES: { g: Gate; zh: string; say: string }[] = [
  { g: 'AND', zh: '且', say: 'A 和 B 都是 1，輸出才是 1——像兩個開關串聯。' },
  { g: 'OR', zh: '或', say: 'A 或 B 只要有一個是 1，輸出就是 1——像兩個開關並聯。' },
  { g: 'NOT', zh: '反', say: '把 0 變 1、1 變 0。用兩顆電晶體就做得出來（CMOS 反相器）。' },
  { g: 'XOR', zh: '互斥或', say: 'A、B 不一樣才輸出 1；相同就輸出 0。可以拿來比對密碼。' },
];

function GateSymbol({ g, a, b, y }: { g: Gate; a: 0 | 1; b: 0 | 1; y: 0 | 1 }) {
  const col = (v: number) => (v ? 'var(--field)' : 'var(--text-3)');
  const body = g === 'AND' ? 'M80 20 H120 A40 40 0 0 1 120 100 H80 Z'
    : g === 'NOT' ? 'M80 20 L150 60 L80 100 Z'
    : 'M76 20 Q130 20 160 60 Q130 100 76 100 Q100 60 76 20 Z';
  return (
    <svg viewBox="0 0 240 120" className="gate-svg" role="img" aria-label={`${g} 閘：A=${a}${g === 'NOT' ? '' : `，B=${b}`}，輸出 Y=${y}`}>
      <path d={`M10 ${g === 'NOT' ? 60 : 40} H${g === 'OR' || g === 'XOR' ? 90 : 80}`} stroke={col(a)} strokeWidth="4" />
      {g !== 'NOT' && <path d={`M10 80 H${g === 'OR' || g === 'XOR' ? 90 : 80}`} stroke={col(b)} strokeWidth="4" />}
      {g === 'XOR' && <path d="M66 20 Q90 60 66 100" fill="none" stroke="var(--text)" strokeWidth="3" />}
      <path d={body} fill="var(--panel)" stroke="var(--text)" strokeWidth="3" />
      {g === 'NOT' && <circle cx="157" cy="60" r="7" fill="var(--panel)" stroke="var(--text)" strokeWidth="3" />}
      <path d={`M${g === 'NOT' ? 164 : 160} 60 H205`} stroke={col(y)} strokeWidth="4" />
      <circle cx="218" cy="60" r="13" fill={y ? 'var(--field)' : 'var(--panel-2)'} stroke="var(--text)" strokeWidth="2" style={{ filter: y ? 'drop-shadow(0 0 8px var(--field))' : undefined }} />
      <text x="4" y={g === 'NOT' ? 52 : 32} fontSize="13" fill="var(--text-2)">A={a}</text>
      {g !== 'NOT' && <text x="4" y="98" fontSize="13" fill="var(--text-2)">B={b}</text>}
      <text x="104" y="66" fontSize="15" fontWeight="700" textAnchor="middle" fill="var(--text)">{g}</text>
    </svg>
  );
}

function GatePlay({ onTry }: { onTry: (g: Gate) => void }) {
  const [gi, setGi] = useState(0);
  const [a, setA] = useState<0 | 1>(1);
  const [b, setB] = useState<0 | 1>(0);
  const { g, say } = GATES[gi];
  const y = gate(g, a, b);
  return (
    <div className="stack">
      <div className="tabs">{GATES.map((x, i) => <button key={x.g} className={i === gi ? 'on' : ''} onClick={() => { setGi(i); onTry(x.g); }}>{x.g}（{x.zh}）</button>)}</div>
      <GateSymbol g={g} a={a} b={b} y={y} />
      <div className="row">
        <button className={`btn sm ${a ? 'on' : ''}`} onClick={() => { setA(a ? 0 : 1); sfx('click'); onTry(g); }}>A = {a}</button>
        {g !== 'NOT' && <button className={`btn sm ${b ? 'on' : ''}`} onClick={() => { setB(b ? 0 : 1); sfx('click'); onTry(g); }}>B = {b}</button>}
        <span className="chip field">Y = {y}</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{say}</p>
      <table className="small" style={{ borderCollapse: 'collapse', width: '100%', maxWidth: 260 }}>
        <thead><tr>{['A', ...(g === 'NOT' ? [] : ['B']), 'Y'].map((h) => <th key={h} style={{ textAlign: 'center', padding: 4, borderBottom: '1px solid var(--line)' }}>{h}</th>)}</tr></thead>
        <tbody>{truthTable(g).map((r) => {
          const on = r.a === a && (g === 'NOT' || r.b === b);
          return <tr key={`${r.a}${r.b}`} style={{ background: on ? 'var(--field-soft)' : undefined }}>{[r.a, ...(g === 'NOT' ? [] : [r.b]), r.y].map((v, k) => <td key={k} className="mono" style={{ textAlign: 'center', padding: 4 }}>{v}</td>)}</tr>;
        })}</tbody>
      </table>
    </div>
  );
}

function Switch() {
  const [vg, setVg] = useState(0);
  const on = vg > 0.7;
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>電晶體＝用電壓控制的開關</h4>
      <svg viewBox="0 0 240 120" className="gate-svg" role="img" aria-label={`閘極電壓 ${vg.toFixed(1)} 伏，電晶體${on ? '導通' : '關閉'}`}>
        <rect x="70" y="70" width="100" height="30" fill="#536879" stroke="var(--text)" />
        <rect x="70" y="62" width="100" height="8" fill="#747C84" />
        <rect x="95" y="40" width="50" height="22" fill="#AAAAAA" stroke="var(--text)" />
        <text x="120" y="56" fontSize="11" textAnchor="middle" fill="#141414">閘極</text>
        <rect x="60" y="74" width="26" height="22" fill="var(--hole)" opacity=".7" /><text x="73" y="112" fontSize="10" textAnchor="middle" fill="var(--text-2)">源極</text>
        <rect x="154" y="74" width="26" height="22" fill="var(--hole)" opacity=".7" /><text x="167" y="112" fontSize="10" textAnchor="middle" fill="var(--text-2)">汲極</text>
        {on && <rect x="86" y="72" width="68" height={4 + vg * 1.2} fill="var(--electron)" opacity=".85" />}
        {on && Array.from({ length: 5 }, (_, k) => <circle key={k} r="2.4" cy="74" fill="var(--electron)"><animate attributeName="cx" from="80" to="160" dur={`${1.6 - vg * 0.2}s`} begin={`${k * 0.3}s`} repeatCount="indefinite" /></circle>)}
        <circle cx="210" cy="40" r="14" fill={on ? 'var(--field)' : 'var(--panel-2)'} stroke="var(--text)" />
        <text x="210" y="70" fontSize="11" textAnchor="middle" fill="var(--text-2)">{on ? '亮＝1' : '暗＝0'}</text>
      </svg>
      <div className="field">
        <label htmlFor="vg">閘極電壓 V<sub>G</sub>：<b className="mono">{vg.toFixed(1)} V</b>（超過約 0.7 V 就打開，示意值）</label>
        <input id="vg" type="range" min={0} max={5} step={0.1} value={vg} onChange={(e) => setVg(+e.target.value)} />
      </div>
      <p className="muted small" style={{ margin: 0 }}>閘極加電壓，下面就形成一條電子通道（藍色），電流從源極流到汲極——開關打開。手機晶片裡有上百億顆這樣的開關。</p>
    </div>
  );
}

function Binary({ onHit }: { onHit: () => void }) {
  const [bits, setBits] = useState<(0 | 1)[]>([0, 0, 0, 0]);
  const [round, setRound] = useState(1);
  const [hits, setHits] = useState(0);
  const target = randomTarget(round);
  const n = bitsToDec(bits);
  const flip = (i: number) => {
    const nb = bits.map((x, k) => (k === i ? (x ? 0 : 1) : x)) as (0 | 1)[];
    setBits(nb); sfx('click');
    if (bitsToDec(nb) === target) { sfx('correct'); setHits((h) => h + 1); onHit(); setTimeout(() => { setRound((r) => r + 1); setBits([0, 0, 0, 0]); }, 700); }
  };
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>二進位挑戰：撥出目標數字</h4>
      <div className="row"><span className="chip field" style={{ fontSize: 18, height: 34 }}>目標 {target}</span><span className="muted small">已命中 {hits} 題</span></div>
      <div className="row" style={{ gap: 8 }}>
        {bits.map((b, i) => (
          <button key={i} className={`btn ${b ? 'on' : ''}`} style={{ width: 60, height: 70, flexDirection: 'column', gap: 0 }} onClick={() => flip(i)} aria-label={`第 ${i + 1} 位，權重 ${8 >> i}，目前 ${b}`}>
            <span className="mono" style={{ fontSize: 26, fontWeight: 700 }}>{b}</span><small className="dim">{8 >> i}</small>
          </button>
        ))}
        <span className="mono" style={{ fontSize: 22 }}>= {n}</span>
      </div>
      <p className="muted small" style={{ margin: 0 }}>{bits.map((b, i) => `${b}×${8 >> i}`).join(' + ')} = {n}</p>
    </div>
  );
}

function CdsSim() {
  const [e, setE] = useState(2); // log10 lux
  const lux = Math.pow(10, e);
  const r = cds(lux);
  const fmtR = r.rCds >= 1000 ? `${(r.rCds / 1000).toFixed(r.rCds >= 1e5 ? 0 : 1)} kΩ` : `${r.rCds.toFixed(0)} Ω`;
  const scene = lux < 5 ? '夜晚關燈' : lux < 80 ? '昏暗房間' : lux < 800 ? '教室燈光' : '窗邊陽光';
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>光敏電阻 CdS：亮度怎麼變成數字？</h4>
      <svg viewBox="0 0 240 130" className="gate-svg" role="img" aria-label={`CdS 分壓電路，亮度 ${Math.round(lux)} lux，A0 讀值 ${r.adc}`}>
        <text x="20" y="18" fontSize="11" fill="var(--text-2)">5V</text>
        <path d="M30 22 V36" stroke="var(--text)" strokeWidth="2" />
        <rect x="18" y="36" width="24" height="30" rx="4" fill="var(--hole-soft)" stroke="var(--hole)" strokeWidth="2" />
        <text x="50" y="55" fontSize="11" fill="var(--hole)">CdS {fmtR}</text>
        <path d="M30 66 V80" stroke="var(--text)" strokeWidth="2" />
        <circle cx="30" cy="80" r="3" fill="var(--electron)" />
        <path d="M30 80 H120" stroke="var(--electron)" strokeWidth="2" />
        <text x="124" y="84" fontSize="12" fill="var(--electron)">A0 = {r.v.toFixed(2)} V → {r.adc}</text>
        <path d="M30 80 V92" stroke="var(--text)" strokeWidth="2" />
        <rect x="20" y="92" width="20" height="22" fill="var(--panel-2)" stroke="var(--text)" strokeWidth="2" />
        <text x="50" y="108" fontSize="11" fill="var(--text-2)">10 kΩ</text>
        <path d="M30 114 V124 M22 124 H38" stroke="var(--text)" strokeWidth="2" />
        {Array.from({ length: Math.round(e * 2) }, (_, k) => <path key={k} d={`M${200 - k * 6} ${10 + k * 3} l-16 18`} stroke="var(--field)" strokeWidth="2" opacity=".8" />)}
      </svg>
      <div className="field">
        <label htmlFor="lux">環境亮度：<b className="mono">{lux < 10 ? lux.toFixed(1) : Math.round(lux)} lux</b>（{scene}）</label>
        <input id="lux" type="range" min={-0.5} max={4} step={0.05} value={e} onChange={(ev) => setE(+ev.target.value)} />
      </div>
      <div className="meter" aria-hidden><i style={{ width: `${(r.adc / 1023) * 100}%` }} /><span>analogRead(A0) = {r.adc}</span></div>
      <p className="muted small" style={{ margin: 0 }}>越亮 → CdS 電阻越小 → A0 電壓越高 → 讀值越大。Arduino 的 ADC 把 0～5 V 切成 1024 格（0～1023）。數值為示意。</p>
    </div>
  );
}

export function Logic() {
  const [tried, setTried] = useState<string[]>([]);
  const [hits, setHits] = useState(0);
  const quizOk = useProgress((s) => (s.quizBest.logic ?? 0) >= 3);
  const onTry = (g: string) => setTried((t) => (t.includes(g) ? t : [...t, g]));
  return (
    <Section id="logic" no="07" when="13:30" title="從矽晶片到感測器：0 與 1 的世界"
      lead="晶片裡的電晶體是開關，開關組成邏輯閘，邏輯閘組成會計算的電路。感測器則把光、聲音變成電壓，再變成晶片看得懂的數字。">
      <div className="grid-2">
        <div className="panel pad"><GatePlay onTry={onTry} /></div>
        <div className="panel pad stack"><Switch /></div>
        <div className="panel pad"><Binary onHit={() => setHits((h) => h + 1)} /></div>
        <div className="panel pad"><CdsSim /></div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="stack">
          <Video unit="m09-01" kind="intro" caption="電晶體：閘極控制電流" />
          <Video unit="m09-06" kind="demo" />
        </div>
        <LearnPanel id="logic" />
      </div>
      <DoneBar id="logic" ready={tried.length >= 3 && hits >= 2 && quizOk}
        xp={30} label="邏輯閘達人" hint={`試玩至少 3 種邏輯閘（${Math.min(3, tried.length)}/3）、二進位挑戰命中 2 題（${Math.min(2, hits)}/2）、小測驗答對 3 題以上。`} />
      <Extend units={['m09-01', 'm09-06', 'm05-01', 'm02-02']} />
    </Section>
  );
}
