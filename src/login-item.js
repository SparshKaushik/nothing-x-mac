// Open at Login.
//
// macOS can only start an installed app bundle at login, so this only works in
// the packaged app (npm run dist), not under `npm start`. On the packaged app's
// first run it turns itself on; after that the user's choice is kept.

const fs = require('node:fs');
const path = require('node:path');
const { app } = require('electron');

const FIRST_RUN_MARKER = 'login-item-initialized';

function isSupported() {
  return app.isPackaged && process.platform === 'darwin';
}

function isEnabled() {
  if (!isSupported()) return false;
  return app.getLoginItemSettings().openAtLogin;
}

function setEnabled(enabled) {
  if (!isSupported()) return;
  app.setLoginItemSettings({ openAtLogin: enabled });
}

// Turn Open at Login on once, the first time the installed app runs.
function enableOnFirstRun() {
  if (!isSupported()) return;
  const marker = path.join(app.getPath('userData'), FIRST_RUN_MARKER);
  if (fs.existsSync(marker)) return;
  setEnabled(true);
  try {
    fs.mkdirSync(path.dirname(marker), { recursive: true });
    fs.writeFileSync(marker, new Date().toISOString());
  } catch (err) {
    console.error('[login-item] could not save first-run marker:', err.message);
  }
}

module.exports = { isSupported, isEnabled, setEnabled, enableOnFirstRun };
