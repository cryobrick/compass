/**
 * PIN Service - 6-digit security PIN with salt + SHA-256 hash
 * Does not store the PIN; stores salt and hash in localStorage.
 */
var PinService = (function () {
  "use strict";

  var SALT_KEY = "compass_pin_salt";
  var HASH_KEY = "compass_pin_hash";
  var PIN_LENGTH = 6;

  function bufferToHex(buffer) {
    var arr = new Uint8Array(buffer);
    var hex = "";
    for (var i = 0; i < arr.length; i++) {
      var h = arr[i].toString(16);
      hex += h.length === 1 ? "0" + h : h;
    }
    return hex;
  }

  function hexToBuffer(hex) {
    var len = hex.length / 2;
    var arr = new Uint8Array(len);
    for (var i = 0; i < len; i++) {
      arr[i] = parseInt(hex.substr(i * 2, 2), 16);
    }
    return arr.buffer;
  }

  function isValidPin(pinPlain) {
    if (typeof pinPlain !== "string" || pinPlain.length !== PIN_LENGTH) {
      return false;
    }
    for (var i = 0; i < PIN_LENGTH; i++) {
      var c = pinPlain[i];
      if (c < "0" || c > "9") return false;
    }
    return true;
  }

  /**
   * Check if a PIN has been set (salt and hash exist in storage).
   * @returns {boolean}
   */
  function hasPinSet() {
    var salt = localStorage.getItem(SALT_KEY);
    var hash = localStorage.getItem(HASH_KEY);
    return !!(salt && hash && salt.length > 0 && hash.length > 0);
  }

  /**
   * Hash PIN with salt using SHA-256.
   * @param {ArrayBuffer} saltBuffer
   * @param {string} pinPlain
   * @returns {Promise<ArrayBuffer>} digest
   */
  function hashPin(saltBuffer, pinPlain) {
    var crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.subtle) {
      return Promise.reject(new Error("Web Crypto not available"));
    }
    var encoder = new TextEncoder();
    var pinBytes = encoder.encode(pinPlain);
    var saltArr = new Uint8Array(saltBuffer);
    var combined = new Uint8Array(saltArr.length + pinBytes.length);
    combined.set(saltArr, 0);
    combined.set(pinBytes, saltArr.length);
    return crypto.subtle.digest("SHA-256", combined);
  }

  /**
   * Set the user's PIN (store salt + hash only).
   * @param {string} pinPlain - Exactly 6 digits
   * @returns {Promise<void>}
   */
  function setPin(pinPlain) {
    if (!isValidPin(pinPlain)) {
      return Promise.reject(
        new Error("PIN must be exactly 6 digits (numbers only)")
      );
    }
    var crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.getRandomValues) {
      return Promise.reject(new Error("Random source not available"));
    }
    var salt = new Uint8Array(16);
    crypto.getRandomValues(salt);
    return hashPin(salt.buffer, pinPlain).then(function (hashBuffer) {
      localStorage.setItem(SALT_KEY, bufferToHex(salt.buffer));
      localStorage.setItem(HASH_KEY, bufferToHex(hashBuffer));
    });
  }

  /**
   * Verify the user's PIN against stored salt + hash.
   * @param {string} pinPlain
   * @returns {Promise<boolean>}
   */
  function verifyPin(pinPlain) {
    if (!hasPinSet()) {
      return Promise.resolve(false);
    }
    var saltHex = localStorage.getItem(SALT_KEY);
    var hashHex = localStorage.getItem(HASH_KEY);
    if (!saltHex || !hashHex) {
      return Promise.resolve(false);
    }
    var saltBuffer = hexToBuffer(saltHex);
    return hashPin(saltBuffer, pinPlain).then(function (computedHashBuffer) {
      var computedHex = bufferToHex(computedHashBuffer);
      return computedHex === hashHex;
    });
  }

  return {
    hasPinSet: hasPinSet,
    setPin: setPin,
    verifyPin: verifyPin,
    PIN_LENGTH: PIN_LENGTH,
  };
})();
