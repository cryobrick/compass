# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - White screen on launch fix

- Fix blank white screen on launch on low-memory devices (JioPhone): library bundles (~2.4MB) are no longer loaded synchronously before first render — they are lazy-loaded in the background after the first screen paints (`js/services/lib-loader.js`)
- Add boot diagnostics (`js/boot.js`): startup errors now render a readable on-screen message instead of a silent white screen; static "Loading…" indicator with a 15s watchdog
- Harden startup: `App.init()` wrapped in try/catch; broken localStorage shows a "Storage unavailable" error instead of silently dying
- Screens that need a library show "Loading libraries…"/"Preparing…" and retry automatically once loaded
- manifest.webapp: sync version with build (was stuck at 0.1.0), remove unused certified-only `camera` and `video-capture` permissions (QR scanning was never implemented), `fullscreen` as boolean
- build.sh: fail the build if any library bundle is missing/truncated (js/lib is gitignored — fresh clones would previously ship a broken zip) or if manifest version mismatches

## [0.1.1] - Initial open source release

- BIP39 mnemonic generation and display
- BIP84 Native SegWit address generation (bc1...)
- Address Explorer with QR code
- Export XPUB (zpub format) with QR code
- PSBT signing via base64/file import: parse, review, sign, extract transaction hex for broadcast
- Restore wallet from 12-word mnemonic
- KaiOS 2.5 (Firefox 48) compatible; OmniSD build
