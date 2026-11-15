// Command ids and payload codecs for the features this app supports:
// battery levels and noise control. Values referenced from ear-web.

const Command = {
  GET_BATTERY: 0xc007,
  GET_NOISE_MODE: 0xc01e,
  SET_NOISE_MODE: 0xf00f,
};

// Frames the earbuds send back (replies and unsolicited updates).
const Response = {
  BATTERY: [0x4007, 0xe001],
  NOISE_MODE: [0x401e, 0xe003, 0x6003],
};

// ---- Battery ----------------------------------------------------------------

const BATTERY_PART = { 0x02: 'left', 0x03: 'right', 0x04: 'case', 0x06: 'stereo' };
const LEVEL_MASK = 0x7f;
const CHARGING_MASK = 0x80;

// payload: [count, (partId, level|charging)*count]
// Parts not listed (e.g. a bud in the closed case) come back as null.
function decodeBattery(payload) {
  const battery = { left: null, right: null, case: null, stereo: null };
  const count = payload[0] ?? 0;
  for (let i = 0; i < count; i++) {
    const part = BATTERY_PART[payload[1 + i * 2]];
    const raw = payload[2 + i * 2];
    if (!part || raw === undefined) continue;
    battery[part] = { level: raw & LEVEL_MASK, charging: (raw & CHARGING_MASK) !== 0 };
  }
  return battery;
}

// ---- Noise control ----------------------------------------------------------

// One wire code covers both the mode and, for noise cancellation, its strength.
const NOISE_CODES = [
  { code: 0x01, mode: 'anc', strength: 'high' },
  { code: 0x02, mode: 'anc', strength: 'mid' },
  { code: 0x03, mode: 'anc', strength: 'low' },
  { code: 0x04, mode: 'anc', strength: 'adaptive' },
  { code: 0x05, mode: 'off', strength: null },
  { code: 0x07, mode: 'transparency', strength: null },
];

// payload: [?, code, ...] -> { mode, strength } or null
function decodeNoiseMode(payload) {
  const entry = NOISE_CODES.find((e) => e.code === payload[1]);
  return entry ? { mode: entry.mode, strength: entry.strength } : null;
}

// strength only matters for mode "anc"; it defaults to high.
function encodeNoiseMode(mode, strength = 'high') {
  const entry = NOISE_CODES.find(
    (e) => e.mode === mode && (mode !== 'anc' || e.strength === strength)
  );
  if (!entry) throw new Error(`Unknown noise mode: ${mode}/${strength}`);
  return [0x01, entry.code, 0x00];
}

module.exports = {
  Command,
  Response,
  decodeBattery,
  decodeNoiseMode,
  encodeNoiseMode,
};
