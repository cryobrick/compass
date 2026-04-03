# Compass

Air-gapped Bitcoin wallet for KaiOS feature phones.

**License:** [GNU GPL v3](LICENSE)

## Development

### Debugging on Physical Device

**Important:** To view console logs on a physical KaiOS device, you need to use **WebIDE** or **ADB**. See [DEBUGGING_KAIOS.md](DEBUGGING_KAIOS.md) for detailed instructions.

**Quick Start:**

1. Enable **Developer Mode** and **Remote Debugging** on your device
2. Connect device via USB (use **"File Transfer"** mode, NOT "USB Storage")
3. Open Firefox → `Shift + F8` → WebIDE → Select your device
4. View console logs in real-time!

### Test in Browser

Simply open `index.html` in a browser. Use keyboard for navigation:

| Key     | Action        |
| ------- | ------------- |
| `↑` `↓` | Navigate menu |
| `Enter` | Select        |
| `Esc`   | Back          |
| `Q`     | Soft Left     |
| `E`     | Soft Right    |

### Test with KaiOS Simulator

1. Start a local server:

   ```bash
   cd compass
   python3 -m http.server 8080
   ```

2. Open the simulator:
   ```
   http://localhost:8080/simulator.html
   ```

## Incremental Development

We're building this step-by-step, adding features incrementally.

### Current Status

- ✅ **Step 1: BIP39 Mnemonic Generation**
  - Generate 12-word mnemonic
  - Display mnemonic words
  - Navigate through words
  - Save mnemonic to localStorage

- ✅ **Step 2: Native SegWit Address Generation (BIP84)**
  - BIP32 HD key derivation
  - Generate Native SegWit addresses (bc1...)
  - Address Explorer screen with QR code display
  - Navigate through addresses with "Change Address" button

- ✅ **Step 3: Export XPUB (zpub format)**
  - Export BIP84 account-level extended public key
  - Automatically converts to `zpub` format for BIP84 compatibility
  - Display QR code and text for easy import into watch-only wallets
  - Uses `xpub-converter` library for safe conversion

- ✅ **Step 4: PSBT Signing (Partially Signed Bitcoin Transactions)**
  - Parse base64 PSBT (file import or paste)
  - Transaction review with inputs, outputs, amounts, and fees
  - Sign PSBTs with wallet private keys (BIP84 Native SegWit)
  - Extract and display **transaction hex** for broadcast (not signed PSBT QR)
  - Uses only `bitcoinjs-lib` (from address bundle) and built-in `psbt-alternative.js`; no external PSBT bundles

- ✅ **Step 5: Restore wallet from mnemonic**
  - Enter 12-word BIP39 mnemonic to restore an existing wallet
  - Validation and save to localStorage

### Next Steps

- 🚧 QR code scanning via camera (optional; base64/file import works today)

## Library Bundles

We use separate bundles for different features to keep things modular.

### BIP39 Bundle (Mnemonic Generation)

| Library | Version | Purpose                   |
| ------- | ------- | ------------------------- |
| `bip39` | 2.5.0   | BIP39 mnemonic generation |

**Bundle:** `js/lib/bip39-bundle.js` (~909KB uncompressed)

### Address Bundle (BIP32 + bitcoinjs-lib)

| Library         | Version | Purpose                          |
| --------------- | ------- | -------------------------------- |
| `bip32`         | 1.0.2   | HD key derivation (BIP32/BIP84)  |
| `bitcoinjs-lib` | 3.3.2   | Native SegWit address generation |

**Bundle:** `js/lib/address-bundle.js` (~1.4MB uncompressed)

**Note:** For BIP84 Native SegWit, we export the extended public key in `zpub` format (not `xpub`). This is achieved by using SLIP-132 network parameters directly in the `bip32` library, which generates `zpub` natively without any conversion step.

### QR Code Bundle

| Library            | Version | Purpose            |
| ------------------ | ------- | ------------------ |
| `qrcode-generator` | 2.0.4   | QR code generation |

**Bundle:** `js/lib/qrcode-bundle.js` (~60KB uncompressed)

### PSBT (no bundle)

PSBT signing does **not** use a separate bundle. It uses:

- **bitcoinjs-lib** (from the address bundle) for key derivation and signing
- **psbt-alternative.js** (in `js/services/`) for base64 PSBT parse, sign, serialize, and **extract transaction hex** for broadcast

There is no `psbt-bundle.js`; the app uses this minimal implementation for Firefox 48 (KaiOS 2.5) compatibility.

These library versions are required for Firefox 48 (KaiOS 2.5) compatibility.

### Installing Dependencies

From the **monorepo root** or from `compass/` if you add a local `package.json`:

```bash
# BIP39 dependencies
npm install bip39@2.5.0 buffer esbuild stream-browserify

# Address generation dependencies
npm install bip32@1.0.2 bitcoinjs-lib@3.3.2 crypto-browserify

# QR code dependencies
npm install qrcode-generator
```

(PSBT does not require extra npm packages; it uses the address bundle and `psbt-alternative.js`.)

### Rebuilding Bundles

From `compass/`:

```bash
./bundle-bip39.sh
./bundle-address.sh
./bundle-qrcode.sh
```

All bundles target ES2015 for Firefox 48 compatibility.

## Build for KaiOS

Version is defined in `build.sh` (`VERSION="0.1.1"`). Update it there (and optionally in `manifest.webapp`) for releases.

```bash
cd compass
./build.sh
```

