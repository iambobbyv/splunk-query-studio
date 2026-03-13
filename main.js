const { app, BrowserWindow, ipcMain, clipboard, shell, screen } = require('electron');
const path = require('path');

const SPLASH_DURATION = 2_500;  // 2.5 seconds
const DEV = !app.isPackaged;    // true when running via `npm start`

// Icon paths
const ICON_PNG  = path.join(__dirname, 'assets', 'icon-1024.png');
const ICON_ICO  = path.join(__dirname, 'assets', 'icon.ico');
const APP_ICON  = process.platform === 'win32' ? ICON_ICO : ICON_PNG;

/* ── Splash window ──────────────────────────────────────────────────────── */
function createSplash() {
  const splash = new BrowserWindow({
    width: 700,
    height: 440,
    frame: false,
    resizable: false,
    center: true,
    backgroundColor: '#020617',
    icon: APP_ICON,
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
  // Size the window to fit the screen — fallback to 1600×900 if screen API not ready
  const workArea = screen.getPrimaryDisplay?.()?.workAreaSize ?? { width: 1600, height: 900 };
  const win = new BrowserWindow({
    title:     'Build Smarter SPL Queries Faster.',
    width:     Math.min(1600, workArea.width),
    height:    Math.min(960,  workArea.height),
    minWidth:  900,
    minHeight: 620,
    center:    true,
    show:      false, // revealed after splash
    backgroundColor: '#020617',
    icon: APP_ICON,
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

  // DevTools: open manually with Ctrl+Shift+I if needed
  // if (DEV) win.webContents.openDevTools({ mode: 'detach' });

  return win;
}

/* ── IPC handlers ───────────────────────────────────────────────────────── */
ipcMain.handle('clipboard:write', (_, text) => clipboard.writeText(text));
ipcMain.handle('shell:open',      (_, url)  => shell.openExternal(url));

/* ── App lifecycle ──────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  // Override Dock icon in dev mode (packaged builds use the electron-builder icon config)
  if (DEV && process.platform === 'darwin') {
    app.dock.setIcon(ICON_PNG);
  }

  const splash = createSplash();
  const win    = createMainWindow();

  console.log('[main] app ready — splash shown, main window hidden for', SPLASH_DURATION / 1000, 's');

  // After SPLASH_DURATION ms: close splash, maximize + reveal main window
  setTimeout(() => {
    try { splash.destroy(); } catch (_) { /* already closed */ }
    win.maximize();   // fill the screen — avoids any fixed-width clipping issues
    win.show();
    console.log('[main] splash closed, main window shown (maximized)');
  }, SPLASH_DURATION);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      const w = createMainWindow();
      w.maximize();
      w.show();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
