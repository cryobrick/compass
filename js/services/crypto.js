/**
 * Crypto Service - Password-based encryption for wallet secrets
 * Uses Web Crypto API (PBKDF2 + AES-GCM) available in Firefox 48 / KaiOS 2.5
 */
var CryptoService = (function () {
  "use strict";

  var PBKDF2_ITERATIONS = 100000;
  var KEY_LENGTH = 256; // bits
  var IV_LENGTH = 12; // bytes for AES-GCM
  var SALT_LENGTH = 16; // bytes

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

  function bufferToBase64(buffer) {
    var arr = new Uint8Array(buffer);
    var binary = "";
    for (var i = 0; i < arr.length; i++) {
      binary += String.fromCharCode(arr[i]);
    }
    return btoa(binary);
  }

  function base64ToBuffer(base64) {
    var binary = atob(base64);
    var arr = new Uint8Array(binary.length);
    for (var i = 0; i < binary.length; i++) {
      arr[i] = binary.charCodeAt(i);
    }
    return arr.buffer;
  }

  function getCrypto() {
    var crypto = window.crypto || window.msCrypto;
    if (!crypto || !crypto.subtle) {
      throw new Error("Web Crypto API not available");
    }
    return crypto;
  }

  /**
   * Derive an AES-GCM key from password + salt using PBKDF2
   * @param {string} password
   * @param {ArrayBuffer} saltBuffer
   * @returns {Promise<CryptoKey>}
   */
  function deriveKey(password, saltBuffer) {
    var crypto = getCrypto();
    var encoder = new TextEncoder();
    var passwordBuffer = encoder.encode(password);

    return crypto.subtle
      .importKey("raw", passwordBuffer, { name: "PBKDF2" }, false, [
        "deriveKey",
      ])
      .then(function (baseKey) {
        return crypto.subtle.deriveKey(
          {
            name: "PBKDF2",
            salt: saltBuffer,
            iterations: PBKDF2_ITERATIONS,
            hash: "SHA-256",
          },
          baseKey,
          { name: "AES-GCM", length: KEY_LENGTH },
          false,
          ["encrypt", "decrypt"]
        );
      });
  }

  /**
   * Encrypt plaintext with a password
   * @param {string} plaintext - Text to encrypt
   * @param {string} password - User's password
   * @returns {Promise<{ciphertext: string, iv: string, salt: string}>}
   *   ciphertext is base64, iv and salt are hex
   */
  function encrypt(plaintext, password) {
    var crypto = getCrypto();

    var salt = new Uint8Array(SALT_LENGTH);
    crypto.getRandomValues(salt);

    var iv = new Uint8Array(IV_LENGTH);
    crypto.getRandomValues(iv);

    var encoder = new TextEncoder();
    var plaintextBuffer = encoder.encode(plaintext);

    return deriveKey(password, salt.buffer).then(function (key) {
      return crypto.subtle
        .encrypt({ name: "AES-GCM", iv: iv }, key, plaintextBuffer)
        .then(function (encryptedBuffer) {
          return {
            ciphertext: bufferToBase64(encryptedBuffer),
            iv: bufferToHex(iv.buffer),
            salt: bufferToHex(salt.buffer),
          };
        });
    });
  }

  /**
   * Decrypt ciphertext with a password
   * @param {string} ciphertextBase64 - Base64 encoded ciphertext
   * @param {string} ivHex - Hex encoded IV
   * @param {string} saltHex - Hex encoded salt
   * @param {string} password - User's password
   * @returns {Promise<string>} Decrypted plaintext
   */
  function decrypt(ciphertextBase64, ivHex, saltHex, password) {
    var crypto = getCrypto();

    var ciphertextBuffer = base64ToBuffer(ciphertextBase64);
    var ivBuffer = hexToBuffer(ivHex);
    var saltBuffer = hexToBuffer(saltHex);

    return deriveKey(password, saltBuffer).then(function (key) {
      return crypto.subtle
        .decrypt(
          { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
          key,
          ciphertextBuffer
        )
        .then(function (decryptedBuffer) {
          var decoder = new TextDecoder();
          return decoder.decode(decryptedBuffer);
        });
    });
  }

  /**
   * Validate password meets requirements:
   * - Minimum 12 characters
   * - Contains at least one letter
   * - Contains at least one number
   * - Contains at least one symbol
   * @param {string} password
   * @returns {{valid: boolean, error: string|null}}
   */
  function validatePassword(password) {
    if (!password || typeof password !== "string") {
      return { valid: false, error: "Password is required" };
    }

    if (password.length < 12) {
      return {
        valid: false,
        error: "Password must be at least 12 characters",
      };
    }

    var hasLetter = false;
    var hasNumber = false;
    var hasSymbol = false;

    for (var i = 0; i < password.length; i++) {
      var c = password[i];
      if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
        hasLetter = true;
      } else if (c >= "0" && c <= "9") {
        hasNumber = true;
      } else {
        hasSymbol = true;
      }
    }

    if (!hasLetter) {
      return {
        valid: false,
        error: "Password must contain at least one letter",
      };
    }

    if (!hasNumber) {
      return {
        valid: false,
        error: "Password must contain at least one number",
      };
    }

    if (!hasSymbol) {
      return {
        valid: false,
        error: "Password must contain at least one symbol",
      };
    }

    return { valid: true, error: null };
  }

  return {
    encrypt: encrypt,
    decrypt: decrypt,
    validatePassword: validatePassword,
  };
})();
