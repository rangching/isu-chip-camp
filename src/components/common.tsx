import { useEffect, useRef, useState, type ReactNode } from 'react';
import { LEARN, type Question } from '../data/learn';
import { SERIES, mediaUrl, labUrl, type SeriesUnit } from '../data/media';
import { useProgress } from '../features/progress/store';
import { sfx } from '../features/music/sfx';
import { highlight } from '../lib/syntax';
import { CALCULATORS, evaluate } from '../lib/formula';
import { IconCopy, IconCheck, IconMax } from '../lib/icons';

// ---------- 區塊外框 ----------
export function Section({ id, no, when, title, lead, children }: { id: string; no: string; when?: string; title: string; lead?: ReactNode; children: ReactNode }) {
  const done = useProgress((s) => !!s.done[id]);
  return (
    <section className="section" id={id}>
      <div className="container">
        <header className="section-head">
          <span className="section-num"><b>{no}</b>{when && <span className="when">{when}</span>}{done && <span className="done">✓ 已完成</span>}</span>
          <h2>{title}</h2>
          {lead && <p>{lead}</p>}
        </header>
        {children}
      </div>
    </section>
  );
}

// ---------- 小測驗（改寫自互動教材 renderQuiz） ----------
export function Quiz({ id, onPass }: { id: string; onPass?: () => void }) {
  const qs: Question[] = LEARN[id]?.quiz ?? [];
  const [picked, setPicked] = useState<(number | null)[]>(() => qs.map(() => null));
  const setBest = useProgress((s) => s.setQuizBest);
  const award = useProgress((s) => s.award);
  const right = picked.filter((p, i) => p === qs[i].answer).length;
  const finished = picked.every((p) => p !== null);
  useEffect(() => {
    if (!finished) return;
    setBest(id, right);
    if (right === qs.length) { award(`quiz:${id}`, 15, '小測驗全對'); onPass?.(); }
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!qs.length) return null;
  return (
    <div className="quiz">
      {qs.map((q, i) => {
        const p = picked[i];
        return (
          <div className="q-card" key={i}>
            <p className="q">{i + 1}. {q.q}</p>
            <div className="q-opts">
              {q.options.map((o, j) => (
                <button key={j} className={`q-opt ${p !== null && j === q.answer ? 'right' : ''} ${p === j && j !== q.answer ? 'wrong' : ''}`} disabled={p !== null}
                  onClick={() => { sfx(j === q.answer ? 'correct' : 'wrong'); setPicked((a) => a.map((x, k) => (k === i ? j : x))); }}>
                  <span className="l">{'ABCD'[j]}</span><span>{o}</span>
                </button>
              ))}
            </div>
            {p !== null && <div className="q-why"><b style={{ color: p === q.answer ? 'var(--output)' : 'var(--error)' }}>{p === q.answer ? '答對了！' : `正確答案是 ${'ABCD'[q.answer]}`}</b>　{q.why}</div>}
          </div>
        );
      })}
      {finished && (
        <div className="row">
          <span className={`chip ${right === qs.length ? 'output' : 'field'}`}>答對 {right} / {qs.length}</span>
          <button className="btn sm ghost" onClick={() => setPicked(qs.map(() => null))}>再做一次</button>
        </div>
      )}
    </div>
  );
}

export function FlipCards({ id }: { id: string }) {
  const terms = LEARN[id]?.terms ?? [];
  const [on, setOn] = useState<number[]>([]);
  return (
    <div className="flip-grid">
      {terms.map((t, i) => (
        <button key={t.zh} className={`flip ${on.includes(i) ? 'on' : ''}`} onClick={() => setOn((a) => (a.includes(i) ? a.filter((x) => x !== i) : [...a, i]))} aria-label={`${t.zh}：點一下翻面`}>
          <div className="flip-inner">
            <div className="flip-face"><b>{t.zh}</b><small>{t.en}</small><span className="dim small">點一下翻面</span></div>
            <div className="flip-face back">{t.def}</div>
          </div>
        </button>
      ))}
    </div>
  );
}

export function Myths({ id }: { id: string }) {
  const myths = LEARN[id]?.myths ?? [];
  if (!myths.length) return null;
  return <div className="stack">{myths.map((m) => <details className="myth" key={m.claim}><summary>{m.claim}</summary><p>{m.fix}</p></details>)}</div>;
}

/** 測驗／術語／迷思合在一個分頁卡 */
export function LearnPanel({ id, onPass }: { id: string; onPass?: () => void }) {
  const L = LEARN[id];
  const tabs = [
    { k: 'quiz', label: `小測驗（${L?.quiz.length ?? 0}）` },
    { k: 'terms', label: '術語翻卡' },
    ...(L?.myths.length ? [{ k: 'myths', label: '常見迷思' }] : []),
  ];
  const [tab, setTab] = useState('quiz');
  return (
    <div className="panel pad">
      <div className="tabs learn-tabs" role="tablist">
        {tabs.map((t) => <button key={t.k} role="tab" aria-selected={tab === t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>{t.label}</button>)}
      </div>
      {tab === 'quiz' && <Quiz id={id} onPass={onPass} />}
      {tab === 'terms' && <FlipCards id={id} />}
      {tab === 'myths' && <Myths id={id} />}
    </div>
  );
}

// ---------- 3D 工作站（iframe，按了才載入） ----------
export function LabFrame({ src, title, desc, onMessage, autoload = false, badge }: { src: string; title: string; desc?: string; onMessage?: (d: any) => void; autoload?: boolean; badge?: string }) {
  const [load, setLoad] = useState(autoload);
  const [full, setFull] = useState(false);
  const ref = useRef<HTMLIFrameElement>(null);
  useEffect(() => {
    if (!onMessage) return;
    const h = (e: MessageEvent) => {
      if (e.source !== ref.current?.contentWindow) return;
      if (e.data && e.data.source === 'chip-camp-lab') onMessage(e.data);
    };
    addEventListener('message', h);
    return () => removeEventListener('message', h);
  }, [onMessage]);
  return (
    <div className={`labframe ${full ? 'full' : ''}`}>
      {load ? (
        <iframe ref={ref} src={src} title={title} loading="lazy" allow="fullscreen" />
      ) : (
        <div className="lab-poster">
          {badge && <span className="chip electron">{badge}</span>}
          <b style={{ fontSize: 20 }}>{title}</b>
          {desc && <p>{desc}</p>}
          <button className="btn primary" onClick={() => setLoad(true)}>載入 3D 工作站</button>
          <p style={{ fontSize: 12 }}>可旋轉、縮放、點零件看說明（約 1.5 MB）</p>
        </div>
      )}
      <div className="lab-bar">
        <span>{title}</span>
        <div className="row" style={{ gap: 6 }}>
          {load && <button className="btn sm ghost" onClick={() => setFull(!full)}><IconMax size={13} />{full ? '縮小' : '放大'}</button>}
          <a className="btn sm ghost" href={src} target="_blank" rel="noreferrer">新分頁開啟</a>
        </div>
      </div>
    </div>
  );
}

// ---------- 影片 ----------
export function Video({ unit, kind, caption }: { unit: string; kind: 'intro' | 'demo' | 'full'; caption?: string }) {
  const u = SERIES[unit];
  if (!u) return null;
  let body: ReactNode;
  if (kind === 'full') {
    body = u.youtube
      ? <iframe src={`https://www.youtube-nocookie.com/embed/${u.youtube}?rel=0`} title={u.title} loading="lazy" allow="encrypted-media; picture-in-picture; fullscreen" />
      : <div className="soon">完整影片即將上架 YouTube<br />先看下面的片頭與 3D 工作站</div>;
  } else {
    body = <video src={mediaUrl(`media/${kind}-${unit}.mp4`)} controls playsInline preload="metadata" />;
  }
  return (
    <figure className="vid" style={{ margin: 0 }}>
      {body}
      <figcaption className="vid-cap"><b>{u.code}</b>　{caption ?? u.title}{kind === 'demo' ? '（3D 工作站展示）' : kind === 'intro' ? '（片頭）' : ''}</figcaption>
    </figure>
  );
}

/** 「延伸探索」：系列單元卡片，每張可以看片頭、開 3D */
export function Extend({ units, title = '延伸探索：半導體物理及元件系列' }: { units: string[]; title?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const list = units.map((u) => SERIES[u]).filter(Boolean) as SeriesUnit[];
  return (
    <div className="panel pad" style={{ marginTop: 16 }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
        <h3 style={{ margin: 0 }}>{title}</h3>
        <span className="chip charge">大學程度・看感覺就好</span>
      </div>
      <div className="ext-list">
        {list.map((u) => (
          <div className="ext-card" key={u.id}>
            <span className="code">{u.code}</span>
            <b>{u.title}</b>
            <span className="muted small">{u.hook}</span>
            <div className="row" style={{ gap: 6 }}>
              {u.intro && <button className={`btn sm ${open === `v:${u.id}` ? 'on' : ''}`} onClick={() => setOpen(open === `v:${u.id}` ? null : `v:${u.id}`)}>片頭</button>}
              {u.demo && <button className={`btn sm ${open === `d:${u.id}` ? 'on' : ''}`} onClick={() => setOpen(open === `d:${u.id}` ? null : `d:${u.id}`)}>展示片</button>}
              {u.lab && <button className={`btn sm ${open === `l:${u.id}` ? 'on' : ''}`} onClick={() => setOpen(open === `l:${u.id}` ? null : `l:${u.id}`)}>3D 工作站</button>}
              {u.youtube && <a className="btn sm ghost" href={`https://www.youtube.com/watch?v=${u.youtube}`} target="_blank" rel="noreferrer">完整影片</a>}
            </div>
          </div>
        ))}
      </div>
      {open && (() => {
        const [k, id] = open.split(':');
        const u = SERIES[id];
        return (
          <div style={{ marginTop: 14 }}>
            {k === 'v' && <Video unit={id} kind="intro" />}
            {k === 'd' && <Video unit={id} kind="demo" />}
            {k === 'l' && <LabFrame key={id} src={labUrl(id)} title={`${u.code} ${u.lab}`} autoload />}
          </div>
        );
      })()}
    </div>
  );
}

// ---------- 程式碼 ----------
export function CodeBlock({ code, file }: { code: string; file: string }) {
  const [copied, setCopied] = useState(false);
  const lines = code.replace(/\n$/, '').split('\n');
  return (
    <div>
      <div className="code-head">
        <span className="mono small muted">{file}</span>
        <button className="btn sm ghost" onClick={() => { navigator.clipboard?.writeText(code).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }}>
          {copied ? <><IconCheck size={13} />已複製</> : <><IconCopy size={13} />複製程式</>}
        </button>
      </div>
      <pre className="code">{lines.map((l, i) => <div key={i}><span className="ln">{i + 1}</span>{highlight(l, i * 100)}</div>)}</pre>
    </div>
  );
}

// ---------- 計算器 ----------
export function Calc({ id }: { id: keyof typeof CALCULATORS }) {
  const c = CALCULATORS[id];
  const [v, setV] = useState<Record<string, number>>(() => Object.fromEntries(c.inputs.map((x) => [x.id, x.value])));
  return (
    <div className="calc">
      <h4 style={{ margin: 0 }}>{c.title}</h4>
      <div className="formula">{c.formula}</div>
      {c.inputs.map((x) => (
        <div className="field" key={x.id}>
          <label htmlFor={`${c.id}-${x.id}`}>{x.label}：<b className="mono">{v[x.id]}</b> {x.unit}</label>
          <input id={`${c.id}-${x.id}`} type="range" min={x.min} max={x.max} step={x.step} value={v[x.id]} onChange={(e) => setV({ ...v, [x.id]: +e.target.value })} />
        </div>
      ))}
      <div className="out">
        {c.outputs.map((o) => {
          let val = '—';
          try { const r = evaluate(o.node, v); val = (o.pct ? r * 100 : r).toFixed(o.digits); } catch { /* 顯示破折號 */ }
          return <div key={o.label}><small className="muted">{o.label}</small><b>{val}<span style={{ fontSize: 14 }}> {o.unit}</span></b></div>;
        })}
      </div>
      <p className="muted small" style={{ margin: 0 }}>{c.note}</p>
    </div>
  );
}

/** 任務完成按鈕列 */
export function DoneBar({ id, ready, xp, label, hint }: { id: string; ready: boolean; xp: number; label: string; hint: string }) {
  const done = useProgress((s) => !!s.done[id]);
  const complete = useProgress((s) => s.complete);
  return (
    <div className={`callout ${done ? 'ok' : ready ? 'info' : ''}`} style={{ marginTop: 16, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
      <span>{done ? `✓ 任務完成：${label}` : hint}</span>
      {!done && <button className="btn go sm" disabled={!ready} onClick={() => { sfx('correct'); complete(id, xp, label); }}>完成任務 +{xp} XP</button>}
    </div>
  );
}
