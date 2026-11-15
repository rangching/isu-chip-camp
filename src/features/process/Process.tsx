import { useMemo, useState } from 'react';
import { PROCESS_STEPS, firstWrong, type StepId } from '../../lib/logic';
import { DoneBar, Extend, LabFrame, LearnPanel, Section, Video } from '../../components/common';
import { labUrl } from '../../data/media';
import { useProgress } from '../progress/store';
import { sfx } from '../music/sfx';

// 剖面配色沿用 assets_draft/layer_stack.svg：基板 #353B42、矽 #536879、絕緣層 #747C84、金屬 #AAAAAA、描邊 #ECEEDF
const C = { sub: '#353B42', si: '#536879', ox: '#747C84', pr: '#F2A65A', prx: '#7a4f25', metal: '#C9CCD0', line: '#ECEEDF', uv: '#B79CED', mask: '#1f2a30' };

const NOTE: Record<StepId, string> = {
  clean: '先用化學溶液把晶圓洗乾淨，去掉微粒與有機物。',
  oxide: '放進約 1000 °C 的爐管通氧氣，矽表面長出一層二氧化矽（絕緣層）。',
  coat: '晶圓高速旋轉，把液態光阻甩成均勻的薄膜。',
  expose: '紫外光穿過光罩，只有光罩透光的地方照到光阻。',
  develop: '顯影液洗掉照到光的光阻（正光阻），圖案出現了！',
  etch: '蝕刻挖掉沒被光阻保護的氧化層，圖案轉移到氧化層。',
  strip: '任務完成的光阻被清除，只留下有開口的氧化層。',
  metal: '鋪上金屬，填進開口和底下的矽接觸——一條導線完成。',
};

/** 依已完成步驟畫剖面；wrongAt 表示這一步順序錯了 */
function CrossSection({ done, wrong }: { done: StepId[]; wrong: StepId | null }) {
  const has = (s: StepId) => done.includes(s);
  const W = 480, x0 = 40, x1 = 440, open0 = 200, open1 = 280;
  const yOx = 150, yPr = 120;
  const ox = has('oxide');
  const pr = has('coat') && !has('strip');
  const prOpen = has('develop');
  const oxOpen = has('etch') && has('develop');
  const metal = has('metal');
  const last = done[done.length - 1];
  return (
    <svg viewBox={`0 0 ${W} 300`} className="xsec" role="img" aria-label={`晶圓剖面：已完成 ${done.length} 步`}>
      <rect x={x0} y={220} width={x1 - x0} height={55} fill={C.sub} stroke={C.line} strokeWidth="1.5" />
      <rect x={x0} y={180} width={x1 - x0} height={40} fill={C.si} stroke={C.line} strokeWidth="1.5" />
      <text x={x1 - 6} y={204} textAnchor="end" fontSize="12" fill={C.line}>矽晶圓</text>
      {ox && (oxOpen
        ? <><rect x={x0} y={yOx} width={open0 - x0} height={30} fill={C.ox} stroke={C.line} strokeWidth="1.5" /><rect x={open1} y={yOx} width={x1 - open1} height={30} fill={C.ox} stroke={C.line} strokeWidth="1.5" /></>
        : <rect x={x0} y={yOx} width={x1 - x0} height={30} fill={C.ox} stroke={C.line} strokeWidth="1.5" />)}
      {ox && <text x={x0 + 6} y={yOx + 20} fontSize="12" fill={C.line}>SiO₂</text>}
      {pr && (prOpen
        ? <><rect x={x0} y={yPr} width={open0 - x0} height={30} fill={C.pr} opacity=".85" stroke={C.line} strokeWidth="1.5" /><rect x={open1} y={yPr} width={x1 - open1} height={30} fill={C.pr} opacity=".85" stroke={C.line} strokeWidth="1.5" /></>
        : <><rect x={x0} y={yPr} width={x1 - x0} height={30} fill={C.pr} opacity=".85" stroke={C.line} strokeWidth="1.5" />
            {has('expose') && <rect x={open0} y={yPr} width={open1 - open0} height={30} fill={C.prx} stroke={C.uv} strokeWidth="2" strokeDasharray="4 3" />}</>)}
      {pr && <text x={x0 + 6} y={yPr + 20} fontSize="12" fill="#141414">光阻</text>}
      {last === 'expose' && (
        <g>
          <rect x={x0} y={40} width={open0 - x0} height={14} fill={C.mask} stroke={C.line} />
          <rect x={open1} y={40} width={x1 - open1} height={14} fill={C.mask} stroke={C.line} />
          <text x={x0} y={34} fontSize="12" fill={C.line}>光罩</text>
          {[0, 1, 2, 3].map((k) => <path key={k} d={`M${open0 + 12 + k * 18} 10 v100`} stroke={C.uv} strokeWidth="2.5" markerEnd="url(#arr)" />)}
        </g>
      )}
      {metal && (ox
        ? <path d={`M${x0} ${yOx - 22} H${x1} V${yOx} H${open1} V180 H${open0} V${yOx} H${x0} Z`} fill={C.metal} stroke={C.line} strokeWidth="1.5" />
        : <rect x={x0} y={158} width={x1 - x0} height={22} fill={C.metal} stroke={C.line} strokeWidth="1.5" />)}
      {metal && <text x={x1 - 6} y={(ox ? yOx : 180) - 6} textAnchor="end" fontSize="12" fill="#141414">金屬導線</text>}
      <defs><marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 L10 5 L0 10 z" fill={C.uv} /></marker></defs>
      {wrong && <g><rect x="40" y="8" width="400" height="24" rx="6" fill="#FC6255" /><text x="240" y="25" textAnchor="middle" fontSize="13" fill="#141414" fontWeight="700">順序不對！這一步現在做會出問題</text></g>}
    </svg>
  );
}

