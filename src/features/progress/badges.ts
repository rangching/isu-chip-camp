export interface Badge { id: string; name: string; desc: string; xp: number; mission?: string; icon: string }

/** 每個任務一枚徽章；mission 對應網頁區塊 id */
export const BADGES: Badge[] = [
  { id: 'chain', name: '產業鏈導航員', desc: '看懂晶片從設計、製造、封測到應用的一條龍', xp: 30, mission: 'industry', icon: '⛓' },
  { id: 'hunter', name: '微縮密碼獵人', desc: '解開製程尋寶四站，拿到 4 位元密碼', xp: 60, mission: 'hunt', icon: '🔍' },
  { id: 'fab', name: '黃光區新人', desc: '把製程步驟排對，做出第一個圖案', xp: 50, mission: 'process', icon: '◫' },
  { id: 'probe', name: '神準下針手', desc: '在探針台量完並正確判定 6 顆晶粒', xp: 60, mission: 'probe', icon: '⟂' },
  { id: 'clean', name: '潔淨室通行證', desc: '著裝順序全對並完成晶圓切割', xp: 60, mission: 'cleanroom', icon: '✦' },
  { id: 'logic', name: '邏輯閘達人', desc: '看懂 AND、OR、NOT 與二進位', xp: 40, mission: 'logic', icon: '⊕' },
  { id: 'lock', name: '解鎖大師', desc: '用 4 位元二進位密碼打開 IC 密碼鎖', xp: 60, mission: 'lock', icon: '🔓' },
  { id: 'sensor', name: '智慧感測創客', desc: '調好光控小夜燈與拍手開關', xp: 60, mission: 'sensors', icon: '◉' },
  { id: 'story', name: '學習歷程作者', desc: '寫完並輸出心得報告', xp: 40, mission: 'portfolio', icon: '✎' },
  { id: 'master', name: '解密晶片全制霸', desc: '完成全部九個任務', xp: 100, icon: '★' },
];
