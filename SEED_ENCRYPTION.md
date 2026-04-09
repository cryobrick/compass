# Seed Phrase Encryption

Compass encrypts the BIP39 mnemonic (seed phrase) at rest using **PBKDF2 + AES-256-GCM** via the [Web Crypto API](https://www.w3.org/TR/WebCryptoAPI/). The mnemonic is never stored in plaintext.

## Cryptographic Primitives

| Component      | Algorithm / Parameter                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Key derivation | [PBKDF2](https://datatracker.ietf.org/doc/html/rfc8018#section-5.2) with [SHA-256](https://csrc.nist.gov/pubs/fips/180-4/upd1/final) |
| KDF iterations | 100,000 ([NIST SP 800-132](https://csrc.nist.gov/pubs/sp/800/132/final))                                                             |
| Encryption     | [AES-GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final) with 256-bit key                                                             |
| IV             | 12 bytes, cryptographically random                                                                                                   |
| Salt           | 16 bytes, cryptographically random                                                                                                   |

## Password Requirements

The user must set a password that meets all of the following:

- Minimum **12 characters**
- Contains at least one **letter**
- Contains at least one **number**
- Contains at least one **symbol**

The password is entered twice (set + confirm) before encryption proceeds.

## Encryption Flow

1. User creates or restores a wallet — the mnemonic is held temporarily in memory.
2. User sets a password (validated against requirements, then confirmed).
3. The **zpub** (extended public key) is derived from the mnemonic and stored in plaintext for read-only operations (address generation, export).
4. Encryption via `CryptoService.encrypt(mnemonic, password)`:
   - Generate a random **16-byte salt**
   - Generate a random **12-byte IV**
   - Import the password as raw key material ([SubtleCrypto.importKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey))
   - Derive an AES-GCM key: `PBKDF2(password, salt, 100000, SHA-256)` ([SubtleCrypto.deriveKey](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey))
   - Encrypt: `AES-GCM(iv, key, mnemonic)` → ciphertext ([SubtleCrypto.encrypt](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt))
5. The temporary in-memory mnemonic is cleared.

## Storage Format

Stored in `localStorage` under the key `compass_wallet`:

```json
{
  "encryptedMnemonic": "<base64 ciphertext>",
  "iv": "<hex-encoded IV>",
  "salt": "<hex-encoded salt>",
  "zpub": "<plaintext zpub for read-only operations>",
  "createdAt": "<ISO 8601 timestamp>"
}
```

## Decryption Flow

When the user needs to sign a transaction:

1. Read `encryptedMnemonic`, `iv`, and `salt` from localStorage.
2. Decrypt via `CryptoService.decrypt(ciphertext, iv, salt, password)`:
   - Re-derive the AES-GCM key: `PBKDF2(password, salt, 100000, SHA-256)`
   - Decrypt: `AES-GCM(iv, key, ciphertext)` → plaintext mnemonic
3. The mnemonic is used for signing and then discarded from memory.

## Why zpub is Stored in Plaintext

The zpub is an **extended public key** — it can derive receive/change addresses but cannot spend funds. Storing it unencrypted allows the app to show addresses and generate QR codes without requiring the password for every read-only operation.

## References

### Cryptographic Standards

- [RFC 8018 — PKCS #5 v2.1 (PBKDF2)](https://datatracker.ietf.org/doc/html/rfc8018#section-5.2)
- [NIST SP 800-38D — AES-GCM](https://csrc.nist.gov/pubs/sp/800/38/d/final)
- [NIST SP 800-132 — Password-Based Key Derivation](https://csrc.nist.gov/pubs/sp/800/132/final)
- [FIPS 180-4 — SHA-256](https://csrc.nist.gov/pubs/fips/180-4/upd1/final)

### Web Crypto API

- [W3C Web Cryptography API Specification](https://www.w3.org/TR/WebCryptoAPI/)
- [MDN: SubtleCrypto.deriveKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/deriveKey)
- [MDN: SubtleCrypto.encrypt()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/encrypt)
- [MDN: SubtleCrypto.importKey()](https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto/importKey)
- [MDN: Crypto.getRandomValues()](https://developer.mozilla.org/en-US/docs/Web/API/Crypto/getRandomValues)

### Libraries

- [bip39 v2.5.0](https://www.npmjs.com/package/bip39/v/2.5.0)
- [bip32 v1.0.2](https://www.npmjs.com/package/bip32/v/1.0.2)
- [bitcoinjs-lib v3.3.2](https://www.npmjs.com/package/bitcoinjs-lib/v/3.3.2)
