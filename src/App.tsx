import { useEffect, useState } from 'react';
import { Hud } from './features/hero/Hud';
import { Hero } from './features/hero/Hero';
import { Schedule } from './features/schedule/Schedule';
import { Industry } from './features/industry/Industry';
import { Hunt } from './features/hunt/Hunt';
import { Process } from './features/process/Process';
import { Probe } from './features/probe/Probe';
import { Cleanroom } from './features/cleanroom/Cleanroom';
import { Logic } from './features/logic/Logic';
import { Lock } from './features/lock/Lock';
import { Sensors } from './features/sensors/Sensors';
import { Portfolio } from './features/portfolio/Portfolio';
import { Teacher, Projector } from './features/teacher/Teacher';
import { Toasts, LevelUp } from './features/progress/Overlays';
import { Player } from './features/music/Player';
import { useProgress } from './features/progress/store';
import { music } from './features/music/music';
import { setSfxEnabled } from './features/music/sfx';
import { CAMP } from './data/camp';
import { SERIES_CHANNEL_NOTE } from './data/media';
import { useCfg } from './lib/cfgStore';
import { configFromHash } from './lib/campConfig';

/** 套用老師連結後，捲到尋寶區並把網址裡的設定拿掉（設定已存進這台裝置） */
function cleanHash() {
  setTimeout(() => { history.replaceState(null, '', location.pathname + location.search + '#hunt'); document.getElementById('hunt')?.scrollIntoView(); }, 400);
}

const overlayOf = (h: string) => (h.startsWith('#teacher') ? 'teacher' : h.startsWith('#projector') ? 'projector' : null);

export default function App() {
  const [overlay, setOverlay] = useState(() => overlayOf(location.hash));
  const fromLink = useCfg((s) => s.fromLink);
  const cfg = useCfg((s) => s.cfg);

  useEffect(() => {
    const s = useProgress.getState().settings;
    setSfxEnabled(s.sfxOn);
    music.init({
      track: s.track,
      volume: s.volume,
      onChange: (patch) => useProgress.getState().setSettings(patch),
      get: () => ({ musicOn: useProgress.getState().settings.musicOn, nudged: useProgress.getState().settings.nudged }),
    });
    const onHash = () => {
      setOverlay(overlayOf(location.hash));
      const c = configFromHash(location.hash);
      if (c) { useCfg.getState().set(c); useCfg.setState({ fromLink: true }); cleanHash(); }
    };
    addEventListener('hashchange', onHash);
    if (configFromHash(location.hash)) cleanHash();
    return () => removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => { document.body.style.overflow = overlay ? 'hidden' : ''; }, [overlay]);

  return (
    <>
      <a className="sr-only" href="#schedule">跳到行程</a>
      <Hud />
      {fromLink && cfg.mode === 'live' && <div className="container" style={{ marginTop: 12 }}><div className="callout ok">已套用老師的現場設定{cfg.label ? `「${cfg.label}」` : ''}，製程尋寶的答案要到場域找！</div></div>}
      <main>
        <Hero />
        <Schedule />
        <Industry />
        <Hunt />
        <Process />
        <Probe />
        <Cleanroom />
        <Logic />
        <Lock />
        <Sensors />
        <Portfolio />
      </main>
      <footer className="site">
        <div className="container stack" style={{ gap: 6 }}>
          <div>{CAMP.title}：{CAMP.subtitle}　·　{CAMP.host}　·　{CAMP.series}</div>
          <div>{SERIES_CHANNEL_NOTE}　營隊專屬互動、文字與配樂皆為原創；闖關紀錄只存在這台裝置的瀏覽器。</div>
          <div><a href="#projector">投影模式</a>　·　<a href="#teacher">老師設定</a></div>
        </div>
      </footer>
      <Toasts />
      <LevelUp />
      <Player />
      {overlay === 'teacher' && <Teacher />}
      {overlay === 'projector' && <Projector />}
    </>
  );
}
