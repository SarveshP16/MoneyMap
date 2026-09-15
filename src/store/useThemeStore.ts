import { create } from 'zustand';

export type ThemeMode = 'system' | 'light' | 'dark';

// Deliberately outside the `moneymap.finance.` prefix used by lib/storage.ts
// — this is a device display preference, not finance data (same distinction
// Pulse itself makes: ThemeModeController persists separately from any
// finance repository).
const KEY = 'moneymap.theme';

function loadMode(): ThemeMode {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw === 'system' || raw === 'light' || raw === 'dark') return raw;
  } catch {
    // Storage unavailable — fall through to the default.
  }
  return 'dark'; // MoneyMap was designed dark-first; existing users shouldn't
  // see it flip to light just because their OS happens to be light.
}

interface ThemeState {
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: loadMode(),
  setMode: (mode) => {
    try {
      localStorage.setItem(KEY, mode);
    } catch {
      // ignore
    }
    set({ mode });
  },
}));
