import { useCallback } from 'react';
import { Calc, DoneBar, Extend, LabFrame, LearnPanel, Section, Video } from '../../components/common';
import { campLabUrl } from '../../data/media';
import { useProgress } from '../progress/store';

export function Probe() {
  const lab = useProgress((s) => s.labs.probe);
  const setLab = useProgress((s) => s.setLab);
  const award = useProgress((s) => s.award);
  const onMsg = useCallback((d: { lab: string; event: string; data: Record<string, number> }) => {
    if (d.lab !== 'probe_station') return;
    setLab('probe', { ...d.data, ...(d.event === 'complete' ? { complete: 1 } : {}) });
    if (d.event === 'complete') award('probe:lab', 20, '探針台量測完成');
  }, [setLab, award]);
  const ok = !!lab?.complete;
  return (
    <Section id="probe" no="05" when="5F 微動探針台" title="微動探針台：把針放到比頭髮還細的金屬墊上"
      lead="晶圓還沒切開前，要先測每一顆晶粒是好是壞（晶圓測試，CP）。用 X、Y、Z 旋鈕把鎢針慢慢降到金屬墊上，量 I-V 曲線，判斷良品與不良品，最後算出這片晶圓的良率。">
      <LabFrame src={campLabUrl('probe_station')} title="微動探針台下針量測（高中版 3D）" onMessage={onMsg}
        desc="選晶粒 → 對針 → 量測 → 判定。壓太大力會刮傷金屬墊喔！" badge="營隊專屬工作站" />
      <div className="row" style={{ marginTop: 10 }}>
        {lab ? <>
          <span className="chip electron">已測 {lab.tested ?? 0} 顆</span>
          <span className="chip output">判對 {lab.correct ?? 0} 顆</span>
          {lab.yield !== undefined && <span className="chip field">良率 {Math.round((lab.yield ?? 0) * 100)}%</span>}
          {(lab.scratches ?? 0) > 0 && <span className="chip error">刮傷 {lab.scratches} 次</span>}
        </> : <span className="muted small">開始量測後，成績會自動記到你的闖關護照。</span>}
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <div className="panel pad"><Calc id="dies" /></div>
        <div className="panel pad"><Calc id="defect" /></div>
      </div>
      <div className="grid-2" style={{ marginTop: 16 }}>
        <Video unit="m12-04" kind="demo" />
        <LearnPanel id="probe" />
      </div>
      <DoneBar id="probe" ready={ok} xp={40} label="神準下針手" hint="在 3D 探針台量測並正確判定 6 顆晶粒，就能完成任務。" />
      <Extend units={['m12-03', 'm12-04', 'm02-02']} />
    </Section>
  );
}
