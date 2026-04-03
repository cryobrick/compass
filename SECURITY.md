# Security

## How Compass Protects Your Bitcoin

### Air-Gapped Design

Compass runs on KaiOS feature phones with no internet connection. Private keys never leave your device. Transactions are signed offline and exported as hex for external broadcast.

### Encryption

- **Mnemonic encryption:** AES-256-GCM with PBKDF2-SHA256 key derivation (100,000 iterations)
- **Random salt:** 16 bytes, cryptographically generated
- **Random IV:** 12 bytes per encryption operation
- Your mnemonic is never stored in plaintext

### PIN

The 6-digit PIN is a UI convenience gate, not a cryptographic barrier. It is hashed with SHA-256 + random salt. The real protection for your wallet is your password.

### Memory Handling

- Decrypted mnemonics are cleared from memory after use
- The DOM is scrubbed when leaving sensitive screens
- No sensitive data is logged to console

### Key Derivation

BIP84 Native SegWit: `m/84'/0'/0'/{change}/{index}` — standard, interoperable with major wallets.

## Known Limitations

- **localStorage:** Wallet data is stored in the browser's localStorage. Anyone with physical access to the device and developer tools could read the encrypted blob (but not decrypt it without your password).
- **PBKDF2 iterations:** 100,000 iterations is the OWASP 2015 minimum. Higher values (600k+) are recommended for modern hardware, but KaiOS device CPUs cannot handle more without unacceptable delays.
- **No secure element:** KaiOS 2.5 devices do not provide hardware-backed key storage.
- **Single wallet:** Only one wallet per device is supported.

## Your Password is Critical

- Use 16+ random characters for strong protection
- Minimum enforced: 12 characters with at least one letter, number, and symbol
- There is no password recovery — if you lose your password, you need your mnemonic backup
