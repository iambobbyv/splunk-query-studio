const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  copyToClipboard: (text) => ipcRenderer.invoke('clipboard:write', text),
  openExternal:   (url)  => ipcRenderer.invoke('shell:open', url)
});
