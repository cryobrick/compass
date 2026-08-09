# Security

## Reporting a Vulnerability

**Do not open public GitHub issues for security bugs.**

Report vulnerabilities privately via [GitHub Security Advisories](https://github.com/cryobrick/compass/security/advisories/new). Include steps to reproduce, the affected version, and impact. You will get an acknowledgment as soon as possible, and a fix will be prioritized based on severity. Please give us reasonable time to release a fix before public disclosure.

## Supported Versions

Only the latest release receives security fixes.

| Version | Supported |
| ------- | --------- |
| 1.1.x   | ✅        |
| < 1.1   | ❌        |

## How Compass Protects Your Bitcoin

### Air-Gapped Design

Compass runs on KaiOS feature phones with no internet connection. Private keys never leave your device. Transactions come in as PSBT files (binary `.psbt` or base64 `.txt`, e.g. from Sparrow) via the SD card, are reviewed and signed offline, and leave the device only as final transaction hex — public data that is meant to be broadcast.

The app manifest requests a single permission: **read-only SD card access** (to import PSBT files). No network, camera, or other permissions are requested.

### Plausible Deniability

The app presents itself as "Offline Maps & Bookmarks" and opens to a compass screen. The wallet is only reachable after PIN unlock. This deters casual inspection of the phone — but see [Known Limitations](#known-limitations): anyone who can read the app's storage can tell a wallet is present.

### Encryption

- **Mnemonic encryption:** AES-256-GCM with PBKDF2-SHA256 key derivation (100,000 iterations)
- **Random salt:** 16 bytes, cryptographically generated
- **Random IV:** 12 bytes per encryption operation
- Your mnemonic is never stored in plaintext

Full details, storage format, and standards references: [SEED_ENCRYPTION.md](SEED_ENCRYPTION.md).

### PIN

The 6-digit PIN is a UI convenience gate, not a cryptographic barrier. It is hashed with SHA-256 + random salt, so the PIN itself is never stored — but a 6-digit space is trivially brute-forceable offline, and there is no rate limiting or wipe-after-N-failures. The PIN's job is to stop casual access and keep the disguise; the real protection for your wallet is your password. Details: [PIN_SECURITY.md](PIN_SECURITY.md).

### Transaction Review

Before signing, the PSBT is parsed and displayed for review — inputs, outputs, amounts, and fee — so a compromised online (watch-only) wallet cannot silently redirect funds. Always verify the destination address and amount on the Compass screen before signing.

### Memory Handling

- Decrypted mnemonics and passwords are discarded (references nulled) as soon as they are no longer needed
- The DOM is scrubbed when leaving sensitive screens (seed backup, signing)
- No secrets (mnemonic, private keys, passwords) are logged to console

Note that JavaScript provides no secure-wipe primitive — see Known Limitations.

### Key Derivation

BIP84 Native SegWit: `m/84'/0'/0'/{change}/{index}` — standard, interoperable with major wallets.

## Known Limitations

- **localStorage:** Wallet data is stored in the browser's localStorage. Anyone with physical access to the device and developer tools could read the encrypted blob (but not decrypt it without your password).
- **zpub stored in plaintext:** The extended public key is kept unencrypted so the app can show addresses and QR codes without asking for your password. A zpub cannot spend funds, but anyone who reads the app's storage can derive **all of your addresses**, watch your balance and full transaction history, and confirm the device holds a Bitcoin wallet — defeating the "Offline Maps" disguise against a technical attacker.
- **PIN is not a security barrier:** Single-round SHA-256 over a 1,000,000-combination space is crackable in seconds offline, and the app enforces no attempt limit. Treat it purely as a screen lock.
- **PBKDF2 iterations:** 100,000 iterations is the OWASP 2015 minimum. Higher values (600k+) are recommended for modern hardware, but KaiOS device CPUs cannot handle more without unacceptable delays. Memory-hard KDFs (Argon2) are not available in Firefox 48's Web Crypto.
- **No secure memory wipe:** JavaScript strings are immutable and garbage-collected; the app nulls references to secrets, but cannot guarantee the underlying memory is zeroed.
- **No secure element:** KaiOS 2.5 devices do not provide hardware-backed key storage. Security relies on the math (PBKDF2 + AES-256-GCM), which holds if your password has enough entropy.
- **Pinned legacy libraries:** bip39@2.5.0, bip32@1.0.2, and bitcoinjs-lib@3.3.2 are pinned for Firefox 48 compatibility and predate current releases. The air gap limits their exposure, but they do not receive upstream fixes. Do not upgrade without testing on KaiOS.
- **Single wallet:** Only one wallet per device is supported.

## Your Password is Critical

- Use 16+ random characters for strong protection
- Minimum enforced: 12 characters with at least one letter, number, and symbol
- There is no password recovery — if you lose your password, you need your mnemonic backup
- A weak or dictionary-based password (e.g. `MyBitcoin123!`) can be brute-forced by an attacker who obtains the encrypted blob; a random 16+ character password is effectively uncrackable

See [security-analysis.txt](security-analysis.txt) for an honest cost analysis of attacks against the PIN and password layers.
