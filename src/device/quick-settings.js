// Quick settings: in-ear detection, low latency mode, find my earbuds and
// firmware version.
//
// Owns the `quick` slice of device state. The device passes in how to send
// commands and how to publish state changes, and forwards incoming frames.

const {
  Command, Response,
  decodeInEar, encodeInEar, decodeLowLatency, encodeLowLatency,
  decodeFirmware, encodeRing,
} = require('./commands');
const { ConfirmedSetting } = require('./confirmed-setting');

const READ_GAP_MS = 150;
const RING_AUTO_STOP_MS = 30_000;

// On/off settings: how to read, write and decode each one.
const TOGGLES = {
  inEar: {
    get: Command.GET_IN_EAR, set: Command.SET_IN_EAR, responses: Response.IN_EAR,
    decode: decodeInEar, encode: encodeInEar,
  },
  lowLatency: {
    get: Command.GET_LOW_LATENCY, set: Command.SET_LOW_LATENCY, responses: Response.LOW_LATENCY,
    decode: decodeLowLatency, encode: encodeLowLatency,
  },
};

function initialQuickState() {
  return {
    inEar: null, // true/false once read; null if unknown or unsupported
    lowLatency: null,
    pending: { inEar: false, lowLatency: false },
    firmware: null,
    ringing: null, // 'left' | 'right' | 'all' while a find sound is playing
  };
}

class QuickSettings {
  // send(command, payload), patch(partialQuickState), capabilities() -> caps
  constructor({ send, patch, capabilities }) {
    this.send = send;
    this.patch = patch;
    this.capabilities = capabilities;
    this.ringTimer = null;
    this.ringSide = null;
    this.pendingFlags = { inEar: false, lowLatency: false };

    this.confirm = {};
    for (const [name, spec] of Object.entries(TOGGLES)) {
      this.confirm[name] = new ConfirmedSetting({
        read: () => this.send(spec.get),
        matches: (report, target) => report === target,
        onTimeout: () => this.#setPending(name, false),
      });
    }
  }

  // Read everything this model supports, staggered so the buds aren't flooded.
  onConnected(startDelayMs = 0) {
    const caps = this.capabilities();
    const reads = [Command.GET_FIRMWARE];
    if (caps.inEar) reads.push(Command.GET_IN_EAR);
    if (caps.lowLatency) reads.push(Command.GET_LOW_LATENCY);
    reads.forEach((command, i) => setTimeout(() => this.send(command), startDelayMs + i * READ_GAP_MS));
  }

  // Returns true if the frame belonged to quick settings.
  handle(frame) {
    for (const [name, spec] of Object.entries(TOGGLES)) {
      if (spec.responses.includes(frame.command)) {
        const value = spec.decode(frame.payload);
        if (this.confirm[name].accept(value)) {
          this.pendingFlags[name] = false;
          this.patch({ [name]: value, pending: { ...this.pendingFlags } });
        }
        return true;
      }
    }
    if (Response.FIRMWARE.includes(frame.command)) {
      this.patch({ firmware: decodeFirmware(frame.payload) || null });
      return true;
    }
    return false;
  }

  // name: 'inEar' | 'lowLatency'. Ignored while that setting is still switching.
  setToggle(name, on, current) {
    const spec = TOGGLES[name];
    if (!spec || !this.capabilities()[name] || this.confirm[name].pending || current === on) return;
    this.send(spec.set, spec.encode(on));
    this.confirm[name].begin(on);
    this.pendingFlags[name] = true;
    this.patch({ [name]: on, pending: { ...this.pendingFlags } });
  }

  // side: 'left' | 'right' for buds; ignored for headphone/single styles.
  // Only one sound at a time; it stops by itself after 30 seconds.
  ring(side, on) {
    const style = this.capabilities().ring;
    const target = style === 'buds' ? side : 'all';
    if (on && this.ringSide && this.ringSide !== target) this.#stopRing();
    if (!on) return this.#stopRing();

    this.send(Command.RING, encodeRing(style, target, true));
    this.ringSide = target;
    clearTimeout(this.ringTimer);
    this.ringTimer = setTimeout(() => this.#stopRing(), RING_AUTO_STOP_MS);
    this.patch({ ringing: target });
  }

  reset() {
    for (const c of Object.values(this.confirm)) c.reset();
    clearTimeout(this.ringTimer);
    this.ringSide = null;
    this.pendingFlags = { inEar: false, lowLatency: false };
  }

  #stopRing() {
    if (!this.ringSide) return;
    this.send(Command.RING, encodeRing(this.capabilities().ring, this.ringSide, false));
    this.ringSide = null;
    clearTimeout(this.ringTimer);
    this.patch({ ringing: null });
  }

  #setPending(name, value) {
    this.pendingFlags[name] = value;
    this.patch({ pending: { ...this.pendingFlags } });
  }
}

module.exports = { QuickSettings, initialQuickState };
