import type { CapacitorConfig } from '@capacitor/cli';

// The Android app is the same Vite build (dist/) running in a WebView —
// `npm run android:sync` rebuilds and copies it into android/.
const config: CapacitorConfig = {
  // Permanent once published to the Play Store — change it before then if
  // you want your own reverse-domain id.
  appId: 'com.moneymap.app',
  appName: 'MoneyMap',
  webDir: 'dist',
  plugins: {
    // Keep the WebView clear of the status/navigation bars (index.html
    // doesn't opt into viewport-fit=cover), so no safe-area CSS is needed.
    SystemBars: {
      insetsHandling: 'native',
    },
  },
};

export default config;
