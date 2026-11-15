import { useEffect, useRef, useState } from 'react';
import { CAMP } from '../../data/camp';
import { SERIES, mediaUrl } from '../../data/media';
import { useProgress } from '../progress/store';
import { BADGES } from '../progress/badges';
import { useCfg } from '../../lib/cfgStore';

function useNow(ms = 1000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), ms); return () => clearInterval(t); }, [ms]);
  return now;
}

function Countdown() {
  const now = useNow();
  const start = Date.parse(CAMP.startISO);
  const end = Date.parse(CAMP.endISO);
  const t = now.getTime();
  if (t >= end) return <div className="callout ok">營隊已圓滿結束，謝謝你的參與！可以在「學習歷程」回顧與輸出心得。</div>;
  if (t >= start) return <div className="callout">營隊進行中！看下面的時間軸，知道現在該去哪裡。</div>;
  const s = Math.floor((start - t) / 1000);
  const parts = [[Math.floor(s / 86400), '天'], [Math.floor((s % 86400) / 3600), '時'], [Math.floor((s % 3600) / 60), '分'], [s % 60, '秒']] as const;
  return (
    <div className="countdown" aria-label="距離營隊開始">
      {parts.map(([n, u]) => <div key={u}><b>{String(n).padStart(2, '0')}</b><small>{u}</small></div>)}
    </div>
  );
}

const REEL = Object.values(SERIES).filter((u) => u.vertical);

function Reel() {
  const [i, setI] = useState(0);
  const ref = useRef<HTMLVideoElement>(null);
  const u = REEL[i % REEL.length];
  useEffect(() => { ref.current?.play().catch(() => {}); }, [i]);
  return (
    <div className="reel">
      <video ref={ref} key={u.id} src={mediaUrl(`media/v-${u.id}.mp4`)} muted playsInline autoPlay onEnded={() => setI((x) => x + 1)} />
      <div className="reel-dots">{REEL.map((r, k) => <i key={r.id} className={k === i % REEL.length ? 'on' : ''} />)}</div>
      <div className="reel-cap"><b>{u.code}</b>　{u.hook}</div>
    </div>
  );
}

export function Hero() {
  const group = useProgress((s) => s.group);
  const setGroup = useProgress((s) => s.setGroup);
  const done = useProgress((s) => s.done);
  const cfg = useCfg((s) => s.cfg);
  const total = BADGES.filter((b) => b.mission).length;
  const n = BADGES.filter((b) => b.mission && done[b.mission]).length;
  return (
    <section className="hero" id="top">
      <div className="container hero-grid">
        <div className="stack" style={{ gap: 16 }}>
          <div>
            <span className="kicker">{CAMP.series}　·　{CAMP.dateLabel}</span>
            <h1><span className="yi">「義」</span>起解密晶片</h1>
            <p className="sub">{CAMP.subtitle}</p>
            <p className="lead">{CAMP.intro}</p>
            <div className="row" style={{ gap: 8 }}>
              <span className="chip electron">義守大學 電子工程學系</span>
              <span className="chip">半導體學士學位學程</span>
              <span className={`chip ${cfg.mode === 'live' ? 'field' : 'charge'}`}>{cfg.mode === 'live' ? `現場模式${cfg.label ? `：${cfg.label}` : ''}` : '練習模式'}</span>
            </div>
          </div>
          <Countdown />
          <div className="grid-3">
            {CAMP.themes.map((t) => (
              <div className="theme-card" key={t.no} style={{ borderTop: `3px solid var(--${t.color})` }}>
                <span className="no mono" style={{ color: `var(--${t.color})` }}>主題 {t.no}</span>
                <b>{t.title}</b>
                <span>{t.desc}</span>
              </div>
            ))}
          </div>
          <div className="panel pad" style={{ display: 'grid', gap: 10 }}>
            <div className="group-pick">
              <b>我是</b>
              {(['A', 'B'] as const).map((g) => <button key={g} className={`btn sm ${group === g ? 'on' : ''}`} onClick={() => setGroup(g)} aria-pressed={group === g}>{g} 組</button>)}
              <span className="muted small">{group ? `已記住：你是 ${group} 組，時間軸會顯示你的行程。` : '選了組別，時間軸會告訴你上午先去 5F 還是 6F。'}</span>
            </div>
            <div className="row" style={{ justifyContent: 'space-between' }}>
              <span className="muted small">闖關進度 {n} / {total}</span>
              <a className="btn sm primary" href={n ? '#portfolio' : '#schedule'}>{n ? '看我的闖關護照' : '開始闖關'}</a>
            </div>
            <div className="progress-bar"><i style={{ width: `${(n / total) * 100}%` }} /></div>
          </div>
        </div>
        <div className="stack" style={{ alignContent: 'start' }}>
          <Reel />
          <p className="dim small" style={{ textAlign: 'center', margin: 0 }}>短片來自「半導體物理及元件」系列</p>
        </div>
      </div>
    </section>
  );
}
