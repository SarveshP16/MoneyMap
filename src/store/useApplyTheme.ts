import { useEffect } from 'react';
import { useThemeStore } from './useThemeStore';

/** Applies the resolved theme to <html> as data-theme="light" (absent =
 *  dark, the default — see index.css) — every color in the app is a CSS
 *  custom property, so this is the only place theme state ever touches
 *  the DOM directly. Call once, at the app root. */
export function useApplyTheme() {
  const mode = useThemeStore((s) => s.mode);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia('(prefers-color-scheme: light)');

    function apply() {
      const resolved = mode === 'system' ? (media.matches ? 'light' : 'dark') : mode;
      if (resolved === 'light') {
        root.setAttribute('data-theme', 'light');
      } else {
        root.removeAttribute('data-theme');
      }
      // Keeps a mobile browser's own chrome (address bar tint) matching.
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', resolved === 'light' ? '#f3f4f8' : '#0d1321');
    }

    apply();

    if (mode === 'system') {
      media.addEventListener('change', apply);
      return () => media.removeEventListener('change', apply);
    }
  }, [mode]);
}
