<p align="center">
  <img src="packaging/icon-1024.png" width="128" height="128" alt="Nothing X Mac icon">
</p>

<h1 align="center">Nothing X Mac</h1>

<p align="center">
  Control your Nothing and CMF earbuds from the Mac menu bar.
</p>

<p align="center">
  <a href="https://github.com/yashraut362/nothing-x-mac/releases/latest"><b>Download</b></a>
  ·
  macOS 13+ · Apple Silicon and Intel
</p>

<p align="center">
  Made by <a href="https://yashraut.me"><b>Yash Raut</b></a> · open to new roles
</p>

<p align="center">
  <a href="https://buymeacoffee.com/yashraut362"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee" height="32"></a>
</p>

<p align="center">
  <a href="docs/media/demo.mp4">
    <img src="docs/media/demo.gif" width="860" alt="Nothing X Mac demo: battery, noise control, bass, equalizer, quick settings, dual connection and gestures">
  </a>
  <br>
  <sub>▶︎ <a href="docs/media/demo.mp4">Watch the full demo with sound</a> (38 s)</sub>
</p>

---

Nothing's companion app, Nothing X, only exists for phones. On a Mac, your
earbuds connect for audio, but you can't see their battery, switch noise
cancellation or change the EQ without picking up your phone.

**Nothing X Mac** puts those controls one click away in the menu bar, styled
like the AirPods menu so it feels at home on macOS. It talks to the earbuds
directly over Bluetooth, with no account and no internet connection.

## Features

- **Battery** for the left bud, right bud and case
- **Noise Control**: Noise Cancellation, Transparency or Off, with intensity
  (Low / Mid / High / Auto)
- **Bass Enhance** with a stepped level slider
- **Equalizer**: presets, plus a 3-band custom EQ with a live curve
- **Quick Settings**: In-Ear Detection, Low Latency, Personal Sound,
  Spatial Audio, Dual Connection and Find Buds
- **Controls**: click the left or right bud to change its tap gestures
- **Open at Login**, and a menu bar icon that follows light and dark mode

Each model only shows the features it supports.

## Install

1. Download the latest **.dmg** from [Releases](https://github.com/yashraut362/nothing-x-mac/releases/latest),
   open it and drag **Nothing X Mac** into **Applications**.
2. Open it once. The app isn't notarized by Apple, so macOS blocks it the first
   time: go to **System Settings → Privacy & Security** and click **Open Anyway**.
   (Or run `xattr -dr com.apple.quarantine "/Applications/Nothing X Mac.app"`.)
3. Allow **Bluetooth** access when asked.

Pair your earbuds in macOS Bluetooth settings first. The app lives in the menu
bar (no Dock icon); right-click its icon to quit or turn off Open at Login.

### Verify the download

Each release is scanned on VirusTotal. The SHA-256 in each link matches
`SHA256SUMS.txt` on the release, so you can check it's the same file.

| v0.1.0 | VirusTotal |
| --- | --- |
| `Nothing-X-Mac-0.1.0-universal.dmg` | [Scan report](https://www.virustotal.com/gui/file/17922dbf103660eb30e458da1f62b8491c149c5b51ebf27044ab2356ef869190) |
| `Nothing-X-Mac-0.1.0-universal.zip` | [Scan report](https://www.virustotal.com/gui/file/2489a7e9857c9c846e975bc3585a0946a56515a3869bb6181179a2ebb1351769) |

To check a file yourself: `shasum -a 256 Nothing-X-Mac-0.1.0-universal.dmg`

## Supported earbuds

Tested with **CMF Buds 2 Plus**. Other Nothing and CMF models (Ear, Ear (a),
Ear (2), Ear (3), CMF Buds, Buds 2, Buds Pro 2, Headphone (1) and more) use
per-model data from ear-web and should work, but haven't been tested yet.
Reports and fixes are welcome.

If the app keeps retrying to connect, close the Nothing X / CMF app on your
phone: the earbuds only let one app control them at a time.

## Development

```bash
npm install
npm start
```

`npm start` also builds the Swift Bluetooth helper (`native/NXBridge.swift`),
which needs Xcode's command line tools. macOS asks for Bluetooth permission on
first run.

Log every message to and from the earbuds:

```bash
NXM_DEBUG=1 npm start
```

### Build and release

```bash
npm run dist          # app for this Mac's chip -> dist/
npm run install-app   # build and copy to /Applications
npm run release       # universal app -> release/v<version>/ DMG, zip, checksums
npm run build:icon    # regenerate packaging/icon.icns from src/assets/logo.svg
```

Builds are ad-hoc signed, not notarized.

### Layout

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
scripts/                  Packaging, app icon and release builds
```

## About the author

Built by **Yash Raut**. I enjoy shipping polished, native-feeling apps end to
end, from Bluetooth protocols to UI design.

**I'm currently looking for my next role.** If you're hiring, or this project
was useful to you, I'd love to hear from you: **[yashraut.me](https://yashraut.me)**.

If Nothing X Mac saves you reaching for your phone, you can
[buy me a coffee](https://buymeacoffee.com/yashraut362) ☕. It keeps the updates coming.

<a href="https://buymeacoffee.com/yashraut362"><img src="https://img.shields.io/badge/Buy%20me%20a%20coffee-FFDD00?style=for-the-badge&logo=buymeacoffee&logoColor=black" alt="Buy me a coffee" height="32"></a>

## Credits

The earbud protocol and per-model data come from
[ear-web](https://github.com/radiance-project/ear-web) by the Radiance project.

Unofficial project, not affiliated with or endorsed by Nothing Technology
Limited. "Nothing" and "CMF" are their trademarks.
