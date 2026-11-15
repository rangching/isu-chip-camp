import { useEffect, useRef, useState } from 'react';
import nightSrc from '../../../arduino/night_light.ino?raw';
import clapSrc from '../../../arduino/clap_switch.ino?raw';
import { ClapDetector, cds, nightLight, rms } from '../../lib/logic';
import { CodeBlock, DoneBar, Extend, LearnPanel, Section } from '../../components/common';
import { useProgress } from '../progress/store';
import { sfx } from '../music/sfx';

const HIST = 160;

function drawTrace(c: HTMLCanvasElement | null, data: number[], lines: { v: number; color: string }[], max: number, states?: boolean[]) {
  if (!c) return;
  const w = (c.width = c.clientWidth * devicePixelRatio), h = (c.height = c.clientHeight * devicePixelRatio);
  const g = c.getContext('2d')!;
  g.clearRect(0, 0, w, h);
  const cs = getComputedStyle(document.documentElement);
  if (states) states.forEach((s, i) => { if (s) { g.fillStyle = 'rgba(249,217,118,.13)'; g.fillRect((i / HIST) * w, 0, w / HIST + 1, h); } });
  lines.forEach((l) => { g.strokeStyle = l.color; g.setLineDash([6, 4]); g.lineWidth = 1.5 * devicePixelRatio; const y = h - (l.v / max) * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); });
  g.setLineDash([]); g.strokeStyle = cs.getPropertyValue('--electron').trim() || '#58C4DD'; g.lineWidth = 2 * devicePixelRatio; g.beginPath();
  data.forEach((v, i) => { const x = (i / (HIST - 1)) * w, y = h - (Math.min(max, v) / max) * h; i ? g.lineTo(x, y) : g.moveTo(x, y); });
  g.stroke();
}

