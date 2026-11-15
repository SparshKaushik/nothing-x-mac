// Per-model capabilities, keyed by the product name the earbuds advertise
// over Bluetooth. Capability data referenced from ear-web.

const { eqCapabilities } = require('./eq-presets');

const ANC_BIT = {
  STRENGTH_MID: 0x02, // adds Mid (Low / Mid / High)
  STRENGTH_BASE: 0x04, // Low / High
  ADAPTIVE: 0x08,
  TRANSPARENCY: 0x10,
};

const FULL = 63;

// anc:     noise-control capability bits
// bass:    Bass Enhance level count (5, or 3 steps where the lowest is off); 0 = none
// inEar:   has in-ear detection
// ring:    find-my-earbuds style: 'buds' (left/right), 'headphone' or 'single' (one sound)
// eq:      equalizer preset profile (see eq-presets.js); treble: custom EQ treble band in Hz
// Some names cover two hardware revisions (e.g. CMF Buds 2 / Buds Pro 2 come in
// 5-level and 3-step bass versions); the device layer corrects bass from the
// first report.
const MODELS = [
  { name: 'Nothing Headphone (1) Pro', anc: FULL, bass: 0, inEar: true, ring: 'headphone', eq: 'nothing', treble: 3500 },
  { name: 'Nothing Headphone (1)', anc: FULL, bass: 5, inEar: true, ring: 'headphone', eq: 'nothing', treble: 3500 },
  { name: 'Nothing Headphone (a)', anc: FULL, bass: 3, inEar: false, ring: 'headphone', eq: 'nothing', treble: 3500 },
  { name: 'Nothing Ear (open)', anc: FULL, bass: 0, inEar: false, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'CMF Headphone Pro', anc: FULL, bass: 0, inEar: false, ring: 'headphone', eq: 'cmfNoDirac', treble: 3500 },
  { name: 'CMF Buds 2 Plus', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'cmfNoDirac', treble: 6900 },
  { name: 'CMF Buds Pro 2', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'cmf', treble: 6900 },
  { name: 'Nothing Ear (3a)', anc: FULL, bass: 0, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'Nothing Ear (a)', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'Nothing Ear (3)', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'Nothing ear (1)', anc: 53, bass: 0, inEar: true, ring: 'single', eq: 'nothingNoCustom', treble: 3400 },
  { name: 'CMF Clip Pro', anc: FULL, bass: 3, inEar: false, ring: 'buds', eq: 'cmfNoDirac', treble: 3400 },
  { name: 'Neckband Pro', anc: FULL, bass: 5, inEar: false, ring: 'headphone', eq: 'nothing', treble: 6900 },
  { name: 'Ear (Stick)', anc: 33, bass: 0, inEar: true, ring: 'buds', eq: 'nothing', treble: 3500 },
  { name: 'CMF Buds 2a', anc: 49, bass: 5, inEar: false, ring: 'buds', eq: 'cmfDirac7', treble: 6900 },
  { name: 'CMF Buds 2', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'cmf', treble: 6900 },
  { name: 'Nothing Ear', anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'CMF Buds', anc: 49, bass: 5, inEar: true, ring: 'buds', eq: 'cmf', treble: 6900 },
  { name: 'Buds Pro', anc: 55, bass: 0, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
  { name: 'Ear (2)', anc: FULL, bass: 0, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 },
].sort((a, b) => b.name.length - a.name.length); // longest first: "CMF Buds 2 Plus" before "CMF Buds"

// Unknown or renamed device: assume what current earbuds support.
const DEFAULT_MODEL = { anc: FULL, bass: 5, inEar: true, ring: 'buds', eq: 'nothing', treble: 3400 };

function modelForName(name = '') {
  const lower = name.toLowerCase();
  return MODELS.find((m) => lower.includes(m.name.toLowerCase())) ?? DEFAULT_MODEL;
}

// -> {
//   transparency, strengths: ['low','mid','high'] | ['low','high'] | [], adaptive,
//   bassSteps: 5 | 3 | 0,
//   inEar, lowLatency, ring: 'buds' | 'headphone' | 'single',
//   eq: { style, presets, customId, trebleHz },
// }
function capabilitiesForName(name) {
  const { anc, bass, inEar, ring, eq, treble } = modelForName(name);
  const hasBase = Boolean(anc & ANC_BIT.STRENGTH_BASE);
  const hasMid = Boolean(anc & ANC_BIT.STRENGTH_MID);

  let strengths = [];
  if (hasBase) strengths = hasMid ? ['low', 'mid', 'high'] : ['low', 'high'];

  return {
    transparency: Boolean(anc & ANC_BIT.TRANSPARENCY),
    strengths,
    adaptive: hasBase && Boolean(anc & ANC_BIT.ADAPTIVE),
    bassSteps: bass,
    inEar,
    lowLatency: true, // every model ear-web supports has it
    ring,
    eq: eqCapabilities(eq, treble),
  };
}

// Levels the UI offers while Bass Enhance is on.
function bassLevels(steps) {
  if (steps === 3) return [1, 2];
  if (steps === 5) return [1, 2, 3, 4, 5];
  return [];
}

module.exports = { capabilitiesForName, bassLevels };
