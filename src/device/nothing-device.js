// High-level earbud state: connection, name, battery and noise mode.
// Emits 'change' with a plain snapshot whenever anything updates.

const { EventEmitter } = require('node:events');
const { BluetoothBridge } = require('./bridge');
const { encodeFrame, FrameParser } = require('./protocol');
const {
  Command, Response, decodeBattery, decodeNoiseMode, encodeNoiseMode,
} = require('./commands');

const BATTERY_POLL_MS = 60_000;
const BRIDGE_RESTART_MS = 3_000;
const INITIAL_QUERY_GAP_MS = 150;

function emptyState() {
  return {
    connected: false,
    name: null,
    battery: { left: null, right: null, case: null, stereo: null },
    noiseMode: null,
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
    this.stopped = false;

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
    this.#clearPolling();
    this.bridge.stop();
  }

  getState() {
    return structuredClone(this.state);
  }

  setNoiseMode(mode) {
    if (!this.state.connected) return;
    // Already in some noise-cancellation strength: keep the user's strength.
    if (mode === this.state.noiseMode) return;
    this.#send(Command.SET_NOISE_MODE, encodeNoiseMode(mode));
    this.#update({ noiseMode: mode });
    // Read back so the UI reflects what the earbuds actually applied.
    setTimeout(() => this.#send(Command.GET_NOISE_MODE), 400);
  }

  refreshBattery() {
    this.#send(Command.GET_BATTERY);
  }

  // ---- internals ------------------------------------------------------------

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
    this.#update({ connected: true, name });

    this.refreshBattery();
    setTimeout(() => this.#send(Command.GET_NOISE_MODE), INITIAL_QUERY_GAP_MS);

    this.#clearPolling();
    this.batteryTimer = setInterval(() => this.refreshBattery(), BATTERY_POLL_MS);
  }

  #onDisconnected() {
    this.#clearPolling();
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
        const noiseMode = decodeNoiseMode(frame.payload);
        if (noiseMode) this.#update({ noiseMode });
      }
    }
  }

  #clearPolling() {
    if (this.batteryTimer) clearInterval(this.batteryTimer);
    this.batteryTimer = null;
  }
}

module.exports = { NothingDevice };
