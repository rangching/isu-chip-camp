import { useEffect, useState } from 'react';
import { CAMP, PLACES, SCHEDULE, currentSlot, slotPlace, slotText, type PlaceId } from '../../data/camp';
import { useProgress } from '../progress/store';
import { Section } from '../../components/common';

export function Schedule() {
  const group = useProgress((s) => s.group) ?? 'A';
  const chosen = useProgress((s) => s.group);
  const setGroup = useProgress((s) => s.setGroup);
  const [now, setNow] = useState(() => new Date());
  useEffect(() => { const t = setInterval(() => setNow(new Date()), 30_000); return () => clearInterval(t); }, []);
  const cur = currentSlot(now);
  const used = new Set<PlaceId>(SCHEDULE.map((s) => slotPlace(s, group)));
  return (
    <Section id="schedule" no="01" when="09:00–16:30" title="今天的行程與地圖"
      lead={<>上午 A、B 兩組在 5F 與 6F 輪替，下午一起到 AI 電腦教室闖關。{chosen ? `目前顯示 ${group} 組的行程。` : '還沒選組別，先顯示 A 組。'}營隊當天會自動標出「現在」進行中的時段。</>}>
      <div className="row" style={{ marginBottom: 12 }}>
        <div className="tabs" role="tablist" aria-label="組別">
          {(['A', 'B'] as const).map((g) => <button key={g} role="tab" aria-selected={group === g} className={group === g ? 'on' : ''} onClick={() => setGroup(g)}>{g} 組行程</button>)}
        </div>
        <a className="btn sm ghost" href="#projector">投影模式</a>
      </div>
      <div className="timeline">
        {SCHEDULE.map((s, i) => {
          const p = PLACES[slotPlace(s, group)];
          const meal = s.title.startsWith('用餐') || s.title.startsWith('賦歸') || s.title.startsWith('學員到校');
          return (
            <div key={s.start} className={`slot ${i === cur ? 'now' : ''} ${cur >= 0 && i < cur ? 'past' : ''} ${meal ? 'meal' : ''}`}>
              <span className="t">{s.start}–{s.end}{i === cur && <><br /><b>● 現在</b></>}</span>
              <span className="what"><b>{slotText(s, group)}</b><span>{p.floor}・{p.name}　|　{s.who}</span></span>
              {s.mission ? <a className="btn sm go-btn go" href={`#${s.mission}`}>前往任務</a> : <span />}
            </div>
          );
        })}
      </div>
      <h3 style={{ marginTop: 24 }}>會去的地方</h3>
      <div className="place-grid">
        {(Object.keys(PLACES) as PlaceId[]).filter((k) => used.has(k)).map((k) => (
          <div className="place" key={k}><small>{PLACES[k].floor}</small><b>{PLACES[k].name}</b><span className="muted small">{PLACES[k].note}</span></div>
        ))}
      </div>
      <p className="dim small" style={{ marginTop: 12 }}>行程以 {CAMP.dateLabel} 營隊當天老師與工作人員的說明為準。</p>
    </Section>
  );
}
