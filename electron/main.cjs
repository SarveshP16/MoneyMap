// The Windows app: the same Vite build (dist/) the web and Android versions
// use, in an Electron window. It talks to Supabase directly, exactly like
// the other two, so all three share one account and one set of ledgers.
//
// dist/ is served over a custom app:// scheme rather than file:// — the
// build uses root-absolute paths (/assets/..., /icons/...) and
// BrowserRouter URLs like /transactions, neither of which resolve under
// file://. app://moneymap/ also gives the page a stable origin, so its
// localStorage (offline cache, theme, chosen profile) survives restarts.

const { app, BrowserWindow, Menu, net, protocol, shell } = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

const APP_ID = 'com.moneymap.app';
const DIST = path.join(__dirname, '..', 'dist');
const ORIGIN = 'app://moneymap';

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true } },
]);

// A second launch just focuses the existing window instead of opening a
// second copy that would race the first one's sync.
if (!app.requestSingleInstanceLock()) app.quit();

let win = null;

function resolveFile(pathname) {
  const file = path.join(DIST, decodeURIComponent(pathname));
  if (file !== DIST && !file.startsWith(DIST + path.sep)) return null;
  // Anything that isn't a real file is a client-side route: hand back the
  // SPA shell, the same fallback public/_redirects gives the web host.
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) return path.join(DIST, 'index.html');
  return file;
}

function createWindow() {
  win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 380,
    minHeight: 560,
    title: 'MoneyMap',
    backgroundColor: '#0d1321',
    autoHideMenuBar: true,
    show: false,
    webPreferences: { contextIsolation: true, sandbox: true },
  });

  win.once('ready-to-show', () => win.show());

  // Links out of the app (e.g. to Supabase docs) belong in the real browser.
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith(ORIGIN)) {
      event.preventDefault();
      if (/^https?:/.test(url)) shell.openExternal(url);
    }
  });

  win.loadURL(`${ORIGIN}/`);
  win.on('closed', () => (win = null));
}

app.on('second-instance', () => {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.focus();
});

app.whenReady().then(() => {
  // Windows only shows toast notifications for an app whose id matches its
  // Start-menu shortcut, which the installer creates with this same id.
  app.setAppUserModelId(APP_ID);
  Menu.setApplicationMenu(null);

  protocol.handle('app', (request) => {
    const file = resolveFile(new URL(request.url).pathname);
    if (!file) return new Response('Not found', { status: 404 });
    return net.fetch(pathToFileURL(file).toString());
  });

  createWindow();
});

app.on('window-all-closed', () => app.quit());
