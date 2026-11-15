const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('nx', {
  init: () => ipcRenderer.invoke('popover:init'),
  setHeight: (h) => ipcRenderer.send('popover:set-height', h),
  onAccent: (cb) => ipcRenderer.on('popover:accent', (_e, color) => cb(color)),
  quit: () => ipcRenderer.send('app:quit'),

  onDeviceState: (cb) => ipcRenderer.on('device:state', (_e, state) => cb(state)),
  setNoiseMode: (mode) => ipcRenderer.send('device:set-noise-mode', mode),
  setAncStrength: (strength) => ipcRenderer.send('device:set-anc-strength', strength),
  setBass: (change) => ipcRenderer.send('device:set-bass', change),
  setQuickToggle: (name, on) => ipcRenderer.send('device:set-quick-toggle', name, on),
  startFitTest: () => ipcRenderer.send('device:start-fit-test'),
  ring: (side, on) => ipcRenderer.send('device:ring', side, on),
});
