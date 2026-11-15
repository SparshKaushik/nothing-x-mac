// Per-model noise-control capabilities, keyed by the product name the
// earbuds advertise over Bluetooth. Capability bits referenced from ear-web.

const ANC_BIT = {
  STRENGTH_MID: 0x02, // adds Mid (Low / Mid / High)
  STRENGTH_BASE: 0x04, // Low / High
  ADAPTIVE: 0x08,
  TRANSPARENCY: 0x10,
};

const FULL = 63;

// Longest names first so "CMF Buds 2 Plus" wins over "CMF Buds".
const MODELS = [
  ['Nothing Headphone (1) Pro', FULL],
  ['Nothing Headphone (1)', FULL],
  ['Nothing Headphone (a)', FULL],
  ['Nothing Ear (open)', FULL],
  ['CMF Headphone Pro', FULL],
  ['CMF Buds 2 Plus', FULL],
  ['CMF Buds Pro 2', FULL],
  ['Nothing Ear (3a)', FULL],
  ['Nothing Ear (a)', FULL],
  ['Nothing Ear (3)', FULL],
  ['Nothing ear (1)', 53],
  ['Neckband Pro', FULL],
  ['Ear (Stick)', 33],
  ['CMF Buds 2a', 49],
  ['CMF Buds 2', FULL],
  ['Nothing Ear', FULL],
  ['CMF Buds', 49],
  ['Buds Pro', 55],
  ['Ear (2)', FULL],
].sort((a, b) => b[0].length - a[0].length);

function ancLevelForName(name = '') {
  const lower = name.toLowerCase();
  const match = MODELS.find(([model]) => lower.includes(model.toLowerCase()));
  // Unknown or renamed device: assume the full feature set of current models.
  return match ? match[1] : FULL;
}

// -> { transparency, strengths: ['low','mid','high'] | ['low','high'] | [], adaptive }
function capabilitiesForName(name) {
  const level = ancLevelForName(name);
  const hasBase = Boolean(level & ANC_BIT.STRENGTH_BASE);
  const hasMid = Boolean(level & ANC_BIT.STRENGTH_MID);

  let strengths = [];
  if (hasBase) strengths = hasMid ? ['low', 'mid', 'high'] : ['low', 'high'];

  return {
    transparency: Boolean(level & ANC_BIT.TRANSPARENCY),
    strengths,
    adaptive: hasBase && Boolean(level & ANC_BIT.ADAPTIVE),
  };
}

module.exports = { capabilitiesForName };
