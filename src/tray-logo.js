// Menu bar icon from the app logo (src/assets/logo.svg).
//
// Electron's nativeImage can't load SVG, so logo-raster.js draws the logo into
// 1x and 2x bitmaps. The result is a template image: macOS tints it to match
// the menu bar (black in light mode, white in dark mode, highlighted when clicked).

const { nativeImage } = require('electron');
const { loadLogo, rasterizeLogo } = require('./logo-raster');

const ICON_HEIGHT_PT = 14;

// BGRA bitmap: black with the coverage as alpha (premultiplied black is still 0,0,0).
function toBitmap(coverage) {
  const buf = Buffer.alloc(coverage.length * 4);
  coverage.forEach((c, i) => { buf[i * 4 + 3] = Math.round(Math.min(c, 1) * 255); });
  return buf;
}

function trayLogoIcon() {
  const logo = loadLogo();
  if (!logo) return null;

  const icon = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const height = ICON_HEIGHT_PT * scaleFactor;
    const width = Math.ceil(height * logo.aspect);
    const bitmap = toBitmap(rasterizeLogo(logo, width, height));
    const rep = nativeImage.createFromBitmap(bitmap, { width, height, scaleFactor });
    icon.addRepresentation({ scaleFactor, buffer: rep.toPNG() });
  }
  icon.setTemplateImage(true);
  return icon;
}

module.exports = { trayLogoIcon };
