// entry-address.js - BIP32 + bitcoinjs-lib for Native SegWit address generation
// Using bip32@1.0.2 and bitcoinjs-lib@3.3.2 for Firefox 48 compatibility

// Polyfill process using process package
var process = require("process");
if (typeof window !== "undefined") {
  window.process = process;
}
if (typeof global !== "undefined") {
  global.process = process;
}

// Polyfill Buffer
var Buffer = require("buffer").Buffer;
if (typeof window !== "undefined") {
  window.Buffer = Buffer;
}

// Initialize loading state
window.addressLibsLoaded = false;
window.addressLibsError = "Not initialized";

try {
  // Load bip32 for HD key derivation
  var bip32 = require("bip32");
  window.addressLibsError = "bip32 loaded...";

  // Load bitcoinjs-lib for address generation
  var bitcoin = require("bitcoinjs-lib");
  window.addressLibsError = "bitcoinjs-lib loaded...";

  // Expose to global scope
  window.bip32 = bip32;
  window.bitcoin = bitcoin;
  window.addressLibsLoaded = true;
  window.addressLibsError = null;

  console.log("Address libraries (BIP32 + bitcoinjs-lib) loaded successfully");
} catch (e) {
  window.addressLibsLoaded = false;
  window.addressLibsError = e.message + " | Stack: " + (e.stack || "no stack");
  console.error("Address libraries failed to load:", e);
}
