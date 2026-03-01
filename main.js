const { app, BrowserWindow, ipcMain, clipboard, shell } = require('electron');
const path = require('path');

const SPLASH_DURATION = 10_000; // 10 seconds

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
      devTools: false,
    },
  });
  splash.loadFile('splash.html');
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
    },
  });

  win.loadFile('index.html');
  return win;
}

/* ── IPC handlers ───────────────────────────────────────────────────────── */
ipcMain.handle('clipboard:write', (_, text) => clipboard.writeText(text));
ipcMain.handle('shell:open',      (_, url)  => shell.openExternal(url));

/* ── App lifecycle ──────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  const splash = createSplash();
  const win    = createMainWindow();

  // After SPLASH_DURATION ms: close splash, reveal main window
  setTimeout(() => {
    try { splash.destroy(); } catch (_) { /* already closed */ }
    win.show();
  }, SPLASH_DURATION);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createMainWindow().show();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
