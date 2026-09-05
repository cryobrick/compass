# Changelog

All notable changes to this project will be documented in this file.

## [1.2.0] - Dice roll seed generation

- New "Create with Dice" option on the Welcome screen: generate the 12-word seed from at least 50 real dice rolls instead of device RNG (`js/screens/dice-roll.js`). Coldcard-compatible algorithm — entropy is SHA-256 of the ASCII roll string, first 16 bytes — so the resulting words can be cross-verified with Coldcard's dice tooling
- Roll entry UI: keys 1-6 add rolls, Backspace/right softkey deletes the last roll, live counter + progress bar + recent-roll strip; capped at 150 rolls; auto-repeat from held keys is ignored
- The generated words reuse the existing Create Wallet review/confirm flow (new `presetMnemonic` handoff in `js/screens/create-wallet.js`)

## [1.1.2] - Firefox 48 SyntaxError fix (the original white-screen root cause)

- Fix `SyntaxError: expected expression, got ')'` in `js/screens/home.js:113` on KaiOS devices: a trailing comma in a function call argument list (ES2017 syntax) made Firefox 48 fail to parse the whole file, so `HomeScreen` was never defined and startup died. Present since the first commit — this was the root cause of the white screen on real devices; desktop browsers and Node accept the syntax, which is why it never reproduced in testing. Surfaced by the v1.1.1 boot error overlay.
- Add `check-es2015.js` build gate: every shipped non-bundle JS file is parsed strictly as ES2015 (acorn, from the parent `node_modules` — `npm install acorn` there once) and the build fails on anything newer, so this class of bug can't ship again

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
