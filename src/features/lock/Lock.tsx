import { useEffect, useState } from 'react';
import lockSrc from '../../../arduino/lock4bit.ino?raw';
import { lockLogic, bitsToDec } from '../../lib/logic';
import { PRACTICE_CODE, configId } from '../../lib/campConfig';
import { useCfg } from '../../lib/cfgStore';
import { useProgress } from '../progress/store';
import { CodeBlock, DoneBar, LearnPanel, Section } from '../../components/common';
import { sfx } from '../music/sfx';

/** 比對電路圖：4 個 XNOR → 1 個 AND */
function Circuit({ sw, match, unlock }: { sw: (0 | 1)[]; match: (0 | 1)[]; unlock: boolean }) {
  const c = (v: number) => (v ? 'var(--field)' : 'var(--text-3)');
  return (
    <svg viewBox="0 0 380 200" className="gate-svg" role="img" aria-label={`比對電路：${match.filter(Boolean).length} 位相符，${unlock ? '解鎖' : '未解鎖'}`}>
      {sw.map((s, i) => {
        const y = 28 + i * 44;
        return (
          <g key={i}>
            <text x="6" y={y + 4} fontSize="12" fill="var(--text-2)">SW{i + 1}={s}</text>
            <path d={`M60 ${y} H110`} stroke={c(s)} strokeWidth="3" />
            <path d={`M60 ${y + 12} H110`} stroke="var(--charge)" strokeWidth="2" strokeDasharray="3 3" />
            <rect x="110" y={y - 10} width="58" height="32" rx="8" fill="var(--panel)" stroke="var(--text)" strokeWidth="2" />
            <text x="139" y={y + 10} fontSize="11" textAnchor="middle" fill="var(--text)">XNOR</text>
            <path d={`M168 ${y + 6} H220 L250 ${100}`} fill="none" stroke={c(match[i])} strokeWidth="3" />
          </g>
        );
      })}
      <text x="62" y="196" fontSize="10" fill="var(--charge)">--- 密碼位元</text>
      <path d="M250 70 H280 A30 30 0 0 1 280 130 H250 Z" fill="var(--panel)" stroke="var(--text)" strokeWidth="2" />
      <text x="272" y="104" fontSize="12" textAnchor="middle" fill="var(--text)">AND</text>
      <path d="M310 100 H332" stroke={c(unlock ? 1 : 0)} strokeWidth="4" />
      <text x="356" y="106" fontSize="13" fontWeight="700" textAnchor="middle" fill={unlock ? 'var(--output)' : 'var(--text-3)'}>{unlock ? '開鎖' : '鎖住'}</text>
    </svg>
  );
}

