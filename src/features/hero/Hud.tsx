import { useEffect, useState } from 'react';
import { useProgress } from '../progress/store';
import { levelOf } from '../progress/levels';

export const NAV = [
  { id: 'schedule', label: '行程' },
  { id: 'industry', label: '產業鏈' },
  { id: 'hunt', label: '尋寶' },
  { id: 'process', label: '製程' },
  { id: 'probe', label: '探針台' },
  { id: 'cleanroom', label: '潔淨室' },
  { id: 'logic', label: '邏輯閘' },
  { id: 'lock', label: '密碼鎖' },
  { id: 'sensors', label: '感測器' },
  { id: 'portfolio', label: '學習歷程' },
];

export function Hud() {
  const xp = useProgress((s) => s.xp);
  const done = useProgress((s) => s.done);
  const theme = useProgress((s) => s.settings.theme);
  const setSettings = useProgress((s) => s.setSettings);
  const lv = levelOf(xp);
  const [active, setActive] = useState('');

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    try { localStorage.setItem('chip-camp-theme', theme); } catch { /* 忽略 */ }
  }, [theme]);

  useEffect(() => {
    const els = NAV.map((n) => document.getElementById(n.id)).filter(Boolean) as HTMLElement[];
    if (!els.length || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver((ents) => {
      const vis = ents.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
      if (vis[0]) setActive(vis[0].target.id);
    }, { rootMargin: '-40% 0px -55% 0px' });
    els.forEach((e) => io.observe(e));
    return () => io.disconnect();
  }, []);

  return (
    <header className="hud">
      <div className="container hud-inner">
        <a className="brand" href="#top">
          <span className="brand-mark" aria-hidden>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--electron)" strokeWidth="1.8"><rect x="6" y="6" width="12" height="12" rx="2" /><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4" /><circle cx="12" cy="12" r="2.4" fill="var(--field)" stroke="none" /></svg>
          </span>
          <span>義起解密晶片<small>ISU CHIP CAMP</small></span>
        </a>
        <nav className="hud-nav" aria-label="任務選單">
          {NAV.map((n) => (
            <a key={n.id} href={`#${n.id}`} className={active === n.id ? 'on' : ''}>{n.label}{done[n.id] && <span className="ok" aria-label="已完成">✓</span>}</a>
          ))}
        </nav>
        <div className="hud-stats">
          <button className="btn sm icon ghost" onClick={() => setSettings({ theme: theme === 'dark' ? 'light' : 'dark' })} aria-label={theme === 'dark' ? '切換成亮色' : '切換成暗色'} title="切換亮／暗色">
            {theme === 'dark' ? '☀' : '☾'}
          </button>
          <a className="lv" href="#portfolio" title={lv.nextName ? `再 ${lv.toNext} XP 升級為「${lv.nextName}」` : '最高等級'} style={{ color: 'inherit', textDecoration: 'none' }}>
            <span className="lv-badge">Lv.{lv.index + 1}</span>
            <div className="lv-meta">
              <span><b>{lv.name}</b><em className="mono" style={{ fontStyle: 'normal' }}>{xp} XP</em></span>
              <div className="progress-bar"><i style={{ width: `${lv.pct * 100}%` }} /></div>
            </div>
          </a>
        </div>
      </div>
    </header>
  );
}
