// entry-bip39.js - Minimal BIP39 bundle for mnemonic generation only
// Using bip39@2.5.0 for Firefox 48 compatibility

// Polyfill Buffer first
var Buffer = require("buffer").Buffer;
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// Load bip39
var bip39 = require("bip39");

// Expose to global scope
window.bip39 = bip39;
window.bip39Loaded = true;

console.log("BIP39 library loaded successfully");
