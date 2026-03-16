const { app, BrowserWindow, ipcMain, clipboard, shell, screen, Menu, dialog } = require('electron');
const path = require('path');
const fs   = require('fs');

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
    title:     'SQS by SouriApps',
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

/* ── Native application menu ────────────────────────────────────────────── */
function buildMenu() {
  const SUPPORT_URL  = 'https://souriapps.net/support';
  const FEEDBACK_URL = 'mailto:feedback@souriapps.net';
  const WEBSITE_URL  = 'https://souriapps.net';

  const template = [
    // ── macOS app menu (first item = app name) ──────────────────────────
    ...(process.platform === 'darwin' ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'services' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' },
      ],
    }] : []),

    // ── Edit ────────────────────────────────────────────────────────────
    { role: 'editMenu' },

    // ── View ────────────────────────────────────────────────────────────
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { role: 'forceReload' },
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' },
        ...(DEV ? [{ type: 'separator' }, { role: 'toggleDevTools' }] : []),
      ],
    },

    // ── Window ──────────────────────────────────────────────────────────
    { role: 'windowMenu' },

    // ── Help ────────────────────────────────────────────────────────────
    {
      role: 'help',
      submenu: [
        {
          label: 'FAQ & Support',
          accelerator: process.platform === 'darwin' ? 'Cmd+Shift+/' : 'F1',
          click: () => shell.openExternal(SUPPORT_URL),
        },
        { type: 'separator' },
        {
          label: 'Send Feedback…',
          click: () => shell.openExternal(FEEDBACK_URL),
        },
        {
          label: 'Visit SouriApps.net',
          click: () => shell.openExternal(WEBSITE_URL),
        },
      ],
    },
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

/* ── IPC handlers ───────────────────────────────────────────────────────── */
ipcMain.handle('clipboard:write', (_, text) => clipboard.writeText(text));
ipcMain.handle('shell:open',      (_, url)  => shell.openExternal(url));

// File import — returns { filename, content } or null if cancelled
ipcMain.handle('dialog:openFile', async () => {
  const { canceled, filePaths } = await dialog.showOpenDialog({
    title: 'Import Templates',
    filters: [
      { name: 'Template Files', extensions: ['json', 'txt', 'xml', 'spl', 'log'] },
      { name: 'All Files',      extensions: ['*'] },
    ],
    properties: ['openFile'],
  });
  if (canceled || !filePaths.length) return null;
  const filePath = filePaths[0];
  const content  = fs.readFileSync(filePath, 'utf8');
  return { filename: path.basename(filePath), content };
});

// File-backed key-value store in userData — survives Electron / OS updates
const STORE_PATH = path.join(app.getPath('userData'), 'sqs-store.json');

function readStore() {
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); }
  catch { return {}; }
}
function writeStore(data) {
  try { fs.writeFileSync(STORE_PATH, JSON.stringify(data), 'utf8'); }
  catch (e) { console.error('[store] write failed:', e.message); }
}

ipcMain.handle('store:get', (_, key)        => readStore()[key] ?? null);
ipcMain.handle('store:set', (_, key, value) => { const s = readStore(); s[key] = value; writeStore(s); });

/* ── App lifecycle ──────────────────────────────────────────────────────── */
app.whenReady().then(() => {
  buildMenu();

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
