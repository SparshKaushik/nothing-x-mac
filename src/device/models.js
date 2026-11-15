// Per-model capabilities, keyed by the product name the earbuds advertise
// over Bluetooth. Capability data referenced from ear-web.

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
// fitTest: has the ear tip fit test
// ring:    find-my-earbuds style: 'buds' (left/right), 'headphone' or 'single' (one sound)
// Some names cover two hardware revisions (e.g. CMF Buds 2 / Buds Pro 2 come in
// 5-level and 3-step bass versions); the device layer corrects bass from the
// first report.
const MODELS = [
  { name: 'Nothing Headphone (1) Pro', anc: FULL, bass: 0, inEar: true, fitTest: false, ring: 'headphone' },
  { name: 'Nothing Headphone (1)', anc: FULL, bass: 5, inEar: true, fitTest: false, ring: 'headphone' },
  { name: 'Nothing Headphone (a)', anc: FULL, bass: 3, inEar: false, fitTest: false, ring: 'headphone' },
  { name: 'Nothing Ear (open)', anc: FULL, bass: 0, inEar: false, fitTest: false, ring: 'buds' },
  { name: 'CMF Headphone Pro', anc: FULL, bass: 0, inEar: false, fitTest: false, ring: 'headphone' },
  { name: 'CMF Buds 2 Plus', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'CMF Buds Pro 2', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'Nothing Ear (3a)', anc: FULL, bass: 0, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'Nothing Ear (a)', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'Nothing Ear (3)', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'Nothing ear (1)', anc: 53, bass: 0, inEar: true, fitTest: false, ring: 'single' },
  { name: 'CMF Clip Pro', anc: FULL, bass: 3, inEar: false, fitTest: false, ring: 'buds' },
  { name: 'Neckband Pro', anc: FULL, bass: 5, inEar: false, fitTest: false, ring: 'headphone' },
  { name: 'Ear (Stick)', anc: 33, bass: 0, inEar: true, fitTest: false, ring: 'buds' },
  { name: 'CMF Buds 2a', anc: 49, bass: 5, inEar: false, fitTest: false, ring: 'buds' },
  { name: 'CMF Buds 2', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'Nothing Ear', anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' },
  { name: 'CMF Buds', anc: 49, bass: 5, inEar: true, fitTest: false, ring: 'buds' },
  { name: 'Buds Pro', anc: 55, bass: 0, inEar: true, fitTest: false, ring: 'buds' },
  { name: 'Ear (2)', anc: FULL, bass: 0, inEar: true, fitTest: true, ring: 'buds' },
].sort((a, b) => b.name.length - a.name.length); // longest first: "CMF Buds 2 Plus" before "CMF Buds"

// Unknown or renamed device: assume what current earbuds support.
const DEFAULT_MODEL = { anc: FULL, bass: 5, inEar: true, fitTest: true, ring: 'buds' };

function modelForName(name = '') {
  const lower = name.toLowerCase();
  return MODELS.find((m) => lower.includes(m.name.toLowerCase())) ?? DEFAULT_MODEL;
}

// -> {
//   transparency, strengths: ['low','mid','high'] | ['low','high'] | [], adaptive,
//   bassSteps: 5 | 3 | 0,
//   inEar, lowLatency, fitTest, ring: 'buds' | 'headphone' | 'single',
// }
function capabilitiesForName(name) {
  const { anc, bass, inEar, fitTest, ring } = modelForName(name);
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
    fitTest,
    ring,
  };
}

// Levels the UI offers while Bass Enhance is on.
function bassLevels(steps) {
  if (steps === 3) return [1, 2];
  if (steps === 5) return [1, 2, 3, 4, 5];
  return [];
}

module.exports = { capabilitiesForName, bassLevels };
