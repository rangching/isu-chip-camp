import { create } from 'zustand';
import { PRACTICE, configFromHash, decodeConfig, encodeConfig, type CampConfig } from './campConfig';

const KEY = 'chip-camp-cfg';
function load(): CampConfig {
  try {
    const fromHash = configFromHash(location.hash);
    if (fromHash) { localStorage.setItem(KEY, encodeConfig(fromHash)); return fromHash; }
    const saved = localStorage.getItem(KEY);
    const c = saved ? decodeConfig(saved) : null;
    if (c) return c;
  } catch { /* 私密模式 */ }
  return PRACTICE;
}

interface CfgState { cfg: CampConfig; fromLink: boolean; set: (c: CampConfig) => void; practice: () => void }
export const useCfg = create<CfgState>((set) => ({
  cfg: load(),
  fromLink: typeof location !== 'undefined' && !!configFromHash(location.hash),
  set: (c) => { try { localStorage.setItem(KEY, encodeConfig(c)); } catch { /* 忽略 */ } set({ cfg: c }); },
  practice: () => { try { localStorage.removeItem(KEY); } catch { /* 忽略 */ } set({ cfg: PRACTICE, fromLink: false }); },
}));