// ---------- 光控小夜燈 ----------
function NightLight({ onTuned }: { onTuned: (p: { on: number; off: number }) => void }) {
  const [e, setE] = useState(2.3);
  const [noise, setNoise] = useState(true);
  const [onBelow, setOnBelow] = useState(380);
  const [offAbove, setOffAbove] = useState(400);
  const [useCam, setUseCam] = useState(false);
  const [camErr, setCamErr] = useState('');
  const [lamp, setLamp] = useState(false);
  const [adc, setAdc] = useState(0);
  const [flips, setFlips] = useState<number[]>([]);
  const [seen, setSeen] = useState({ on: false, off: false });
  const hist = useRef<number[]>(Array(HIST).fill(0));
  const states = useRef<boolean[]>(Array(HIST).fill(false));
  const cv = useRef<HTMLCanvasElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const S = useRef({ e, noise, onBelow, offAbove, useCam, lamp: false });
  S.current = { ...S.current, e, noise, onBelow, offAbove, useCam };

  useEffect(() => {
    const off = document.createElement('canvas'); off.width = 32; off.height = 24;
    const og = off.getContext('2d', { willReadFrequently: true })!;
    const t = setInterval(() => {
      const s = S.current;
      let v: number;
      if (s.useCam && video.current && video.current.readyState >= 2) {
        og.drawImage(video.current, 0, 0, 32, 24);
        const d = og.getImageData(0, 0, 32, 24).data; let sum = 0;
        for (let i = 0; i < d.length; i += 4) sum += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
        v = Math.round((sum / (d.length / 4) / 255) * 1023);
      } else {
        v = cds(Math.pow(10, s.e)).adc + (s.noise ? Math.round((Math.random() - 0.5) * 60) : 0);
      }
      v = Math.max(0, Math.min(1023, v));
      const next = nightLight(v, s.lamp, s.onBelow, s.offAbove);
      if (next !== s.lamp) { setFlips((f) => [...f.filter((x) => Date.now() - x < 10_000), Date.now()]); setSeen((o) => ({ on: o.on || next, off: o.off || !next })); }
      s.lamp = next; setLamp(next); setAdc(v);
      hist.current = [...hist.current.slice(1), v]; states.current = [...states.current.slice(1), next];
      drawTrace(cv.current, hist.current, [{ v: s.onBelow, color: '#F9D976' }, { v: s.offAbove, color: '#F2A65A' }], 1023, states.current);
    }, 100);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => stream.current?.getTracks().forEach((t) => t.stop()), []);

  const toggleCam = async () => {
    if (useCam) { stream.current?.getTracks().forEach((t) => t.stop()); stream.current = null; setUseCam(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ video: { width: 160, height: 120 }, audio: false });
      stream.current = s; if (video.current) { video.current.srcObject = s; await video.current.play(); }
      setUseCam(true); setCamErr('');
    } catch { setCamErr('無法使用相機（沒有相機或沒有授權），請改用亮度滑桿。'); }
  };
  const recent = flips.filter((x) => Date.now() - x < 10_000).length;
  const gap = offAbove - onBelow;
  const tuned = seen.on && seen.off && gap >= 40 && recent <= 2 && noise;
  useEffect(() => { if (tuned) onTuned({ on: onBelow, off: offAbove }); }, [tuned]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>智慧光控節能小夜燈</h4>
      <div className="grid-2" style={{ alignItems: 'center' }}>
        <div className={`bigbulb ${lamp ? 'on' : ''}`} aria-live="polite">{lamp ? '燈：開' : '燈：關'}</div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 22 }}>A0 = {adc}</span>
          <span className={`chip ${recent > 2 ? 'error' : 'output'}`}>最近 10 秒切換 {recent} 次{recent > 2 ? '：閃個不停！' : ''}</span>
        </div>
      </div>
      <canvas ref={cv} className="wave" aria-label="光感測讀值走勢圖：藍線為讀值，黃虛線為開燈門檻，橘虛線為關燈門檻，黃色底代表燈開著" />
      <div className="field">
        <label htmlFor="nl-e">{useCam ? '目前用相機估亮度（遮住鏡頭試試看）' : <>環境亮度（拖拉模擬天黑天亮）</>}</label>
        <input id="nl-e" type="range" min={-0.5} max={4} step={0.02} value={e} disabled={useCam} onChange={(ev) => setE(+ev.target.value)} />
      </div>
      <div className="grid-2">
        <div className="field"><label htmlFor="nl-on">開燈門檻 ON_BELOW：<b className="mono" style={{ color: 'var(--field)' }}>{onBelow}</b></label>
          <input id="nl-on" type="range" min={50} max={900} step={5} value={onBelow} onChange={(ev) => { const v = +ev.target.value; setOnBelow(v); if (v > offAbove) setOffAbove(v); }} /></div>
        <div className="field"><label htmlFor="nl-off">關燈門檻 OFF_ABOVE：<b className="mono" style={{ color: 'var(--hole)' }}>{offAbove}</b></label>
          <input id="nl-off" type="range" min={50} max={950} step={5} value={offAbove} onChange={(ev) => { const v = +ev.target.value; setOffAbove(v); if (v < onBelow) setOnBelow(v); }} /></div>
      </div>
      <div className="row">
        <label className="row small" style={{ gap: 6 }}><input type="checkbox" checked={noise} onChange={(ev) => setNoise(ev.target.checked)} />加入真實雜訊</label>
        <button className="btn sm ghost" onClick={toggleCam}>{useCam ? '改回滑桿' : '用相機當光感測器'}</button>
        <video ref={video} muted playsInline style={{ width: 64, height: 48, borderRadius: 6, display: useCam ? 'block' : 'none', objectFit: 'cover' }} />
      </div>
      {camErr && <span className="small" style={{ color: 'var(--error)' }}>{camErr}</span>}
      <div className={`callout ${tuned ? 'ok' : 'info'}`}>
        {tuned ? `調校成功！開燈 ${onBelow}、關燈 ${offAbove}，中間留了 ${gap} 的緩衝，有雜訊也不會亂閃。`
          : '挑戰：開著「真實雜訊」，讓燈在天黑時開、天亮時關，而且不會在門檻附近一直閃（10 秒內切換不超過 2 次）。提示：兩個門檻不要靠太近。'}
      </div>
      <CodeBlock file="night_light.ino（已代入你的門檻）" code={nightSrc.replace(/int ON_BELOW\s*=\s*\d+/, `int ON_BELOW  = ${onBelow}`).replace(/int OFF_ABOVE\s*=\s*\d+/, `int OFF_ABOVE = ${offAbove}`)} />
    </div>
  );
}

