// High-level earbud state: connection, name, battery and noise control.
// Emits 'change' with a plain snapshot whenever anything updates.

const { EventEmitter } = require('node:events');
const { BluetoothBridge } = require('./bridge');
const { encodeFrame, FrameParser } = require('./protocol');
const {
  Command, Response, decodeBattery, decodeNoiseMode, encodeNoiseMode,
} = require('./commands');
const { capabilitiesForName } = require('./models');

const BATTERY_POLL_MS = 60_000;
const BRIDGE_RESTART_MS = 3_000;
const INITIAL_QUERY_GAP_MS = 150;
// After a switch: first read-back, retry gap while the buds still report the
// old mode, and how long to wait for confirmation before trusting the buds.
const READ_BACK_DELAY_MS = 400;
const CONFIRM_RETRY_MS = 500;
const CONFIRM_TIMEOUT_MS = 4_000;

function emptyState() {
  return {
    connected: false,
    name: null,
    battery: { left: null, right: null, case: null, stereo: null },
    noiseMode: null, // 'anc' | 'transparency' | 'off'
    ancStrength: null, // 'low' | 'mid' | 'high' | 'adaptive' (while noiseMode is 'anc')
    noisePending: false, // a switch was sent and the buds haven't confirmed it yet
    capabilities: { transparency: true, strengths: [], adaptive: false },
  };
}

class NothingDevice extends EventEmitter {
  constructor(bridge = new BluetoothBridge()) {
    super();
    this.bridge = bridge;
    this.parser = new FrameParser();
    this.state = emptyState();
    this.operationId = 0;
    this.batteryTimer = null;
    this.readBackTimer = null;
    this.pendingTimer = null;
    // Noise switch awaiting confirmation: { mode, strength }.
    this.pendingNoise = null;
    this.stopped = false;
    // Strength to use when noise cancellation is turned back on.
    this.lastAncStrength = 'high';

    bridge.on('connected', (info) => this.#onConnected(info));
    bridge.on('disconnected', () => this.#onDisconnected());
    bridge.on('data', (chunk) => this.#onData(chunk));
    bridge.on('exit', () => {
      if (!this.stopped) setTimeout(() => this.bridge.start(), BRIDGE_RESTART_MS);
    });
  }

  start() {
    this.stopped = false;
    this.bridge.start();
  }

  stop() {
    this.stopped = true;
    this.#clearTimers();
    this.bridge.stop();
  }

  getState() {
    return structuredClone(this.state);
  }

  // Both setters ignore requests while a previous switch is still in flight,
  // so rapid clicks can't queue up commands on the earbuds.
  setNoiseMode(mode) {
    if (!this.state.connected || this.pendingNoise || mode === this.state.noiseMode) return;
    const strength = mode === 'anc' ? this.#usableStrength(this.lastAncStrength) : null;
    this.#applyNoise(mode, strength);
  }

  // 'low' | 'mid' | 'high' | 'adaptive'
  setAncStrength(strength) {
    if (!this.state.connected || this.pendingNoise) return;
    if (this.state.noiseMode === 'anc' && strength === this.state.ancStrength) return;
    this.#applyNoise('anc', this.#usableStrength(strength));
  }

  refreshBattery() {
    this.#send(Command.GET_BATTERY);
  }

  // ---- internals ------------------------------------------------------------

  #usableStrength(strength) {
    const { strengths, adaptive } = this.state.capabilities;
    if (strength === 'adaptive' && adaptive) return 'adaptive';
    if (strengths.includes(strength)) return strength;
    return 'high';
  }

  #applyNoise(mode, strength) {
    this.#send(Command.SET_NOISE_MODE, encodeNoiseMode(mode, strength ?? undefined));

    // Show the target right away, marked pending, and ignore stale reports
    // until the buds confirm it (or we give up and trust what they say).
    this.pendingNoise = { mode, strength };
    clearTimeout(this.pendingTimer);
    this.pendingTimer = setTimeout(() => this.#giveUpPending(), CONFIRM_TIMEOUT_MS);

    this.#setNoiseState(mode, strength);
    this.#scheduleReadBack(READ_BACK_DELAY_MS);
  }

  #scheduleReadBack(delay) {
    clearTimeout(this.readBackTimer);
    this.readBackTimer = setTimeout(() => this.#send(Command.GET_NOISE_MODE), delay);
  }

  #onNoiseReport({ mode, strength }) {
    const pending = this.pendingNoise;
    if (pending) {
      const confirmed = mode === pending.mode && (mode !== 'anc' || strength === pending.strength);
      if (!confirmed) {
        // Still switching: keep showing the target and ask again shortly.
        this.#scheduleReadBack(CONFIRM_RETRY_MS);
        return;
      }
      this.#clearPending();
    }
    this.#setNoiseState(mode, strength);
  }

  #giveUpPending() {
    if (!this.pendingNoise) return;
    this.#clearPending();
    this.#update({ noisePending: false });
    this.#send(Command.GET_NOISE_MODE); // show whatever the buds settled on
  }

  #clearPending() {
    this.pendingNoise = null;
    clearTimeout(this.pendingTimer);
    this.pendingTimer = null;
  }

  #setNoiseState(mode, strength) {
    if (mode === 'anc' && strength) this.lastAncStrength = strength;
    this.#update({
      noiseMode: mode,
      ancStrength: mode === 'anc' ? strength : null,
      noisePending: Boolean(this.pendingNoise),
    });
  }

  #send(command, payload = []) {
    this.operationId = (this.operationId + 1) & 0xff;
    this.bridge.write(encodeFrame(command, payload, this.operationId));
  }

  #update(patch) {
    this.state = { ...this.state, ...patch };
    this.emit('change', this.getState());
  }

  #onConnected({ name }) {
    this.parser.reset();
    this.#update({ connected: true, name, capabilities: capabilitiesForName(name) });

    this.refreshBattery();
    setTimeout(() => this.#send(Command.GET_NOISE_MODE), INITIAL_QUERY_GAP_MS);

    clearInterval(this.batteryTimer);
    this.batteryTimer = setInterval(() => this.refreshBattery(), BATTERY_POLL_MS);
  }

  #onDisconnected() {
    this.#clearTimers();
    this.parser.reset();
    if (this.state.connected) {
      this.state = emptyState();
      this.emit('change', this.getState());
    }
  }

  #onData(chunk) {
    for (const frame of this.parser.push(chunk)) {
      if (Response.BATTERY.includes(frame.command)) {
        this.#update({ battery: decodeBattery(frame.payload) });
      } else if (Response.NOISE_MODE.includes(frame.command)) {
        const noise = decodeNoiseMode(frame.payload);
        if (noise) this.#onNoiseReport(noise);
      }
    }
  }

  #clearTimers() {
    this.#clearPending();
    clearInterval(this.batteryTimer);
    clearTimeout(this.readBackTimer);
    this.batteryTimer = null;
    this.readBackTimer = null;
  }
}

module.exports = { NothingDevice };
