const {
  app, BrowserWindow, Tray, Menu, ipcMain, screen, systemPreferences,
} = require('electron');
const path = require('node:path');
const { popoverSymbolDataUrls, trayIcon } = require('./symbols');
const { trayLogoIcon } = require('./tray-logo');
const loginItem = require('./login-item');
const { NothingDevice } = require('./device/nothing-device');

const APP_NAME = 'Nothing X Mac';
const POPOVER_WIDTH = 300;

let tray = null;
let popover = null;
let lastHiddenAt = 0;
const device = new NothingDevice();

function accentColor() {
  // RRGGBBAA -> #RRGGBB
  return `#${systemPreferences.getAccentColor().slice(0, 6)}`;
}

function createPopover() {
  popover = new BrowserWindow({
    width: POPOVER_WIDTH,
    height: 360,
    show: false,
    frame: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    hasShadow: true,
    roundedCorners: true,
    backgroundColor: '#00000000',
    vibrancy: 'menu',
    visualEffectState: 'active',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  popover.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  popover.loadFile(path.join(__dirname, 'popover', 'index.html'));

  popover.on('blur', () => {
    if (!popover.webContents.isDevToolsOpened()) hidePopover();
  });
}

function positionPopover() {
  const trayBounds = tray.getBounds();
  const { width, height } = popover.getBounds();
  const display = screen.getDisplayNearestPoint({ x: trayBounds.x, y: trayBounds.y });
  const area = display.workArea;
  const margin = 8;

  let x = Math.round(trayBounds.x + trayBounds.width / 2 - width / 2);
  x = Math.max(area.x + margin, Math.min(x, area.x + area.width - width - margin));
  const y = Math.round(trayBounds.y + trayBounds.height + 4);

  popover.setBounds({ x, y, width, height });
}

function showPopover() {
  device.refreshBattery();
  positionPopover();
  popover.show();
  popover.focus();
  app.focus({ steal: true });
}

function hidePopover() {
  if (!popover.isVisible()) return;
  popover.hide();
  lastHiddenAt = Date.now();
}

function togglePopover() {
  if (popover.isVisible()) return hidePopover();
  // A click on the tray blurs (and hides) the popover first; don't reopen it.
  if (Date.now() - lastHiddenAt < 250) return;
  showPopover();
}

ipcMain.handle('popover:init', () => ({
  appName: APP_NAME,
  accent: accentColor(),
  symbols: popoverSymbolDataUrls(),
  device: device.getState(),
}));

ipcMain.on('device:set-noise-mode', (_e, mode) => device.setNoiseMode(mode));
ipcMain.on('device:set-anc-strength', (_e, strength) => device.setAncStrength(strength));
ipcMain.on('device:set-bass', (_e, change) => device.setBass(change));
ipcMain.on('device:set-quick-toggle', (_e, name, on) => device.setQuickToggle(name, on));
ipcMain.on('device:ring', (_e, side, on) => device.ring(side, on));
ipcMain.on('device:set-spatial-audio', (_e, mode) => device.setSpatialAudio(mode));
ipcMain.on('device:set-eq-preset', (_e, id) => device.setEqPreset(id));
ipcMain.on('device:set-custom-eq', (_e, bands) => device.setCustomEq(bands));

device.on('change', (state) => {
  if (popover && !popover.isDestroyed()) popover.webContents.send('device:state', state);
  if (tray) tray.setToolTip(state.connected ? `${APP_NAME} · ${state.name}` : APP_NAME);
});

ipcMain.on('popover:set-height', (_e, height) => {
  const h = Math.ceil(Math.max(100, Math.min(height, 800)));
  const { x, y } = popover.getBounds();
  popover.setBounds({ x, y, width: POPOVER_WIDTH, height: h });
});

ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();

  loginItem.enableOnFirstRun();
  createPopover();
  device.start();

  // App logo in the menu bar; falls back to the SF earbuds glyph if the logo can't load.
  let icon = null;
  try {
    icon = trayLogoIcon();
  } catch (err) {
    console.error('[tray] logo failed, using earbuds icon:', err.message);
  }
  tray = new Tray(icon && !icon.isEmpty() ? icon : trayIcon());
  tray.setToolTip(APP_NAME);
  tray.on('click', togglePopover);
  tray.on('right-click', () => {
    hidePopover();
    tray.popUpContextMenu(
      Menu.buildFromTemplate([
        {
          label: 'Open at Login',
          type: 'checkbox',
          checked: loginItem.isEnabled(),
          // Only the installed app can start at login (npm run dist).
          enabled: loginItem.isSupported(),
          click: (item) => loginItem.setEnabled(item.checked),
        },
        { type: 'separator' },
        { label: `Quit ${APP_NAME}`, click: () => app.quit() },
      ])
    );
  });

  systemPreferences.on('accent-color-changed', () => {
    popover.webContents.send('popover:accent', accentColor());
  });

  // Dev convenience: NXM_OPEN=1 npm start opens the popover on launch.
  if (process.env.NXM_OPEN) popover.once('ready-to-show', () => setTimeout(showPopover, 300));
});

app.on('window-all-closed', (e) => e.preventDefault());
app.on('before-quit', () => device.stop());
