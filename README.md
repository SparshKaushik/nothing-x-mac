# Nothing X Mac

A macOS menu bar app for Nothing and CMF earbuds. It talks to the earbuds over
Bluetooth using the protocol from [ear-web](https://github.com/radiance-project/ear-web).

Built and tested with **CMF Buds 2 Plus**. Other Nothing / CMF models are mapped
from ear-web's per-model data; features a model doesn't have are hidden.

## Features

- **Battery** for left, right and case (click a bud to edit its gestures)
- **Noise Control**: Noise Cancellation, Transparency, Off, with intensity
  (Low / Mid / High / Auto)
- **Bass Enhance** with a stepped level slider
- **Equalizer**: presets plus a 3-band custom EQ with a live curve
- **Quick Settings**: In-Ear Detection, Low Latency, Personal Sound,
  Spatial Audio, Dual Connection (remembered devices) and Find Buds
- **Controls**: per-bud tap gestures, and which modes Noise Control cycles
- **Open at Login** (installed app), menu bar logo that follows light/dark mode

## Run

```bash
npm install
npm start
```

`npm start` also builds the Swift Bluetooth helper (`native/NXBridge.swift`),
which needs Xcode's command line tools. macOS asks for Bluetooth permission on
first run.

Debug logging of every message to and from the earbuds:

```bash
NXM_DEBUG=1 npm start
```

## Build and install

```bash
npm run dist          # builds dist/Nothing X Mac-darwin-<arch>/Nothing X Mac.app
npm run install-app   # builds and copies it to /Applications
npm run release       # universal app (Apple Silicon + Intel) -> release/v<version>/ DMG, zip, checksums
npm run build:icon    # regenerate packaging/icon.icns from src/assets/logo.svg
```

Builds are ad-hoc signed, not notarized: on other Macs, users open it once via System Settings → Privacy & Security → Open Anyway.

Unofficial project, not affiliated with or endorsed by Nothing Technology Limited.

## Layout

```
native/NXBridge.swift     Bluetooth helper: finds the buds, relays raw bytes over stdio
src/main.js               Menu bar icon, panel window, IPC
src/device/               Earbud protocol and state
  bridge.js               Runs the helper
  protocol.js             Packet framing and CRC
  commands.js             Command ids and payload codecs
  models.js               Per-model capabilities (+ eq-presets.js, gesture-profiles.js)
  nothing-device.js       Device state; delegates to the feature modules below
  confirmed-setting.js    Waits for the buds to confirm a change
  equalizer.js  quick-settings.js  dual-connection.js  gestures.js
src/popover/              Panel UI (one file per control / page)
scripts/package.js        Packaging into a signed .app
```
