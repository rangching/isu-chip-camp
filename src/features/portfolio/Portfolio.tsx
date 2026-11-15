import { useRef, useState } from 'react';
import { CAMP } from '../../data/camp';
import { SERIES } from '../../data/media';
import { useProgress } from '../progress/store';
import { BADGES } from '../progress/badges';
import { levelOf } from '../progress/levels';
import { NAV } from '../hero/Hud';
import { DoneBar, Section } from '../../components/common';

const PROMPTS = [
  { k: 'wow', q: '今天最讓我驚訝的一件事是什麼？為什麼？' },
  { k: 'fab', q: '穿無塵衣、看切割或用探針台量測時，我觀察到什麼？如果我是工程師，會想改善哪裡？' },
  { k: 'logic', q: '密碼鎖用到哪些邏輯閘？我怎麼確定自己的密碼是對的？' },
  { k: 'sensor', q: '調小夜燈或拍手開關的門檻時，我遇到什麼問題？最後怎麼解決？' },
  { k: 'future', q: '這次體驗和我未來想讀的科系或想做的事有什麼關聯？' },
];

const PROGRAMS = [
  { name: '電子工程學系', items: ['半導體元件與製程', 'IC 設計與數位邏輯', '嵌入式系統與智慧感測', 'AI 與智慧電子應用'] },
  { name: '半導體學士學位學程', items: ['半導體物理與元件', '晶圓製程與潔淨室實作', '量測、封裝與可靠度', '對接南部半導體產業聚落'] },
];

