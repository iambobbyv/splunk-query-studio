const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  copyToClipboard: (text)       => ipcRenderer.invoke('clipboard:write', text),
  openExternal:    (url)        => ipcRenderer.invoke('shell:open', url),
  // File import via native dialog (Electron only)
  openFile:        ()           => ipcRenderer.invoke('dialog:openFile'),
  // File-backed persistent store (Electron only) — survives app/OS updates
  storeGet:        (key)        => ipcRenderer.invoke('store:get', key),
  storeSet:        (key, value) => ipcRenderer.invoke('store:set', key, value),
});
