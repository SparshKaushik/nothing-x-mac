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
  ring: (side, on) => ipcRenderer.send('device:ring', side, on),
  setSpatialAudio: (mode) => ipcRenderer.send('device:set-spatial-audio', mode),
  setDualConnection: (on) => ipcRenderer.send('device:set-dual-connection', on),
  setDualDevice: (mac, connect) => ipcRenderer.send('device:set-dual-device', mac, connect),
  setEqPreset: (id) => ipcRenderer.send('device:set-eq-preset', id),
  setCustomEq: (bands) => ipcRenderer.send('device:set-custom-eq', bands),
});
