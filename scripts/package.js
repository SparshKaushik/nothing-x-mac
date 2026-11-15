// Builds dist/Nothing X Mac-darwin-<arch>/Nothing X Mac.app
//
//   npm run dist           build the app
//   npm run install-app    build it and copy it to /Applications
//
// The app is ad-hoc signed so it runs on this Mac (Apple Silicon refuses
// unsigned apps). It isn't notarized, so it's meant for your own machine, not
// for sharing.

const { execFileSync } = require('node:child_process');
const path = require('node:path');
const { packager } = require('@electron/packager');

const ROOT = path.join(__dirname, '..');
const APP_NAME = 'Nothing X Mac';

function codesign(target, extra = []) {
  execFileSync('codesign', ['--force', '--sign', '-', ...extra, target], { stdio: 'inherit' });
}

async function main() {
  const [outDir] = await packager({
    dir: ROOT,
    name: APP_NAME,
    platform: 'darwin',
    arch: process.arch,
    out: path.join(ROOT, 'dist'),
    overwrite: true,
    asar: true,
    appBundleId: 'com.nothingxmac.app',
    appCategoryType: 'public.app-category.utilities',
    // App icon (Finder, Applications, Login Items); regenerate with npm run build:icon.
    icon: path.join(ROOT, 'packaging', 'icon.icns'),
    extendInfo: path.join(ROOT, 'packaging', 'Info.plist'),
    // The Swift Bluetooth helper goes in Contents/Resources (see src/device/bridge.js).
    extraResource: [path.join(ROOT, 'build', 'nx-bridge')],
    // Only ship what the app needs at runtime.
    ignore: [
      /^\/(build|dist|native|packaging|scripts)(\/|$)/,
      /^\/\.git(\/|$)/,
      /^\/\.gitignore$/,
      /^\/README\.md$/,
    ],
  });

  const appPath = path.join(outDir, `${APP_NAME}.app`);
  // Sign the helper first, then the whole bundle (Electron's frameworks via --deep).
  codesign(path.join(appPath, 'Contents', 'Resources', 'nx-bridge'));
  codesign(appPath, ['--deep']);
  execFileSync('codesign', ['--verify', '--deep', '--strict', appPath], { stdio: 'inherit' });

  console.log(`\nBuilt: ${path.relative(ROOT, appPath)}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
