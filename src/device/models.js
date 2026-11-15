// Per-model capabilities, keyed by the product name the earbuds advertise
// over Bluetooth. Capability data referenced from ear-web.

const ANC_BIT = {
  STRENGTH_MID: 0x02, // adds Mid (Low / Mid / High)
  STRENGTH_BASE: 0x04, // Low / High
  ADAPTIVE: 0x08,
  TRANSPARENCY: 0x10,
};

const FULL = 63;

// anc:  noise-control capability bits
// bass: Bass Enhance level count (5, or 3 steps where the lowest is off); 0 = none
// Some names cover two hardware revisions (e.g. CMF Buds 2 / Buds Pro 2 come in
// 5-level and 3-step versions); the device layer corrects this from the first
// bass report.
const MODELS = [
  { name: 'Nothing Headphone (1) Pro', anc: FULL, bass: 0 },
  { name: 'Nothing Headphone (1)', anc: FULL, bass: 5 },
  { name: 'Nothing Headphone (a)', anc: FULL, bass: 3 },
  { name: 'Nothing Ear (open)', anc: FULL, bass: 0 },
  { name: 'CMF Headphone Pro', anc: FULL, bass: 0 },
  { name: 'CMF Buds 2 Plus', anc: FULL, bass: 5 },
  { name: 'CMF Buds Pro 2', anc: FULL, bass: 5 },
  { name: 'Nothing Ear (3a)', anc: FULL, bass: 0 },
  { name: 'Nothing Ear (a)', anc: FULL, bass: 5 },
  { name: 'Nothing Ear (3)', anc: FULL, bass: 5 },
  { name: 'Nothing ear (1)', anc: 53, bass: 0 },
  { name: 'CMF Clip Pro', anc: FULL, bass: 3 },
  { name: 'Neckband Pro', anc: FULL, bass: 5 },
  { name: 'Ear (Stick)', anc: 33, bass: 0 },
  { name: 'CMF Buds 2a', anc: 49, bass: 5 },
  { name: 'CMF Buds 2', anc: FULL, bass: 5 },
  { name: 'Nothing Ear', anc: FULL, bass: 5 },
  { name: 'CMF Buds', anc: 49, bass: 5 },
  { name: 'Buds Pro', anc: 55, bass: 0 },
  { name: 'Ear (2)', anc: FULL, bass: 0 },
].sort((a, b) => b.name.length - a.name.length); // longest first: "CMF Buds 2 Plus" before "CMF Buds"

// Unknown or renamed device: assume what current models support.
const DEFAULT_MODEL = { anc: FULL, bass: 5 };

function modelForName(name = '') {
  const lower = name.toLowerCase();
  return MODELS.find((m) => lower.includes(m.name.toLowerCase())) ?? DEFAULT_MODEL;
}

// -> {
//   transparency,
//   strengths: ['low','mid','high'] | ['low','high'] | [],
//   adaptive,
//   bassSteps: 5 | 3 | 0,
// }
function capabilitiesForName(name) {
  const { anc, bass } = modelForName(name);
  const hasBase = Boolean(anc & ANC_BIT.STRENGTH_BASE);
  const hasMid = Boolean(anc & ANC_BIT.STRENGTH_MID);

  let strengths = [];
  if (hasBase) strengths = hasMid ? ['low', 'mid', 'high'] : ['low', 'high'];

  return {
    transparency: Boolean(anc & ANC_BIT.TRANSPARENCY),
    strengths,
    adaptive: hasBase && Boolean(anc & ANC_BIT.ADAPTIVE),
    bassSteps: bass,
  };
}

// Levels the UI offers while Bass Enhance is on.
function bassLevels(steps) {
  if (steps === 3) return [1, 2];
  if (steps === 5) return [1, 2, 3, 4, 5];
  return [];
}

module.exports = { capabilitiesForName, bassLevels };