function shuffle<T>(a: T[], seed = 3) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) { seed = (seed * 9301 + 49297) % 233280; const j = Math.floor((seed / 233280) * (i + 1)); [b[i], b[j]] = [b[j], b[i]]; }
  return b;
}

export function Process() {
  const ids = PROCESS_STEPS.map((s) => s.id);
  const pool = useMemo(() => shuffle([...ids]), []); // eslint-disable-line react-hooks/exhaustive-deps
  const [order, setOrder] = useState<StepId[]>([]);
  const [wrong, setWrong] = useState<StepId | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const [play, setPlay] = useState(0);
  const [mode, setMode] = useState<'game' | 'watch'>('game');
  const award = useProgress((s) => s.award);
  const solved = order.length === ids.length && firstWrong(order) === -1;

  const pick = (id: StepId) => {
    const next = [...order, id];
    if (next[order.length] !== ids[order.length]) {
      setWrong(id); setMistakes((m) => m + 1); sfx('wrong');
      setTimeout(() => setWrong(null), 1400);
      return;
    }
    setOrder(next); sfx('snap');
    if (next.length === ids.length) { sfx('levelup'); award('process:order', 20, mistakes === 0 ? '製程順序一次全對' : '製程順序排對了'); }
  };
  const shown = mode === 'watch' ? ids.slice(0, play) as StepId[] : order;
  const cur = shown[shown.length - 1];

  return (
    <Section id="process" no="04" when="5F 擬真製程" title="擬真製程：用光把電路「印」到晶圓上"
      lead="一顆晶片要重複「沉積 → 微影 → 蝕刻」幾十次。先把一輪最基本的步驟排對，看剖面一步一步長出一條導線。">
      <div className="mission-grid">
        <div className="panel pad stack">
          <div className="tabs" role="tablist">
            <button className={mode === 'game' ? 'on' : ''} onClick={() => setMode('game')}>排序挑戰</button>
            <button className={mode === 'watch' ? 'on' : ''} onClick={() => setMode('watch')}>逐步觀看</button>
          </div>
          <CrossSection done={wrong ? [...order, wrong] : shown} wrong={wrong} />
          <div className="callout info" style={{ minHeight: 52 }}>
            {wrong ? `「${PROCESS_STEPS.find((s) => s.id === wrong)!.short}」不是下一步。想一想：現在晶圓上有什麼？還缺什麼？`
              : cur ? <><b>{PROCESS_STEPS.findIndex((s) => s.id === cur) + 1}. {PROCESS_STEPS.find((s) => s.id === cur)!.name}</b>　{NOTE[cur]}</>
              : mode === 'game' ? '從下面挑出第一步。' : '按「下一步」開始。'}
          </div>
          {mode === 'watch' && (
            <div className="row">
              <button className="btn sm" disabled={play === 0} onClick={() => setPlay(play - 1)}>上一步</button>
              <button className="btn sm primary" disabled={play === ids.length} onClick={() => { setPlay(play + 1); sfx('click'); }}>下一步</button>
              <span className="muted small">{play} / {ids.length}</span>
            </div>
          )}
        </div>
        <div className="panel pad stack">
          {mode === 'game' ? (
            <>
              <h4 style={{ margin: 0 }}>你的流程（{order.length}/{ids.length}）</h4>
              <div className="steps">
                {order.map((id, i) => <div key={id} className="step-chip placed"><span className="n">{i + 1}</span>{PROCESS_STEPS.find((s) => s.id === id)!.name}</div>)}
                {!solved && <div className="step-chip" style={{ borderStyle: 'dashed' }}><span className="n">{order.length + 1}</span><span className="dim">下一步是？</span></div>}
              </div>
              <h4 style={{ margin: '8px 0 0' }}>步驟卡</h4>
              <div className="pool">
                {pool.map((id) => {
                  const s = PROCESS_STEPS.find((x) => x.id === id)!;
                  const used = order.includes(id);
                  return <button key={id} className={`btn sm ${wrong === id ? 'on' : ''}`} disabled={used || solved} onClick={() => pick(id)}>{s.short}</button>;
                })}
              </div>
              <div className="row">
                <button className="btn sm ghost" onClick={() => { setOrder([]); setMistakes(0); }}>重來</button>
                <span className="muted small">放錯 {mistakes} 次</span>
              </div>
              {solved && <div className="callout ok">完成！這就是一輪「圖案轉移」。真正的晶片會疊幾十層，每一層都要對準前一層，誤差只有幾奈米。</div>}
            </>
          ) : (
            <div className="steps">
              {PROCESS_STEPS.map((s, i) => <button key={s.id} className={`step-chip ${i < play ? 'placed' : ''}`} onClick={() => setPlay(i + 1)}><span className="n">{i + 1}</span>{s.name}</button>)}
            </div>
          )}
        </div>
      </div>
      <h3 style={{ marginTop: 24 }}>走進虛擬晶圓廠：3D 工作站</h3>
      <p className="muted" style={{ marginTop: 0 }}>這些 3D 工作站和 5F 的擬真製程電腦媒介一樣，可以轉動機台、拆開看零件。內容是大學程度，看不懂的數字先跳過，感受一下機台長什麼樣子。</p>
      <div className="stack" style={{ gap: 16 }}>
        <LabFrame src={labUrl('m11-04')} title="M11-04 微影曝光工作站" desc="步進曝光機、光罩、光阻剖面" badge="黃光微影" />
        <LabFrame src={labUrl('m12-01')} title="M12-01 MOSFET 製程流程工作站" desc="一步一步做出一顆電晶體" badge="完整流程" />
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <Video unit="m12-01" kind="demo" />
        <LearnPanel id="process" />
      </div>
      <DoneBar id="process" ready={solved} xp={40} label="黃光區新人" hint="在「排序挑戰」把 8 個步驟排對，就能完成任務。" />
      <Extend units={['m11-01', 'm11-02', 'm11-03', 'm11-04', 'm11-05', 'm11-06', 'm12-01']} />
    </Section>
  );
}
