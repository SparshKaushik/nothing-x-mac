// Menu bar icon from the app logo (src/assets/logo.svg).
//
// Electron's nativeImage can't load SVG, so this reads the logo's single path,
// flattens its curves and fills it (even-odd, 4×4 supersampled) into 1x and 2x
// bitmaps. The result is a template image: macOS tints it to match the menu
// bar (black in light mode, white in dark mode, highlighted when clicked).

const fs = require('node:fs');
const path = require('node:path');
const { nativeImage } = require('electron');

const LOGO_PATH = path.join(__dirname, 'assets', 'logo.svg');
const ICON_HEIGHT_PT = 14;
const SUPERSAMPLE = 4;
const CURVE_STEPS = 12;

// Parse an SVG path made of absolute M / L / C / Z commands into closed polygons.
function pathToPolygons(d) {
  const tokens = d.match(/[MLCZ]|-?\d*\.?\d+(?:e[-+]?\d+)?/gi) ?? [];
  const polygons = [];
  let poly = null;
  let cmd = null;
  let i = 0;
  const num = () => Number(tokens[i++]);

  while (i < tokens.length) {
    if (/^[MLCZ]$/i.test(tokens[i])) cmd = tokens[i++].toUpperCase();
    if (cmd === 'M') {
      poly = [[num(), num()]];
      polygons.push(poly);
      cmd = 'L'; // further pairs after M are line-tos
    } else if (cmd === 'L') {
      poly.push([num(), num()]);
    } else if (cmd === 'C') {
      const [x0, y0] = poly[poly.length - 1];
      const x1 = num(), y1 = num(), x2 = num(), y2 = num(), x3 = num(), y3 = num();
      for (let s = 1; s <= CURVE_STEPS; s++) {
        const t = s / CURVE_STEPS, u = 1 - t;
        poly.push([
          u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3,
          u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3,
        ]);
      }
    } else if (cmd === 'Z') {
      cmd = null;
    } else {
      i++; // unknown token: skip
    }
  }
  return polygons;
}

function bounds(polygons) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const poly of polygons) for (const [x, y] of poly) {
    minX = Math.min(minX, x); maxX = Math.max(maxX, x);
    minY = Math.min(minY, y); maxY = Math.max(maxY, y);
  }
  return { minX, minY, maxX, maxY };
}

// Even-odd scanline fill into an alpha coverage buffer (0..1).
function rasterize(polygons, box, width, height) {
  const scale = height / (box.maxY - box.minY);
  const offsetX = (width - (box.maxX - box.minX) * scale) / 2;
  const edges = [];
  for (const poly of polygons) {
    for (let k = 0; k < poly.length; k++) {
      const a = poly[k], b = poly[(k + 1) % poly.length];
      const ax = (a[0] - box.minX) * scale + offsetX, ay = (a[1] - box.minY) * scale;
      const bx = (b[0] - box.minX) * scale + offsetX, by = (b[1] - box.minY) * scale;
      if (ay !== by) edges.push([ax, ay, bx, by]);
    }
  }

  const coverage = new Float32Array(width * height);
  const step = 1 / SUPERSAMPLE;
  for (let y = 0; y < height; y++) {
    for (let sy = 0; sy < SUPERSAMPLE; sy++) {
      const scanY = y + (sy + 0.5) * step;
      const xs = [];
      for (const [ax, ay, bx, by] of edges) {
        if ((scanY >= ay && scanY < by) || (scanY >= by && scanY < ay)) {
          xs.push(ax + ((scanY - ay) / (by - ay)) * (bx - ax));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        for (let x = 0; x < width; x++) {
          for (let sx = 0; sx < SUPERSAMPLE; sx++) {
            const scanX = x + (sx + 0.5) * step;
            if (scanX >= xs[k] && scanX < xs[k + 1]) coverage[y * width + x] += 1 / (SUPERSAMPLE * SUPERSAMPLE);
          }
        }
      }
    }
  }
  return coverage;
}

// BGRA bitmap: black with the coverage as alpha (premultiplied black is still 0,0,0).
function toBitmap(coverage) {
  const buf = Buffer.alloc(coverage.length * 4);
  coverage.forEach((c, i) => { buf[i * 4 + 3] = Math.round(Math.min(c, 1) * 255); });
  return buf;
}

function trayLogoIcon() {
  const svg = fs.readFileSync(LOGO_PATH, 'utf8');
  const d = svg.match(/<path[^>]*\sd="([^"]+)"/)?.[1];
  if (!d) return null;

  const polygons = pathToPolygons(d);
  const box = bounds(polygons);
  const aspect = (box.maxX - box.minX) / (box.maxY - box.minY);

  const icon = nativeImage.createEmpty();
  for (const scaleFactor of [1, 2]) {
    const height = ICON_HEIGHT_PT * scaleFactor;
    const width = Math.ceil(height * aspect);
    const bitmap = toBitmap(rasterize(polygons, box, width, height));
    const rep = nativeImage.createFromBitmap(bitmap, { width, height, scaleFactor });
    icon.addRepresentation({ scaleFactor, buffer: rep.toPNG() });
  }
  icon.setTemplateImage(true);
  return icon;
}

module.exports = { trayLogoIcon };
