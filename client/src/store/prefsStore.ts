import { create } from 'zustand';

const KEY = 'arena:prefs';

function read(): { soundOn: boolean } {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { soundOn: Boolean(JSON.parse(raw).soundOn) };
  } catch {
    /* storage unavailable */
  }
  return { soundOn: true };
}

/** UI-only preferences. Safe for localStorage: contains no game state or secrets. */
export const usePrefsStore = create<{ soundOn: boolean; toggleSound: () => void }>((set, get) => ({
  ...read(),
  toggleSound: () => {
    const soundOn = !get().soundOn;
    set({ soundOn });
    try {
      localStorage.setItem(KEY, JSON.stringify({ soundOn }));
    } catch {
      /* ignore */
    }
  },
}));
