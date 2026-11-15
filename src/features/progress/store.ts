// 闖關護照：XP、徽章、任務完成、尋寶進度、心得草稿。全部只存在這台裝置的瀏覽器（localStorage）。
// 改寫自「機器人實驗室」的 progress store。
import { create } from 'zustand';
import { persist, createJSONStorage, type StateStorage } from 'zustand/middleware';
import { levelOf } from './levels';
import { BADGES } from './badges';
import { sfx } from '../music/sfx';
import type { Group } from '../../data/camp';

const safeStorage: StateStorage = {
  getItem: (k) => { try { return localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { localStorage.setItem(k, v); } catch { /* 私密模式 */ } },
  removeItem: (k) => { try { localStorage.removeItem(k); } catch { /* 忽略 */ } },
};

export interface Settings { track: string; volume: number; musicOn: boolean; sfxOn: boolean; nudged: boolean; theme: 'dark' | 'light' }

export interface Reflection { name: string; school: string; q: Record<string, string> }

export interface ProgressState {
  xp: number;
  awarded: Record<string, number>;
  badges: Record<string, string>;
  group: Group | null;
  /** 已完成的任務 id → 完成日期 */
  done: Record<string, string>;
  quizBest: Record<string, number>;
  /** 尋寶：設定 id → 四站已解開的位元（null＝未解） */
  hunt: Record<string, (0 | 1 | null)[]>;
  /** 實驗結果（探針台、切割…） */
  labs: Record<string, Record<string, number>>;
  reflection: Reflection;
  settings: Settings;
  award: (key: string, xp: number, label: string) => void;
  grantBadge: (id: string) => void;
  complete: (mission: string, xp: number, label: string) => void;
  setGroup: (g: Group) => void;
  setQuizBest: (id: string, n: number) => void;
  setHuntBit: (cfgId: string, i: number, bit: 0 | 1) => void;
  setLab: (id: string, data: Record<string, number>) => void;
  setReflection: (p: Partial<Reflection>) => void;
  setAnswer: (key: string, text: string) => void;
  setSettings: (s: Partial<Settings>) => void;
  resetAll: () => void;
}

export const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export interface Toast { id: number; text: string; xp?: number; kind: 'xp' | 'badge' | 'info' }
interface UiState {
  toasts: Toast[];
  levelUp: { level: number; name: string } | null;
  pushToast: (t: Omit<Toast, 'id'>) => void;
  closeLevelUp: () => void;
  showLevelUp: (level: number, name: string) => void;
}
let tid = 0;
export const useUi = create<UiState>((set) => ({
  toasts: [],
  levelUp: null,
  pushToast: (t) => {
    const id = ++tid;
    set((s) => ({ toasts: [...s.toasts.slice(-3), { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 3200);
  },
  closeLevelUp: () => set({ levelUp: null }),
  showLevelUp: (level, name) => set({ levelUp: { level, name } }),
}));

const initial = {
  xp: 0,
  awarded: {} as Record<string, number>,
  badges: {} as Record<string, string>,
  group: null as Group | null,
  done: {} as Record<string, string>,
  quizBest: {} as Record<string, number>,
  hunt: {} as Record<string, (0 | 1 | null)[]>,
  labs: {} as Record<string, Record<string, number>>,
  reflection: { name: '', school: '', q: {} } as Reflection,
  settings: { track: 'focus', volume: 0.4, musicOn: false, sfxOn: true, nudged: false, theme: 'dark' } as Settings,
};

export const useProgress = create<ProgressState>()(
  persist(
    (set, get) => {
      const addXp = (xp: number) => {
        const before = levelOf(get().xp);
        set((s) => ({ xp: s.xp + xp }));
        const after = levelOf(get().xp);
        if (after.index > before.index) {
          sfx('levelup');
          useUi.getState().showLevelUp(after.index + 1, after.name);
        }
      };
      return {
        ...initial,
        award: (key, xp, label) => {
          if (get().awarded[key] !== undefined) return;
          set((s) => ({ awarded: { ...s.awarded, [key]: xp } }));
          useUi.getState().pushToast({ text: label, xp, kind: 'xp' });
          addXp(xp);
        },
        grantBadge: (id) => {
          if (get().badges[id]) return;
          const b = BADGES.find((x) => x.id === id);
          if (!b) return;
          set((s) => ({ badges: { ...s.badges, [id]: today() } }));
          sfx('badge');
          useUi.getState().pushToast({ text: `獲得徽章「${b.name}」`, xp: b.xp, kind: 'badge' });
          addXp(b.xp);
        },
        complete: (mission, xp, label) => {
          if (!get().done[mission]) set((s) => ({ done: { ...s.done, [mission]: today() } }));
          get().award(`done:${mission}`, xp, label);
          const b = BADGES.find((x) => x.mission === mission);
          if (b) get().grantBadge(b.id);
          // 全部任務完成
          const all = BADGES.filter((x) => x.mission).every((x) => get().done[x.mission!]);
          if (all) get().grantBadge('master');
        },
        setGroup: (group) => set({ group }),
        setQuizBest: (id, n) => set((s) => ({ quizBest: { ...s.quizBest, [id]: Math.max(s.quizBest[id] ?? 0, n) } })),
        setHuntBit: (cfgId, i, bit) => set((s) => {
          const cur = [...(s.hunt[cfgId] ?? [null, null, null, null])];
          cur[i] = bit;
          return { hunt: { ...s.hunt, [cfgId]: cur } };
        }),
        setLab: (id, data) => set((s) => ({ labs: { ...s.labs, [id]: { ...s.labs[id], ...data } } })),
        setReflection: (p) => set((s) => ({ reflection: { ...s.reflection, ...p } })),
        setAnswer: (key, text) => set((s) => ({ reflection: { ...s.reflection, q: { ...s.reflection.q, [key]: text } } })),
        setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
        resetAll: () => set({ ...initial, settings: get().settings, group: get().group }),
      };
    },
    {
      name: 'chip-camp-progress-v1',
      version: 1,
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({
        xp: s.xp, awarded: s.awarded, badges: s.badges, group: s.group, done: s.done, quizBest: s.quizBest,
        hunt: s.hunt, labs: s.labs, reflection: s.reflection, settings: s.settings,
      }),
    },
  ),
);
