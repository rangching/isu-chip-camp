import { useState } from 'react';
import { CHAIN, STAGES, S_CORRIDOR } from '../../data/camp';
import { DoneBar, Extend, LearnPanel, Section, Video } from '../../components/common';
import { useProgress } from '../progress/store';
import { sfx } from '../music/sfx';

export function Industry() {
  const [sel, setSel] = useState('fab');
  const [seen, setSeen] = useState<string[]>(['fab']);
  const quizOk = useProgress((s) => (s.quizBest.industry ?? 0) >= 2);
  const node = CHAIN.find((c) => c.id === sel)!;
  const pick = (id: string) => { setSel(id); sfx('click'); setSeen((a) => (a.includes(id) ? a : [...a, id])); };
  return (
    <Section id="industry" no="02" when="09:30 開場" title="晶片怎麼從一張設計圖變成手機裡的大腦？"
      lead="點每一格看看產業鏈上的每一站在做什麼。標著「今天會體驗」的，就是你今天會親手碰到的環節。">
      <div className="chain">
        {STAGES.map((st) => (
          <div className="chain-col" key={st.id}>
            <header><b>{st.name}</b><span className="dim small">{st.sub}</span></header>
            {CHAIN.filter((c) => c.stage === st.id).map((c) => (
              <button key={c.id} className={`chain-node ${sel === c.id ? 'on' : ''} ${c.camp ? 'camp' : ''}`} onClick={() => pick(c.id)} aria-pressed={sel === c.id}>
                <b>{c.name}</b><small>{c.examples}</small>
              </button>
            ))}
          </div>
        ))}
      </div>
      <div className="mission-grid" style={{ marginTop: 16 }}>
        <div className="panel pad stack">
          <span className="kicker">{STAGES.find((s) => s.id === node.stage)!.name}・{node.name}</span>
          <p style={{ margin: 0, fontSize: 18 }}>{node.desc}</p>
          <p className="muted small" style={{ margin: 0 }}>代表企業：{node.examples}</p>
          {node.camp && <div className="callout">🎯 今天會體驗：{node.camp}</div>}
          <span className="dim small">已看過 {seen.length} / {CHAIN.length} 站</span>
        </div>
        <div className="panel pad">
          <h4>南部半導體 S 廊帶</h4>
          <svg viewBox="0 0 100 80" style={{ width: '100%', height: 'auto' }} role="img" aria-label="南部半導體 S 廊帶示意圖">
            <path d="M22 10 C 40 18, 20 26, 32 30 S 40 40, 36 44 S 28 56, 34 62" fill="none" stroke="var(--electron)" strokeWidth="2.2" strokeDasharray="3 2" opacity=".6" />
            {S_CORRIDOR.map((p) => (
              <g key={p.id}>
                {p.me ? <rect x={p.x - 2.2} y={p.y - 2.2} width="4.4" height="4.4" fill="var(--field)" transform={`rotate(45 ${p.x} ${p.y})`} />
                  : <circle cx={p.x} cy={p.y} r="2.2" fill="var(--electron)" />}
                <text x={p.x + 4} y={p.y + 1.2} fontSize="4" fill="var(--text)">{p.name}</text>
              </g>
            ))}
          </svg>
          <p className="muted small" style={{ margin: 0 }}>臺南到高雄串起晶圓製造、記憶體、封測與新興科學園區。台積電已在高雄設立 2 奈米晶圓廠。示意圖，位置不按比例。</p>
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <Video unit="m00-01" kind="full" caption="晶片、元件、材料：從手機縮小到電晶體" />
        <LearnPanel id="industry" />
      </div>
      <DoneBar id="industry" ready={seen.length >= 5 && quizOk} xp={40} label="產業鏈導航員"
        hint={`看過至少 5 站（${Math.min(seen.length, 5)}/5）並答對 2 題以上小測驗，就能完成任務。`} />
      <Extend units={['m00-01', 'm01-01', 'm11-01']} />
    </Section>
  );
}
