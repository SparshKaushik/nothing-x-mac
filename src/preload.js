const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nx', {
  init: () => ipcRenderer.invoke('popover:init'),
  setHeight: (h) => ipcRenderer.send('popover:set-height', h),
  onAccent: (cb) => ipcRenderer.on('popover:accent', (_e, color) => cb(color)),
  quit: () => ipcRenderer.send('app:quit'),
});
