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

// Wire codes. The earbuds report several noise-cancellation strengths;
// this app groups them under one "anc" mode.
const NOISE_CODE = {
  ANC_HIGH: 0x01,
  ANC_MID: 0x02,
  ANC_LOW: 0x03,
  ANC_ADAPTIVE: 0x04,
  OFF: 0x05,
  TRANSPARENCY: 0x07,
};

const MODE_TO_CODE = {
  anc: NOISE_CODE.ANC_HIGH,
  transparency: NOISE_CODE.TRANSPARENCY,
  off: NOISE_CODE.OFF,
};

function codeToMode(code) {
  if (code === NOISE_CODE.OFF) return 'off';
  if (code === NOISE_CODE.TRANSPARENCY) return 'transparency';
  if (code >= NOISE_CODE.ANC_HIGH && code <= NOISE_CODE.ANC_ADAPTIVE) return 'anc';
  return null;
}

// payload: [?, code, ...]
function decodeNoiseMode(payload) {
  return codeToMode(payload[1]);
}

function encodeNoiseMode(mode) {
  const code = MODE_TO_CODE[mode];
  if (code === undefined) throw new Error(`Unknown noise mode: ${mode}`);
  return [0x01, code, 0x00];
}

module.exports = {
  Command,
  Response,
  decodeBattery,
  decodeNoiseMode,
  encodeNoiseMode,
};