export function Lock() {
  const cfg = useCfg((s) => s.cfg);
  const bits = useProgress((s) => s.hunt[configId(cfg)]) ?? [null, null, null, null];
  const award = useProgress((s) => s.award);
  const have = bits.every((b) => b !== null);
  const [peek, setPeek] = useState(false);
  const code: (0 | 1)[] | null = have ? (bits as (0 | 1)[]) : cfg.mode === 'practice' && peek ? PRACTICE_CODE : null;
  const [sw, setSw] = useState<(0 | 1)[]>([0, 0, 0, 0]);
  const [tries, setTries] = useState(0);
  const [opened, setOpened] = useState(false);
  const [chase, setChase] = useState(-1);
  const res = code ? lockLogic(sw, code) : { match: [0, 0, 0, 0] as (0 | 1)[], unlock: false };

  useEffect(() => {
    if (!res.unlock || opened) return;
    setOpened(true); sfx('levelup'); award('lock:open', 20, '密碼鎖解開了');
  }, [res.unlock]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!res.unlock) { setChase(-1); return; }
    let k = 0; const t = setInterval(() => setChase((k++) % 20), 70);
    return () => clearInterval(t);
  }, [res.unlock]);

  const flip = (i: number) => { setSw((a) => a.map((x, k) => (k === i ? (x ? 0 : 1) : x)) as (0 | 1)[]); setTries((t) => t + 1); sfx('click'); };
  const leds = Array.from({ length: 10 }, (_, i) => (res.unlock ? (chase < 10 ? i <= chase : i > chase - 10) : i < 4 && !!res.match[i] && !!code));
  const shownCode = code ? lockSrc.replace(/int CODE\[4\] = \{[^}]*\}/, `int CODE[4] = {${code.join(', ')}}`) : lockSrc;

  return (
    <Section id="lock" no="08" when="14:00 關卡一" title="IC 邏輯解密遊戲：4 位元二進位密碼鎖"
      lead="把上午四站拿到的 4 個位元，用指撥開關輸入。每一位都用 XNOR 閘比對（相同才是 1），四個結果再用 AND 閘合起來——全部對了，LED Bar 就會跑馬燈解鎖！">
      {!code && (
        <div className="callout" style={{ marginBottom: 16 }}>
          你的密碼還差 {bits.filter((b) => b === null).length} 位：先回到 <a href="#hunt">03 製程尋寶</a> 解開剩下的站。
          {cfg.mode === 'practice' && <> 只想先玩玩看？<button className="btn sm ghost" style={{ marginLeft: 6 }} onClick={() => setPeek(true)}>偷看練習密碼</button></>}
        </div>
      )}
      <div className="mission-grid">
        <div className="board stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="silk">KTduino ‧ VIRTUAL ‧ P5 DIP SWITCH</span>
            <span className="silk">嘗試 {tries} 次</span>
          </div>
          <div>
            <div className="dip" role="group" aria-label="指撥開關">
              {sw.map((s, i) => <button key={i} className={s ? 'on' : ''} onClick={() => flip(i)} aria-pressed={!!s} aria-label={`SW${i + 1} ${s ? 'ON' : 'OFF'}`}>{i + 1}</button>)}
            </div>
            <div className="dip-labels">{sw.map((s, i) => <span key={i}>{s ? 'ON=1' : 'OFF=0'}</span>)}</div>
          </div>
          <span className="silk">P9 LED BAR</span>
          <div className={`ledbar ${res.unlock ? 'green' : ''}`} aria-label={res.unlock ? '解鎖成功' : `${res.match.filter(Boolean).length} 位相符`}>{leds.map((on, i) => <i key={i} className={on ? 'on' : ''} />)}</div>
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <span className="mono">輸入 {sw.join('')}₂ = {bitsToDec(sw)}</span>
            <b style={{ color: res.unlock ? '#4ef0b0' : '#ECEEDF' }}>{!code ? '尚無密碼' : res.unlock ? 'UNLOCK!' : `${res.match.filter(Boolean).length} / 4 位相符`}</b>
          </div>
          <span className="silk" style={{ letterSpacing: 0 }}>前 4 顆 LED 亮＝那一位比對正確（真正的鎖不會告訴你，這裡是教學用提示）。</span>
        </div>
        <div className="panel pad stack">
          <h4 style={{ margin: 0 }}>晶片裡的比對電路</h4>
          <Circuit sw={sw} match={res.match} unlock={res.unlock} />
          <p className="muted small" style={{ margin: 0 }}>這就是一個小小的「IC 設計」：只用邏輯閘，不用任何程式，就能判斷密碼對不對。真實晶片把幾十億個這樣的閘做在一起。</p>
        </div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel pad">
          <CodeBlock code={shownCode} file="lock4bit.ino（KTduino 實作用）" />
          <p className="dim small">腳位為預留值，實際接線以老師現場說明為準。{code ? '程式裡的 CODE 已自動換成你的密碼。' : ''}</p>
        </div>
        <LearnPanel id="lock" />
      </div>
      <DoneBar id="lock" ready={opened} xp={40} label="解鎖大師" hint="用指撥開關輸入正確的 4 位元密碼、讓 LED Bar 跑馬燈，就能完成任務。" />
    </Section>
  );
}
