const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');

const SPLASH_DURATION = 10_000; // 10 seconds
const DEV = !app.isPackaged;    // true when running via `npm start`

/* ── Splash window ──────────────────────────────────────────────────────── */
function createSplash() {
  const splash = new BrowserWindow({
    width: 700,
    height: 440,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#020617',
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      devTools: DEV,
    },
  });

  splash.loadFile('splash.html');

  splash.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[splash] failed to load:', code, desc);
  });

  return splash;
}

/* ── Main application window ────────────────────────────────────────────── */
function createMainWindow() {
  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    show: false, // revealed after splash
    backgroundColor: '#020617',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: true,   // always allow DevTools so errors are diagnosable
    },
  });

  win.loadFile('index.html');

  // Log any renderer-process errors to the main-process console
  win.webContents.on('did-fail-load', (_, code, desc) => {
    console.error('[main-window] failed to load:', code, desc);
  });
  win.webContents.on('render-process-gone', (_, details) => {
    console.error('[main-window] renderer crash:', details);
  });
  win.webContents.on('console-message', (_, level, msg, line, src) => {
    if (level >= 2) console.error(`[renderer L${level}] ${msg}  (${src}:${line})`);
  });

  // Open DevTools automatically in dev mode — press Ctrl+W to close it
  if (DEV) win.webContents.openDevTools({ mode: 'detach' });

  return win;
}

/* ── IPC handlers ───────────────────────────────────────────────────────── */
ipcMain.handle('clipboard:write', (_, text) => clipboard.writeText(text));
ipcMain.handle('shell:open',      (_, url)  => shell.openExternal(url));

/* ── App lifecycle ──────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  const splash = createSplash();
  const win    = createMainWindow();

  console.log('[main] app ready — splash shown, main window hidden for', SPLASH_DURATION / 1000, 's');

  // After SPLASH_DURATION ms: close splash, reveal main window
  setTimeout(() => {
    try { splash.destroy(); } catch (_) { /* already closed */ }
    win.show();
    console.log('[main] splash closed, main window shown');
  }, SPLASH_DURATION);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow().show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
