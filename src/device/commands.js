// Command ids and payload codecs for the features this app supports:
// battery, noise control, bass and quick settings. Values referenced from ear-web.

const Command = {
  GET_BATTERY: 0xc007,
  GET_NOISE_MODE: 0xc01e,
  SET_NOISE_MODE: 0xf00f,
  GET_BASS: 0xc04e,
  SET_BASS: 0xf051,
  GET_IN_EAR: 0xc00e,
  SET_IN_EAR: 0xf004,
  GET_LOW_LATENCY: 0xc041,
  SET_LOW_LATENCY: 0xf040,
  GET_FIRMWARE: 0xc042,
  START_FIT_TEST: 0xf014,
  RING: 0xf002,
};

// Frames the earbuds send back (replies and unsolicited updates).
const Response = {
  BATTERY: [0x4007, 0xe001],
  NOISE_MODE: [0x401e, 0xe003, 0x6003],
  BASS: [0x404e],
  IN_EAR: [0x400e],
  LOW_LATENCY: [0x4041],
  FIRMWARE: [0x4042],
  FIT_TEST: [0xe00d],
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

// ---- Bass enhance -----------------------------------------------------------

// payload: [enabled, wireLevel]
// Most models use 5 levels sent as level*2 (2..10). A few use 3 steps sent as
// 0 / 5 / 10, where step 0 means off; here those become off + levels 1..2.
const THREE_STEP_WIRE = [0, 5, 10];

// -> { enabled, level, wire }. level is null if it doesn't fit the model.
function decodeBass(payload, steps) {
  const enabled = payload[0] === 1;
  const wire = payload[1] ?? 0;
  let level;
  if (steps === 3) {
    const index = THREE_STEP_WIRE.indexOf(wire);
    level = index > 0 ? index : null;
  } else {
    level = wire >= 2 && wire <= 10 && wire % 2 === 0 ? wire / 2 : null;
  }
  return { enabled, level, wire };
}

function encodeBass(enabled, level, steps) {
  const wire = steps === 3 ? THREE_STEP_WIRE[enabled ? level : 0] ?? 0 : level * 2;
  return [enabled ? 0x01 : 0x00, wire];
}

// ---- Quick settings ---------------------------------------------------------

// In-ear detection. payload: [?, ?, on]
const decodeInEar = (payload) => payload[2] === 1;
const encodeInEar = (on) => [0x01, 0x01, on ? 0x01 : 0x00];

// Low latency mode. payload: [1 = on, 2 = off]
const decodeLowLatency = (payload) => payload[0] === 1;
const encodeLowLatency = (on) => [on ? 0x01 : 0x02, 0x00];

// Firmware version as ASCII, e.g. "1.0.3.124".
const decodeFirmware = (payload) => String.fromCharCode(...payload).replace(/\0+$/, '').trim();

// Ear tip fit test result per bud. payload: [left, right]
const FIT_RESULT = { 0: 'good', 1: 'adjust', 2: 'not-in-ear' };
const decodeFitTest = (payload) => ({
  left: FIT_RESULT[payload[0]] ?? 'not-in-ear',
  right: FIT_RESULT[payload[1]] ?? 'not-in-ear',
});
const encodeFitTest = () => [0x01];

// Find my earbuds. Three payload styles depending on the model:
//   'buds':      [0x02 left | 0x03 right, on]
//   'headphone': [0x06, on]       (one sound for the whole device)
//   'single':    [on]             (Nothing ear (1))
function encodeRing(style, side, on) {
  const flag = on ? 0x01 : 0x00;
  if (style === 'single') return [flag];
  if (style === 'headphone') return [0x06, flag];
  return [side === 'left' ? 0x02 : 0x03, flag];
}

module.exports = {
  Command,
  Response,
  decodeBattery,
  decodeNoiseMode,
  encodeNoiseMode,
  decodeBass,
  encodeBass,
  decodeInEar,
  encodeInEar,
  decodeLowLatency,
  encodeLowLatency,
  decodeFirmware,
  decodeFitTest,
  encodeFitTest,
  encodeRing,
};
