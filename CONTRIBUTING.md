# Contributing to Compass

Thanks for your interest in contributing to Compass, an air-gapped Bitcoin wallet for KaiOS feature phones.

## Getting Started

### Prerequisites

- Node.js (for building library bundles)
- A browser (for basic testing) or a KaiOS device/simulator

### Setup

```bash
# Install bundle dependencies from the project root (parent of compass/)
npm install bip39@2.5.0 buffer esbuild stream-browserify
npm install bip32@1.0.2 bitcoinjs-lib@3.3.2 crypto-browserify
npm install qrcode-generator

# Build library bundles
cd compass
./bundle-bip39.sh
./bundle-address.sh
./bundle-qrcode.sh
```

### Testing

There is no automated test suite. Testing is manual:

- **Browser:** Open `index.html` directly. Use arrow keys, Enter, Escape, Q (Soft Left), E (Soft Right).
- **Simulator:** Run `python3 -m http.server 8080` and open `http://localhost:8080/simulator.html`.
- **Device:** Build with `./build.sh` and install the zip via OmniSD. See [DEBUGGING_KAIOS.md](DEBUGGING_KAIOS.md) for remote debugging.

## Platform Constraints

These are non-negotiable — all contributions must respect them:

- **ES2015 only** — KaiOS 2.5 runs Firefox 48. No async/await, no optional chaining, no nullish coalescing.
- **No frameworks** — Pure vanilla JavaScript. No React, no jQuery, nothing.
- **240x320px screen** — All UI must fit a KaiOS feature phone display.
- **D-pad navigation** — No touch events. Everything must be navigable with Up/Down/Enter/Escape and soft keys.
- **Library versions are pinned** — `bip39@2.5.0`, `bip32@1.0.2`, `bitcoinjs-lib@3.3.2`. Do not upgrade without verifying Firefox 48 compatibility on a real device.

## Code Style

- Use `var` or `function()` declarations (avoid arrow functions in edge cases for Firefox 48 safety)
- Follow the existing IIFE module pattern for services
- Follow the existing screen object pattern (id, render, onEnter, onExit, handleBack)
- Keep code simple — no premature abstractions

## Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b my-feature`)
3. Test on browser at minimum; device testing is strongly preferred
4. Submit a pull request with a clear description of what and why

## Security Vulnerabilities

**Do not open GitHub issues for security bugs.** See [SECURITY.md](SECURITY.md) for responsible disclosure instructions.

## License

By contributing, you agree that your contributions will be licensed under the [GNU GPL v3](LICENSE).
