const { nativeImage } = require('electron');

// SF Symbols used by the popover. Loaded from macOS so they match the system exactly.
const POPOVER_SYMBOLS = {
  budLeft: 'airpodpro.left',
  budRight: 'airpodpro.right',
  case: 'earbuds.case.fill',
  device: 'earbuds',
  anc: 'person.wave.2.fill',
  transparency: 'ear.and.waveform',
  off: 'person.fill',
  bolt: 'bolt.fill',
};

function loadSymbol(name) {
  const img = nativeImage.createFromNamedImage(name);
  return img.isEmpty() ? null : img;
}

// Data URLs the renderer uses as CSS masks, so glyphs pick up theme colours.
function popoverSymbolDataUrls() {
  const out = {};
  for (const [key, name] of Object.entries(POPOVER_SYMBOLS)) {
    const img = loadSymbol(name);
    out[key] = img ? img.toDataURL() : null;
  }
  return out;
}

// Menu bar icon: the SF "earbuds" glyph as a crisp 1x/2x template image.
function trayIcon() {
  const src = loadSymbol('earbuds');
  if (!src) return nativeImage.createEmpty();
  const height = 15; // points
  const icon = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const rep = src.resize({ height: height * scaleFactor, quality: 'best' });
    icon.addRepresentation({ scaleFactor, buffer: rep.toPNG() });
  }
  icon.setTemplateImage(true);
  return icon;
}

module.exports = { popoverSymbolDataUrls, trayIcon };
