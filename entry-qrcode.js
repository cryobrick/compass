// entry-qrcode.js - QR Code generator for browser
// Using qrcode-generator for KaiOS compatibility

var qrcode = require("qrcode-generator");

// Expose globally
window.qrcode = qrcode;
window.qrcodeLoaded = true;

console.log("QR code library loaded successfully");
