import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { CAMP, SCHEDULE, currentSlot, slotPlace, PLACES } from '../../data/camp';
import { STATIONS, encodeConfig, makeConfig } from '../../lib/campConfig';
import { fnv1a, normalize } from '../../lib/logic';
import { useCfg } from '../../lib/cfgStore';

/** 老師口令只做前端遮擋（不是安全機制）；原始碼只存雜湊 */
const PASS_HASH = 710432848; // 口令不寫在 repo
export const checkPass = (s: string) => fnv1a(`teacher|${normalize(s)}`) === PASS_HASH;

function close() { history.replaceState(null, '', location.pathname + location.search); dispatchEvent(new HashChangeEvent('hashchange')); }

export function Teacher() {
  const [ok, setOk] = useState(false);
  const [pass, setPass] = useState('');
  const [answers, setAnswers] = useState(['', '', '', '']);
  const [hints, setHints] = useState(['', '', '', '']);
  const [code, setCode] = useState<(0 | 1)[]>([1, 0, 1, 1]);
  const [label, setLabel] = useState('116 寒假營');
  const [link, setLink] = useState('');
  const [qr, setQr] = useState('');
  const apply = useCfg((s) => s.set);
  const practice = useCfg((s) => s.practice);
  const cfg = useCfg((s) => s.cfg);

  const gen = async () => {
    const c = makeConfig(answers, code, { mode: 'live', hints, label });
    const url = `${location.origin}${location.pathname}#hunt&cfg=${encodeConfig(c)}`;
    setLink(url);
    setQr(await QRCode.toDataURL(url, { margin: 1, width: 360, errorCorrectionLevel: 'M' }));
  };
  const valid = answers.every((a) => normalize(a).length > 0);

  return (
    <div className="projector" style={{ background: 'var(--bg)', color: 'var(--text)', display: 'block' }}>
      <div className="container stack" style={{ maxWidth: 900, gap: 16 }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <h2 style={{ margin: 0 }}>老師設定：製程尋寶與密碼鎖</h2>
          <button className="btn sm" onClick={close}>回到網站</button>
        </div>
        {!ok ? (
          <form className="panel pad stack" onSubmit={(e) => { e.preventDefault(); if (checkPass(pass)) setOk(true); else setPass(''); }}>
            <p className="muted" style={{ margin: 0 }}>這一頁給老師與工作人員使用。請輸入老師口令。</p>
            <input className="input" type="password" value={pass} onChange={(e) => setPass(e.target.value)} placeholder="老師口令" aria-label="老師口令" autoFocus />
            <button className="btn primary" type="submit">進入</button>
          </form>
        ) : (
          <>
            <div className="callout info">目前這台裝置：{cfg.mode === 'live' ? `現場模式${cfg.label ? `（${cfg.label}）` : ''}` : '練習模式'}。答案只會以雜湊存在連結裡，學員看不到原文；密碼位元要答對對應的站才解得開。</div>
            <div className="panel pad stack">
              <div className="field"><label htmlFor="t-label">名稱（顯示在學員首頁）</label><input id="t-label" className="input" value={label} onChange={(e) => setLabel(e.target.value)} /></div>
              {STATIONS.map((s, i) => (
                <div className="grid-2" key={s.id}>
                  <div className="field"><label htmlFor={`t-a${i}`}>第 {i + 1} 站「{s.name}」現場答案</label>
                    <input id={`t-a${i}`} className="input" value={answers[i]} onChange={(e) => setAnswers((a) => a.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`例如：${s.practiceMicro}`} /></div>
                  <div className="field"><label htmlFor={`t-h${i}`}>給學員的線索（選填）</label>
                    <input id={`t-h${i}`} className="input" value={hints[i]} onChange={(e) => setHints((a) => a.map((x, k) => (k === i ? e.target.value : x)))} placeholder={`例如：看${s.where}的海報右下角`} /></div>
                </div>
              ))}
              <p className="dim small" style={{ margin: 0 }}>題目文字固定為網站上的四題（例如第 1 站問「一層一層長上去的東西」）；現場微縮文字請配合題意。比對時不分大小寫、全半形與空白。</p>
              <div className="row">
                <b>當日 4 位元密碼</b>
                {code.map((b, i) => <button key={i} className={`btn ${b ? 'on' : ''}`} style={{ width: 48 }} onClick={() => setCode((c) => c.map((x, k) => (k === i ? (x ? 0 : 1) : x)) as (0 | 1)[])}>{b}</button>)}
                <span className="muted small">（要和 KTduino 程式裡的 CODE 一致）</span>
              </div>
              <div className="row">
                <button className="btn primary" disabled={!valid} onClick={gen}>產生學員連結與 QR code</button>
                {!valid && <span className="muted small">四站答案都要填。</span>}
              </div>
            </div>
            {link && (
              <div className="panel pad stack" style={{ justifyItems: 'start' }}>
                {qr && <img src={qr} alt="學員連結 QR code" width={240} height={240} style={{ background: '#fff', borderRadius: 8, padding: 6 }} />}
                <input className="input mono" readOnly value={link} onFocus={(e) => e.target.select()} aria-label="學員連結" />
                <div className="row">
                  <button className="btn sm" onClick={() => navigator.clipboard?.writeText(link)}>複製連結</button>
                  <button className="btn sm" onClick={() => { const c = makeConfig(answers, code, { mode: 'live', hints, label }); apply(c); }}>在這台裝置套用（測試用）</button>
                </div>
                <p className="dim small" style={{ margin: 0 }}>每按一次「產生」會換一組隨機鹽值，舊連結仍可使用，但兩組連結的尋寶進度分開記錄。請在營隊前產生一次並固定使用。</p>
              </div>
            )}
            <div className="row">
              <button className="btn sm ghost" onClick={() => { practice(); }}>這台裝置改回練習模式</button>
              <a className="btn sm ghost" href="#projector">打開投影模式</a>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function Projector() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 1000); return () => clearInterval(t); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => e.key === 'Escape' && close(); addEventListener('keydown', k); return () => removeEventListener('keydown', k); }, []);
  const cur = currentSlot(now);
  const s = cur >= 0 ? SCHEDULE[cur] : null;
  return (
    <div className="projector" role="dialog" aria-label="投影模式">
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <h1>{CAMP.title}：{CAMP.subtitle}</h1>
          <div style={{ color: '#AAAAAA', fontSize: '2.4vh' }}>{CAMP.series}・{CAMP.dateLabel}</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div className="clock">{now.toLocaleTimeString('zh-TW', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Taipei' })}</div>
          <button className="btn sm" onClick={close} style={{ marginTop: 8 }}>關閉（Esc）</button>
        </div>
      </div>
      <div>
        <div style={{ color: '#AAAAAA', fontSize: '2.4vh' }}>{s ? '現在' : '營隊行程'}</div>
        {s && <div className="now">{s.title}</div>}
        {s && <div style={{ fontSize: '3vh', marginBottom: '2vh' }}>
          {s.byGroup ? <>A 組：{s.byGroup.A}（{PLACES[slotPlace(s, 'A')].floor}）<br />B 組：{s.byGroup.B}（{PLACES[slotPlace(s, 'B')].floor}）</> : `${PLACES[slotPlace(s, 'A')].floor}・${PLACES[slotPlace(s, 'A')].name}`}
        </div>}
        {SCHEDULE.map((x, i) => <div key={x.start} className={`pslot ${i === cur ? 'on' : ''} ${cur >= 0 && i < cur ? 'past' : ''}`}><span className="mono">{x.start}–{x.end}</span><span>{x.title}</span></div>)}
      </div>
      <div style={{ color: '#7d807c', fontSize: '1.8vh' }}>學習網站：{location.origin}{location.pathname}</div>
    </div>
  );
}
