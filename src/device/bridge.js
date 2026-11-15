// Runs the native nx-bridge helper and exposes it as an event emitter.
// Events: 'connected' ({ name, address }), 'data' (Buffer), 'disconnected', 'exit'.

const { spawn } = require('node:child_process');
const { EventEmitter } = require('node:events');
const readline = require('node:readline');
const path = require('node:path');

function bridgeBinaryPath() {
  // Packaged builds should ship the helper under Resources; dev uses build/.
  const { app } = require('electron');
  return app.isPackaged
    ? path.join(process.resourcesPath, 'nx-bridge')
    : path.join(__dirname, '..', '..', 'build', 'nx-bridge');
}

class BluetoothBridge extends EventEmitter {
  constructor(binaryPath = bridgeBinaryPath()) {
    super();
    this.binaryPath = binaryPath;
    this.child = null;
  }

  start() {
    if (this.child) return;
    const child = spawn(this.binaryPath, [], { stdio: ['pipe', 'pipe', 'inherit'] });
    this.child = child;

    readline.createInterface({ input: child.stdout }).on('line', (line) => this.#onLine(line));

    child.on('error', (err) => console.error('[nx-bridge] failed to start:', err.message));
    child.on('exit', (code) => {
      if (this.child === child) this.child = null;
      this.emit('disconnected');
      this.emit('exit', code);
    });
  }

  stop() {
    if (!this.child) return;
    const child = this.child;
    this.child = null;
    child.stdin.end();
    child.kill();
  }

  write(bytes) {
    if (!this.child) return;
    const hex = Buffer.from(bytes).toString('hex');
    this.child.stdin.write(`${JSON.stringify({ type: 'write', hex })}\n`);
  }

  #onLine(line) {
    let msg;
    try {
      msg = JSON.parse(line);
    } catch {
      return;
    }
    switch (msg.type) {
      case 'connected':
        this.emit('connected', { name: msg.name, address: msg.address });
        break;
      case 'data':
        this.emit('data', Buffer.from(msg.hex, 'hex'));
        break;
      case 'disconnected':
        this.emit('disconnected');
        break;
      case 'log':
        console.log('[nx-bridge]', msg.message);
        break;
      default:
        break;
    }
  }
}

module.exports = { BluetoothBridge };
