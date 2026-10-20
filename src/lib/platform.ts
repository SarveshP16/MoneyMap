// Which shell the shared build is running in. The Android app is detected
// through Capacitor; the Windows app (electron/main.cjs) is Chromium with
// "Electron/<version>" in its user agent.

export const isDesktopApp = typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent);