export function Portfolio() {
  const p = useProgress();
  const lv = levelOf(p.xp);
  const [msg, setMsg] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const missions = NAV.filter((n) => n.id !== 'schedule' && n.id !== 'portfolio');
  const written = PROMPTS.filter((x) => (p.reflection.q[x.k] ?? '').trim().length >= 30).length;
  const ready = written >= 3;

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ app: 'isu-chip-camp', v: 1, state: { xp: p.xp, awarded: p.awarded, badges: p.badges, group: p.group, done: p.done, quizBest: p.quizBest, hunt: p.hunt, labs: p.labs, reflection: p.reflection } }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '義起解密晶片_闖關紀錄.json'; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  };
  const importJson = async (f: File) => {
    try {
      const j = JSON.parse(await f.text());
      if (j?.app !== 'isu-chip-camp' || !j.state) throw new Error('bad');
      useProgress.setState({ ...j.state });
      setMsg('已匯入闖關紀錄。');
    } catch { setMsg('這不是本網站匯出的紀錄檔。'); }
  };

  return (
    <Section id="portfolio" no="10" when="15:30–16:30" title="闖關護照與學習歷程"
      lead="回顧今天的闖關成果，寫下心得，存成 PDF 放進你的高中學習歷程檔案。紀錄只存在這台裝置的瀏覽器裡。">
      <div className="mission-grid no-print">
        <div className="panel pad stack">
          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>闖關護照</h3>
            <span className="chip field">Lv.{lv.index + 1} {lv.name}・{p.xp} XP</span>
          </div>
          <div className="badges">
            {BADGES.map((b) => (
              <div key={b.id} className={`badge ${p.badges[b.id] ? 'got' : ''}`} title={b.desc}>
                <span className="ic" aria-hidden>{b.icon}</span><b>{b.name}</b><small>{p.badges[b.id] ? `已獲得 ${p.badges[b.id]}` : b.desc}</small>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 6 }}>
            {missions.map((m) => <a key={m.id} href={`#${m.id}`} className={`chip ${p.done[m.id] ? 'output' : ''}`}>{p.done[m.id] ? '✓ ' : ''}{m.label}</a>)}
          </div>
        </div>
        <div className="panel pad stack">
          <h3 style={{ margin: 0 }}>認識我們</h3>
          {PROGRAMS.map((g) => <div key={g.name}><b>{g.name}</b><ul className="muted small" style={{ margin: '4px 0 0', paddingLeft: 20 }}>{g.items.map((x) => <li key={x}>{x}</li>)}</ul></div>)}
          <p className="dim small" style={{ margin: 0 }}>學系特色以學校官方招生資訊為準。</p>
          <div className="small">
            {CAMP.contact.map((c) => <div key={c.email}>{c.role}：{c.name}　分機 {c.ext}　<a href={`mailto:${c.email}`}>{c.email}</a></div>)}
            <div className="dim">總機 {CAMP.phone}</div>
          </div>
        </div>
      </div>

      <div className="panel pad stack report" style={{ marginTop: 16 }}>
        <div className="print-only">
          <h2 style={{ margin: 0 }}>{CAMP.title}：{CAMP.subtitle}　學習心得</h2>
          <p style={{ margin: '4px 0 12px' }}>{CAMP.series}・{CAMP.host}・{CAMP.dateLabel}</p>
        </div>
        <h3 className="no-print" style={{ margin: 0 }}>學習歷程心得</h3>
        <div className="grid-2">
          <div className="field"><label htmlFor="rf-name">姓名</label><input id="rf-name" className="input no-print" value={p.reflection.name} onChange={(e) => p.setReflection({ name: e.target.value })} /><span className="print-only">{p.reflection.name || '＿＿＿＿＿＿'}</span></div>
          <div className="field"><label htmlFor="rf-school">學校／年級</label><input id="rf-school" className="input no-print" value={p.reflection.school} onChange={(e) => p.setReflection({ school: e.target.value })} /><span className="print-only">{p.reflection.school || '＿＿＿＿＿＿'}</span></div>
        </div>
        {PROMPTS.map((x, i) => (
          <div className="field" key={x.k}>
            <label htmlFor={`rf-${x.k}`}><b>{i + 1}. {x.q}</b></label>
            <textarea id={`rf-${x.k}`} className="input no-print" value={p.reflection.q[x.k] ?? ''} onChange={(e) => p.setAnswer(x.k, e.target.value)} placeholder="寫具體一點：看到什麼、做了什麼、想到什麼。" />
            <div className="ans print-only">{p.reflection.q[x.k] ?? ''}</div>
            <span className="dim small no-print">{(p.reflection.q[x.k] ?? '').length} 字</span>
          </div>
        ))}
        <div className="print-only">
          <h3>闖關紀錄</h3>
          <p>完成任務：{missions.filter((m) => p.done[m.id]).map((m) => m.label).join('、') || '（無）'}</p>
          <p>獲得徽章：{BADGES.filter((b) => p.badges[b.id]).map((b) => b.name).join('、') || '（無）'}　等級：{lv.name}（{p.xp} XP）</p>
          {p.labs.probe?.yield !== undefined && <p>探針台量測：測 {p.labs.probe.tested} 顆，良率 {Math.round(p.labs.probe.yield * 100)}%</p>}
          {p.labs.dicing?.yield !== undefined && <p>晶圓切割：良率 {Math.round(p.labs.dicing.yield)}%</p>}
          <p>延伸學習：{['m11-04', 'm11-05', 'm12-04', 'm09-06'].map((u) => `${SERIES[u].code} ${SERIES[u].title}`).join('；')}</p>
          <p style={{ fontSize: '10pt', color: '#555' }}>本頁由「義起解密晶片」學習網站產生，供學習歷程使用，非正式研習證明；研習證明以營隊現場核發者為準。</p>
        </div>
        <div className="row no-print">
          <button className="btn primary" disabled={!ready} onClick={() => { p.complete('portfolio', 40, '學習歷程作者'); setTimeout(() => print(), 50); }}>列印／存成 PDF</button>
          <span className="muted small">{ready ? '在列印視窗選「另存為 PDF」。' : `至少寫 3 題、每題 30 字以上（目前 ${written} 題）。`}</span>
        </div>
        <p className="dim small no-print" style={{ margin: 0 }}>輸出的心得是學習歷程用的紀錄，<b>不是正式研習證明</b>；研習證明以營隊現場核發的紙本為準。</p>
      </div>

      <div className="row no-print" style={{ marginTop: 16 }}>
        <button className="btn sm ghost" onClick={exportJson}>匯出闖關紀錄</button>
        <button className="btn sm ghost" onClick={() => fileRef.current?.click()}>匯入闖關紀錄</button>
        <input ref={fileRef} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && importJson(e.target.files[0])} />
        <button className="btn sm ghost" onClick={() => { if (confirm('確定要清除這台裝置上的所有闖關紀錄嗎？')) p.resetAll(); }}>清除紀錄</button>
        {msg && <span className="small muted">{msg}</span>}
      </div>
      <div className="no-print"><DoneBar id="portfolio" ready={ready} xp={40} label="學習歷程作者" hint="寫好至少 3 題心得並按「列印／存成 PDF」，就能完成任務。" /></div>
    </Section>
  );
}