**Output:** `dist/compass-v{VERSION}.zip` (OmniSD-compatible). The zip contains only app files (index.html, manifest, css, js, icons); the simulator and docs are not included.

## Install on Device

1. Copy `dist/compass-vX.X.X.zip` to your KaiOS device
2. Open OmniSD
3. Select and install the zip file

## Project Structure

**Build & bundle scripts (root):** `build.sh`, `bundle-bip39.sh`, `bundle-address.sh`, `bundle-qrcode.sh`  
**Entry points for bundles:** `entry-bip39.js`, `entry-address.js`, `entry-qrcode.js`  
**App entry:** `index.html`, `manifest.webapp`, `process-shim.js`  
**Docs:** `README.md`, `CHANGELOG.md`, `DEBUGGING_KAIOS.md`, `UR_QR_CODE_EXPLANATION.md`

```
compass/
├── index.html              # Main HTML
├── manifest.webapp         # KaiOS app manifest
├── build.sh                # Build script for OmniSD (VERSION in here)
├── bundle-bip39.sh         # BIP39 bundler
├── bundle-address.sh       # Address libraries bundler
├── bundle-qrcode.sh        # QR code bundler
├── entry-bip39.js          # BIP39 bundle entry point
├── entry-address.js        # Address bundle entry point
├── entry-qrcode.js         # QR code bundle entry point
├── process-shim.js         # Process polyfill for browser
├── LICENSE
├── CHANGELOG.md
├── css/
│   └── style.css           # KaiOS-optimized styles (240x320)
├── js/
│   ├── navigation.js      # D-pad navigation handler
│   ├── app.js              # Main application logic
│   ├── services/
│   │   ├── crypto.js       # PBKDF2 + AES-256-GCM encryption
│   │   ├── wallet.js       # Wallet service (storage + address generation)
│   │   ├── pin.js          # PIN hashing and verification
│   │   └── psbt-alternative.js  # PSBT parse/sign/serialize + extract tx hex
│   ├── screens/
│   │   ├── splash.js       # Splash screen
│   │   ├── compass.js      # Plausible deniability screen
│   │   ├── welcome.js      # Main menu (Create/Restore)
│   │   ├── create-wallet.js    # Generate & display mnemonic
│   │   ├── restore-wallet.js   # Restore from 12-word mnemonic
│   │   ├── home.js         # Main wallet menu
│   │   ├── address-explorer.js # Address display with QR code (BIP84)
│   │   ├── export-xpub.js   # Export zpub with QR code
│   │   └── ready-to-sign.js    # PSBT signing screen
│   └── lib/
│       ├── bip39-bundle.js   # BIP39 library (~909KB)
│       ├── address-bundle.js # BIP32 + bitcoinjs-lib (~1.4MB)
│       └── qrcode-bundle.js  # QR code generator (~60KB)
├── icons/
│   ├── compass-56.png
│   └── compass-112.png
└── dist/                    # Build output (generated; in .gitignore)
```

## KaiOS Compatibility

- **Target Browser**: Firefox 48 (KaiOS 2.5)
- **ES Target**: ES2015 (ES6)
- **Screen Size**: 240x320 pixels
- **Polyfills**: Buffer, process, stream, crypto

## Plausible Deniability

The app appears as "Offline Maps & Bookmarks" externally.

## Wallet Features

- ✅ Generate 12-word BIP39 mnemonic
- ✅ Save mnemonic to localStorage
- ✅ Restore wallet from 12-word mnemonic
- ✅ BIP84 Native SegWit addresses (bc1...)
- ✅ Address Explorer with QR code display
- ✅ Navigate through addresses incrementally
- ✅ Export xpub with QR code (zpub format)
- ✅ PSBT signing: base64/file import → review → sign → **transaction hex** for broadcast
- 🚧 QR code scanning via camera (optional; file/paste works today)

## PSBT Signing Workflow

Compass signs Partially Signed Bitcoin Transactions (PSBTs) from watch-only wallets like Blue Wallet in an air-gapped way.

### Workflow Steps

1. **Export zpub** – Export Compass's `zpub` from "Export XPUB"
2. **Import to Blue Wallet** – Add the `zpub` in Blue Wallet (watch-only)
3. **Create Transaction** – Create a send in Blue Wallet and export as PSBT (base64 or file)
4. **Load PSBT in Compass** – "Ready To Sign" → import PSBT file or paste base64
5. **Review** – Compass shows inputs, outputs, amounts, fees
6. **Sign** – Confirm; Compass signs with your keys
7. **Get transaction hex** – Compass shows the **final transaction hex** (not signed PSBT)
8. **Broadcast** – Copy the hex and broadcast from Blue Wallet or any node/explorer

### PSBT Input

- **Base64 PSBT** – Paste in the "Ready To Sign" screen or import a `.psbt` file (base64 content)
- **No camera** – QR scanning is not implemented; file import and paste are supported

### Technical Details

- **Signing**: BIP143 (Native SegWit, P2WPKH)
- **Key derivation**: `bitcoinjs-lib` v3.3.2 (from address bundle); derivation path BIP84 (`m/84'/0'/0'/{change}/{index}`)
- **Implementation**: `psbt-alternative.js` (parse/sign/serialize + `extractTransaction()` for broadcast hex)
- **Network**: Bitcoin mainnet

### Limitations

- **Single wallet** – Only signs PSBTs for the same wallet (same mnemonic)
- **Native SegWit only** – P2WPKH inputs/outputs
- **No UR/multi-part** – Base64 or file only; no camera QR
