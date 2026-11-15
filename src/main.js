const {
  app, BrowserWindow, Tray, Menu, ipcMain, screen, systemPreferences,
} = require('electron');
const path = require('node:path');
const { popoverSymbolDataUrls, trayIcon } = require('./symbols');

const APP_NAME = 'Nothing X Mac';
const POPOVER_WIDTH = 300;

let tray = null;
let popover = null;
let lastHiddenAt = 0;

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
}));

ipcMain.on('popover:set-height', (_e, height) => {
  const h = Math.ceil(Math.max(100, Math.min(height, 800)));
  const { x, y } = popover.getBounds();
  popover.setBounds({ x, y, width: POPOVER_WIDTH, height: h });
});

ipcMain.on('app:quit', () => app.quit());

app.whenReady().then(() => {
  if (process.platform === 'darwin') app.dock.hide();

  createPopover();

  tray = new Tray(trayIcon());
  tray.setToolTip(APP_NAME);
  tray.on('click', togglePopover);
  tray.on('right-click', () => {
    hidePopover();
    tray.popUpContextMenu(
      Menu.buildFromTemplate([{ label: `Quit ${APP_NAME}`, click: () => app.quit() }])
    );
  });

  systemPreferences.on('accent-color-changed', () => {
    popover.webContents.send('popover:accent', accentColor());
  });

  // Dev convenience: NXM_OPEN=1 npm start opens the popover on launch.
  if (process.env.NXM_OPEN) popover.once('ready-to-show', () => setTimeout(showPopover, 300));
});

app.on('window-all-closed', (e) => e.preventDefault());