// ---------- 拍手聲控開關 ----------
function Clap({ onTuned }: { onTuned: () => void }) {
  const [th, setTh] = useState(0.25);
  const [cool, setCool] = useState(400);
  const [mic, setMic] = useState(false);
  const [err, setErr] = useState('');
  const [lamp, setLamp] = useState(false);
  const [count, setCount] = useState(0);
  const [level, setLevel] = useState(0);
  const det = useRef(new ClapDetector(th, cool));
  det.current.threshold = th; det.current.refractoryMs = cool;
  const hist = useRef<number[]>(Array(HIST).fill(0));
  const cv = useRef<HTMLCanvasElement>(null);
  const ctx = useRef<{ ac: AudioContext; an: AnalyserNode; s: MediaStream } | null>(null);
  const fake = useRef(0);

  useEffect(() => {
    const buf = new Float32Array(1024);
    const t = setInterval(() => {
      let lv = 0;
      if (ctx.current) { ctx.current.an.getFloatTimeDomainData(buf); lv = Math.min(1, rms(buf) * 4); }
      if (fake.current > 0) { lv = Math.max(lv, 0.15 + fake.current * 0.18); fake.current = Math.max(0, fake.current - 1); }
      if (!ctx.current && !fake.current) lv = Math.random() * 0.04;
      if (det.current.feed(lv, performance.now())) { setLamp(det.current.on); setCount((c) => c + 1); sfx('click'); }
      setLevel(lv);
      hist.current = [...hist.current.slice(1), lv];
      drawTrace(cv.current, hist.current, [{ v: det.current.threshold, color: '#F9D976' }], 1);
    }, 30);
    return () => clearInterval(t);
  }, []);
  useEffect(() => () => { ctx.current?.s.getTracks().forEach((t) => t.stop()); void ctx.current?.ac.close(); }, []);

  const toggleMic = async () => {
    if (ctx.current) { ctx.current.s.getTracks().forEach((t) => t.stop()); void ctx.current.ac.close(); ctx.current = null; setMic(false); return; }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ac = new AudioContext(); const an = ac.createAnalyser(); an.fftSize = 2048;
      ac.createMediaStreamSource(s).connect(an);
      ctx.current = { ac, an, s }; setMic(true); setErr('');
    } catch { setErr('無法使用麥克風（沒有麥克風或沒有授權），可以按「模擬拍手」。'); }
  };
  useEffect(() => { if (count >= 4) onTuned(); }, [count]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <div className="stack">
      <h4 style={{ margin: 0 }}>拍手聲控智慧開關</h4>
      <div className="grid-2" style={{ alignItems: 'center' }}>
        <div className={`bigbulb ${lamp ? 'on' : ''}`} aria-live="polite">{lamp ? '燈：開' : '燈：關'}</div>
        <div className="stack" style={{ gap: 6 }}>
          <span className="mono" style={{ fontSize: 22 }}>音量 {(level * 100).toFixed(0)}</span>
          <span className="chip electron">偵測到拍手 {count} 次</span>
        </div>
      </div>
      <canvas ref={cv} className="wave" aria-label="聲音音量走勢圖：藍線為音量，黃虛線為拍手門檻" />
      <div className="row">
        <button className={`btn sm ${mic ? 'on' : 'primary'}`} onClick={toggleMic}>{mic ? '關閉麥克風' : '開啟電腦麥克風'}</button>
        <button className="btn sm" onClick={() => { fake.current = 5; }}>模擬拍手 👏</button>
      </div>
      {err && <span className="small" style={{ color: 'var(--error)' }}>{err}</span>}
      <div className="grid-2">
        <div className="field"><label htmlFor="cl-th">拍手門檻：<b className="mono" style={{ color: 'var(--field)' }}>{(th * 100).toFixed(0)}</b></label>
          <input id="cl-th" type="range" min={0.03} max={0.9} step={0.01} value={th} onChange={(e) => setTh(+e.target.value)} /></div>
        <div className="field"><label htmlFor="cl-cd">冷卻時間：<b className="mono">{cool} ms</b></label>
          <input id="cl-cd" type="range" min={0} max={1500} step={50} value={cool} onChange={(e) => setCool(+e.target.value)} /></div>
      </div>
      <div className={`callout ${count >= 4 ? 'ok' : 'info'}`}>
        {count >= 4 ? '成功！你的拍手開關可以穩定切換了。試試看把冷卻時間調成 0，拍一下會不會被算成好幾次？'
          : '挑戰：調門檻讓「講話」不會觸發、「拍手」才會觸發，成功切換燈 4 次。門檻太低會被雜音誤觸，太高拍不亮。'}
      </div>
      <CodeBlock file="clap_switch.ino（已代入你的冷卻時間）" code={clapSrc.replace(/int COOLDOWN_MS = \d+/, `int COOLDOWN_MS = ${cool}`)} />
      <p className="dim small" style={{ margin: 0 }}>網頁的音量（0～100）和 Arduino 的峰對峰值單位不同，實作時門檻要在板子上用 Serial 監看重新調。麥克風聲音只在你的電腦上分析，不會錄音或上傳。</p>
    </div>
  );
}

export function Sensors() {
  const [nl, setNl] = useState(false);
  const [cl, setCl] = useState(false);
  const award = useProgress((s) => s.award);
  const setLab = useProgress((s) => s.setLab);
  return (
    <Section id="sensors" no="09" when="14:30 關卡二" title="智慧感測器控制：光控小夜燈與拍手開關"
      lead="感測器把真實世界變成數字，程式用「門檻」做決定。實作前先在這裡調參數，搞懂為什麼需要遲滯和冷卻時間，等一下在 KTduino 上就會快很多。">
      <div className="grid-2 stack-md">
        <div className="panel pad"><NightLight onTuned={(p) => { setNl(true); setLab('night', p); award('sensor:night', 20, '小夜燈調校成功'); }} /></div>
        <div className="panel pad"><Clap onTuned={() => { setCl(true); award('sensor:clap', 20, '拍手開關調校成功'); }} /></div>
      </div>
      <div style={{ marginTop: 16 }}><LearnPanel id="sensors" /></div>
      <DoneBar id="sensors" ready={nl && cl} xp={40} label="智慧感測創客" hint={`小夜燈調校（${nl ? '✓' : '…'}）與拍手開關（${cl ? '✓' : '…'}）都成功，就能完成任務。`} />
      <Extend units={['m05-01']} title="延伸探索：光為什麼能讓材料導電？" />
    </Section>
  );
}
