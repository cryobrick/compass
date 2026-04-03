/**
 * Alternative PSBT Service - Uses ONLY bitcoinjs-lib (already loaded)
 * No external PSBT libraries needed - works with Firefox 48
 *
 * Supports:
 * - Base64 PSBT parsing (manual implementation)
 * - PSBT signing using bitcoinjs-lib
 * - PSBT serialization
 *
 * Does NOT support (for now):
 * - UR format (can be added later if needed)
 * - QR code scanning (can use file import instead)
 *
 * This is a minimal implementation that only handles what we need for signing.
 */

var PSBTServiceAlternative = (function () {
  "use strict";

  /**
   * Check if bitcoinjs-lib is loaded (required)
   */
  /**
   * Minimal bech32m encoder for P2TR (Taproot) addresses.
   * bitcoinjs-lib v3.3.2 predates Taproot, so we handle it manually.
   */
  var BECH32M_CONST = 0x2bc830a3;
  var BECH32_CHARSET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

  function bech32mPolymod(values) {
    var GEN = [0x3b6a57b2, 0x26508e6d, 0x1ea119fa, 0x3d4233dd, 0x2a1462b3];
    var chk = 1;
    for (var i = 0; i < values.length; i++) {
      var top = chk >> 25;
      chk = ((chk & 0x1ffffff) << 5) ^ values[i];
      for (var j = 0; j < 5; j++) {
        if ((top >> j) & 1) {
          chk ^= GEN[j];
        }
      }
    }
    return chk;
  }

  function bech32mHrpExpand(hrp) {
    var ret = [];
    for (var i = 0; i < hrp.length; i++) {
      ret.push(hrp.charCodeAt(i) >> 5);
    }
    ret.push(0);
    for (var i = 0; i < hrp.length; i++) {
      ret.push(hrp.charCodeAt(i) & 31);
    }
    return ret;
  }

  function bech32mCreateChecksum(hrp, data) {
    var values = bech32mHrpExpand(hrp).concat(data).concat([0, 0, 0, 0, 0, 0]);
    var polymod = bech32mPolymod(values) ^ BECH32M_CONST;
    var ret = [];
    for (var i = 0; i < 6; i++) {
      ret.push((polymod >> (5 * (5 - i))) & 31);
    }
    return ret;
  }

  function convertBits8to5(data) {
    var result = [];
    var acc = 0;
    var bits = 0;
    for (var i = 0; i < data.length; i++) {
      acc = (acc << 8) | data[i];
      bits += 8;
      while (bits >= 5) {
        bits -= 5;
        result.push((acc >> bits) & 31);
      }
    }
    if (bits > 0) {
      result.push((acc << (5 - bits)) & 31);
    }
    return result;
  }

  function encodeBech32m(hrp, witnessVersion, data) {
    var words = [witnessVersion].concat(convertBits8to5(data));
    var checksum = bech32mCreateChecksum(hrp, words);
    var encoded = hrp + '1';
    for (var i = 0; i < words.length; i++) {
      encoded += BECH32_CHARSET[words[i]];
    }
    for (var i = 0; i < checksum.length; i++) {
      encoded += BECH32_CHARSET[checksum[i]];
    }
    return encoded;
  }

  function checkBitcoinLib() {
    if (typeof window.bitcoin === "undefined") {
      throw new Error(
        "bitcoinjs-lib not loaded. Required for PSBT operations."
      );
    }
    if (typeof window.Buffer === "undefined") {
      throw new Error("Buffer not available. Required for PSBT operations.");
    }
  }

  /**
   * Read a varint (variable-length integer) from buffer
   */
  function readVarInt(buffer, offset) {
    if (offset >= buffer.length) {
      throw new Error(
        "Trying to access beyond buffer length at offset " + offset
      );
    }
    var first = buffer[offset];
    if (first < 0xfd) {
      return { value: first, length: 1 };
    } else if (first === 0xfd) {
      if (offset + 3 > buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need 3 bytes at offset " +
            offset
        );
      }
      return { value: buffer.readUInt16LE(offset + 1), length: 3 };
    } else if (first === 0xfe) {
      if (offset + 5 > buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need 5 bytes at offset " +
            offset
        );
      }
      return { value: buffer.readUInt32LE(offset + 1), length: 5 };
    } else {
      if (offset + 9 > buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need 9 bytes at offset " +
            offset
        );
      }
      var low = buffer.readUInt32LE(offset + 1);
      var high = buffer.readUInt32LE(offset + 5);
      return { value: low + high * 0x100000000, length: 9 };
    }
  }

  /**
   * Write a varint to buffer
   */
  function writeVarInt(buffer, offset, value) {
    if (value < 0xfd) {
      buffer[offset] = value;
      return 1;
    } else if (value <= 0xffff) {
      buffer[offset] = 0xfd;
      buffer.writeUInt16LE(value, offset + 1);
      return 3;
    } else if (value <= 0xffffffff) {
      buffer[offset] = 0xfe;
      buffer.writeUInt32LE(value, offset + 1);
      return 5;
    } else {
      buffer[offset] = 0xff;
      buffer.writeUInt32LE(value & 0xffffffff, offset + 1);
      buffer.writeUInt32LE(Math.floor(value / 0x100000000), offset + 5);
      return 9;
    }
  }

  /**
   * Read a PSBT map entry
   */
  function readPSBTMap(buffer, offset) {
    var map = {};
    var pos = offset;

    while (pos < buffer.length) {
      // Check if we have enough bytes for a varint
      if (pos >= buffer.length) {
        break;
      }

      var keyLen = readVarInt(buffer, pos);
      pos += keyLen.length;

      if (keyLen.value === 0) {
        // End of map marker (0x00) - the varint itself (1 byte) is the terminator
        // We've already consumed it, so we're done
        break;
      }

      // Check if we have enough bytes for the key
      if (pos + keyLen.value > buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need " +
            keyLen.value +
            " bytes for key at offset " +
            pos
        );
      }

      var key = buffer.slice(pos, pos + keyLen.value);
      pos += keyLen.value;

      // Check if we have enough bytes for value length varint
      if (pos >= buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need varint for value length at offset " +
            pos
        );
      }

      var valLen = readVarInt(buffer, pos);
      pos += valLen.length;

      // Check if we have enough bytes for the value
      if (pos + valLen.value > buffer.length) {
        throw new Error(
          "Trying to access beyond buffer length: need " +
            valLen.value +
            " bytes for value at offset " +
            pos
        );
      }

      var value = buffer.slice(pos, pos + valLen.value);
      pos += valLen.value;

      map[key.toString("hex")] = value;
    }

    return { map: map, length: pos - offset };
  }

  /**
   * Parse base64 PSBT
   * @param {string} base64PSBT - Base64 encoded PSBT
   * @returns {object} Parsed PSBT object compatible with existing code
   */
  function parsePSBT(base64PSBT) {
    checkBitcoinLib();

    try {
      var psbtBuffer = Buffer.from(base64PSBT, "base64");

      // Check magic bytes
      if (psbtBuffer.slice(0, 4).toString("hex") !== "70736274") {
        throw new Error("Invalid PSBT: missing magic bytes");
      }

      var pos = 5; // Skip magic + separator

      // Read global map
      var globalResult = readPSBTMap(psbtBuffer, pos);
      var globalMap = {};
      var unsignedTxBuffer = null;

      // Extract unsigned transaction (key: 0x00)
      var unsignedTxKeyHex = "00";
      if (!globalResult.map[unsignedTxKeyHex]) {
        throw new Error("PSBT missing unsigned transaction");
      }
      unsignedTxBuffer = globalResult.map[unsignedTxKeyHex];
      var unsignedTx = window.bitcoin.Transaction.fromBuffer(unsignedTxBuffer);

      // Store in globalMap for compatibility with existing code
      globalMap.unsignedTx = unsignedTx;
      globalMap.unsignedTxBuffer = unsignedTxBuffer;

      // Move past the global map
      pos += globalResult.length;
      // Skip the 0xff separator after global map (if present)
      // Some PSBTs may not have this separator
      if (pos < psbtBuffer.length && psbtBuffer[pos] === 0xff) {
        pos += 1;
      }

      // Read input maps
      var inputs = [];
      for (var i = 0; i < unsignedTx.ins.length; i++) {
        // Check if we have enough buffer left
        if (pos >= psbtBuffer.length) {
          throw new Error(
            "Unexpected end of PSBT buffer while reading input " + i
          );
        }
        var inputResult = readPSBTMap(psbtBuffer, pos);
        var inputMap = inputResult.map;
        // Move past the input map
        pos += inputResult.length;
        // Skip the 0xff separator after input map (if present, except for last input)
        // Some PSBTs may not have separators between input maps
        if (
          i < unsignedTx.ins.length - 1 &&
          pos < psbtBuffer.length &&
          psbtBuffer[pos] === 0xff
        ) {
          pos += 1;
        }

        // Check if we've exceeded buffer length
        if (pos > psbtBuffer.length) {
          throw new Error("Input map " + i + " extends beyond buffer length");
        }

        var input = {
          bip32Derivation: [],
          witnessUtxo: null,
          partialSig: [],
        };

        // ------------------------------------------------------------------
        // FIX: Use Standard BIP174 Keys
        // 0x00 = Non-Witness UTXO
        // 0x01 = Witness UTXO (Contains Amount + Script)
        // 0x02 = Partial Signature
        // 0x06 = BIP32 Derivation
        // ------------------------------------------------------------------

        // Parse bip32Derivation (key: 0x06 + pubkey) - STANDARD BIP174
        for (var key in inputMap) {
          if (key.startsWith("06")) {
            var derivationData = inputMap[key];
            // Safety check: ensure derivationData exists
            if (!derivationData || derivationData.length < 4) {
              console.warn(
                "Input " + i + ": Invalid derivation data for key " + key
              );
              continue;
            }
            var fingerprint = derivationData.slice(0, 4);

            // Extract pubkey from key (key format: 0x06 + 33-byte pubkey) - STANDARD BIP174
            var pubkey = null;
            var keyBuffer = Buffer.from(key, "hex");
            if (keyBuffer.length >= 34 && keyBuffer[0] === 0x06) {
              // Standard format: 0x06 + 33-byte pubkey
              pubkey = keyBuffer.slice(1);
            } else if (keyBuffer.length === 1 && keyBuffer[0] === 0x06) {
              // Malformed format: just 0x06, pubkey missing
              // We'll derive it from the path later if needed
              pubkey = null;
            } else {
              // Try to extract pubkey from key (hex string format)
              if (key.length > 2) {
                pubkey = Buffer.from(key.slice(2), "hex");
              }
            }

            // Parse derivation path (stored as uint32 values, 4 bytes each)
            var path = [];
            var pathPos = 4;
            var validPathData = true;

            // Check if derivationData exists and has enough data
            if (!derivationData || derivationData.length < 4) {
              // Skip if data is too short
              continue;
            }

            // Check if the remaining data looks like a valid path (all uint32 values)
            // Valid paths should have length that's a multiple of 4 and reasonable values
            var remainingData = derivationData.slice(4);
            if (remainingData.length % 4 !== 0 || remainingData.length === 0) {
              // Path data might be malformed - try to extract what we can
              validPathData = false;
            }

            // Try to read path components
            while (pathPos + 4 <= derivationData.length) {
              var pathItem = derivationData.readUInt32LE(pathPos);

              // Check if this looks like a valid path component
              // Path components should be reasonable (not huge numbers unless hardened)
              // Hardened indices have 0x80000000 bit set
              var isHardened = pathItem >= 0x80000000;
              var actualValue = isHardened ? pathItem - 0x80000000 : pathItem;

              // If we encounter a value that looks like script data (e.g., 0x160014 = 22, 20),
              // stop parsing path
              if (!isHardened && actualValue > 0x7fffffff) {
                // This is likely not a path component
                break;
              }

              // Stop if we hit what looks like script data (common patterns)
              if (pathItem === 0x00140016 || pathItem === 0x16001400) {
                // This looks like script length prefixes, not path data
                break;
              }

              path.push(pathItem);
              pathPos += 4;

              // Limit path length to reasonable size (BIP32 paths are typically 5-6 components)
              if (path.length > 10) {
                break;
              }
            }

            // Convert to string path
            var pathStr = "m";
            for (var p = 0; p < path.length; p++) {
              var idx = path[p];
              var isHardened = idx >= 0x80000000;
              if (isHardened) idx -= 0x80000000;
              pathStr += "/" + idx + (isHardened ? "'" : "");
            }

            // Only add if we have a valid-looking path
            // BIP84 paths should be at least m/84'/0'/0'/0/0 (5 components)
            // If path is too short or looks invalid, we'll try to derive it from witness script
            if (path.length >= 1) {
              input.bip32Derivation.push({
                pubkey: pubkey, // May be null if missing from key
                fingerprint: fingerprint,
                path: pathStr,
                _isPartialPath: path.length < 5, // Mark if path seems incomplete
              });
            }
          }
        }

        // Parse witnessUtxo (key: 0x01) - STANDARD BIP174 (was incorrectly 0x02)
        if (inputMap["01"]) {
          var witnessData = inputMap["01"];
          // Check if we have at least 8 bytes for value
          if (witnessData.length < 8) {
            throw new Error(
              "witnessUtxo data too short: need at least 8 bytes, got " +
                witnessData.length
            );
          }
          var value =
            witnessData.readUInt32LE(0) +
            witnessData.readUInt32LE(4) * 0x100000000;
          // Check if we have enough bytes for script length varint
          if (witnessData.length < 9) {
            throw new Error(
              "witnessUtxo data too short: need at least 9 bytes for script length, got " +
                witnessData.length
            );
          }
          var scriptLen = readVarInt(witnessData, 8);
          var scriptStart = 8 + scriptLen.length;
          var scriptEnd = scriptStart + scriptLen.value;
          // Check if we have enough bytes for the script
          if (scriptEnd > witnessData.length) {
            throw new Error(
              "witnessUtxo script extends beyond buffer: need " +
                scriptLen.value +
                " bytes at offset " +
                scriptStart +
                ", buffer length is " +
                witnessData.length
            );
          }
          var script = witnessData.slice(scriptStart, scriptEnd);
          input.witnessUtxo = {
            value: value,
            script: script,
          };
        } else {
          // WitnessUtxo is missing - this is required for SegWit signing
          console.warn(
            "Input " +
              i +
              ": Missing witnessUtxo (key 0x01) in PSBT. This is required for SegWit signing."
          );
        }

        // Parse partialSig (key: 0x02 + pubkey) - STANDARD BIP174 (was incorrectly 0x03)
        // BE CAREFUL: 0x02 is also used for WitnessUtxo if the key length is 1.
        // PartialSig keys are always LONGER than 1 byte (0x02 + pubkey).
        for (var key in inputMap) {
          if (key.startsWith("02") && key.length > 2) {
            // Only process if key is longer than 2 hex chars (1 byte), meaning it has pubkey
            var sigPubkey = Buffer.from(key.slice(2), "hex");
            input.partialSig.push({
              pubkey: sigPubkey,
              signature: inputMap[key],
            });
          }
        }

        inputs.push(input);
      }

      // Skip the 0xff separator after input maps (before output maps)
      if (pos < psbtBuffer.length && psbtBuffer[pos] === 0xff) {
        pos += 1;
      }

      // Read output maps (empty for signing)
      var outputs = [];
      for (var i = 0; i < unsignedTx.outs.length; i++) {
        // Check if we have enough buffer left
        if (pos >= psbtBuffer.length) {
          // Some PSBTs may not have output maps - this is OK
          outputs.push({});
          continue;
        }
        var outputResult = readPSBTMap(psbtBuffer, pos);
        // Move past the output map (length includes the 0x00 terminator)
        pos += outputResult.length;
        // Skip the 0xff separator after output map (except for last output)
        if (i < unsignedTx.outs.length - 1) {
          if (pos < psbtBuffer.length && psbtBuffer[pos] === 0xff) {
            pos += 1;
          }
        }

        // Check if we've exceeded buffer length
        if (pos > psbtBuffer.length) {
          throw new Error("Output map " + i + " extends beyond buffer length");
        }
        outputs.push({});
      }

      // Return in format compatible with existing code
      return {
        globalMap: {
          unsignedTx: unsignedTx,
          unsignedTxBuffer: unsignedTxBuffer,
        },
        unsignedTx: unsignedTx,
        inputs: inputs,
        outputs: outputs,
      };
    } catch (error) {
      throw new Error("Failed to parse PSBT: " + error.message);
    }
  }

  /**
   * Get transaction information from PSBT with per-output details
   */
  function getTransactionInfo(psbt) {
    try {
      var unsignedTx = psbt.unsignedTx || psbt.globalMap.unsignedTx;
      if (!unsignedTx) {
        throw new Error("PSBT missing unsigned transaction");
      }

      var inputCount = unsignedTx.ins ? unsignedTx.ins.length : 0;
      var outputCount = unsignedTx.outs ? unsignedTx.outs.length : 0;

      var outputAmount = 0;
      var outputDetails = [];

      if (unsignedTx.outs) {
        for (var i = 0; i < unsignedTx.outs.length; i++) {
          var out = unsignedTx.outs[i];
          var valueSat = out.value || 0;
          outputAmount += valueSat;

          var address = null;
          var script = Buffer.isBuffer(out.script)
            ? out.script
            : Buffer.from(out.script);

          // P2TR (Taproot): OP_1 (0x51) + PUSHBYTES_32 (0x20) + 32 bytes
          if (script[0] === 0x51 && script[1] === 0x20 && script.length === 34) {
            address = encodeBech32m('bc', 1, script.slice(2, 34));
          } else {
            try {
              address = window.bitcoin.address.fromOutputScript(
                script,
                window.bitcoin.networks.bitcoin
              );
            } catch (e) {
              // OP_RETURN or unknown script type
              address = null;
            }
          }

          outputDetails.push({
            index: i,
            address: address,
            valueSat: valueSat,
            valueBTC: (valueSat / 100000000).toFixed(8),
            isChange: false,
          });
        }
      }

      // Compute input amount from witnessUtxo data
      var inputAmount = 0;
      var hasAllInputAmounts = true;
      var inputs = psbt.inputs || [];
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].witnessUtxo && typeof inputs[i].witnessUtxo.value === "number") {
          inputAmount += inputs[i].witnessUtxo.value;
        } else {
          hasAllInputAmounts = false;
        }
      }

      var fee = hasAllInputAmounts ? inputAmount - outputAmount : null;

      return {
        inputs: inputCount,
        outputs: outputCount,
        outputAmount: outputAmount,
        outputDetails: outputDetails,
        inputAmount: hasAllInputAmounts ? inputAmount : null,
        fee: fee,
        feeWarning: null, // computed after change detection
        network: "mainnet",
      };
    } catch (error) {
      throw new Error("Failed to extract transaction info: " + error.message);
    }
  }

  /**
   * Cached derived addresses for change detection
   */
  var _addressCache = {};

  /**
   * Identify change outputs by matching against wallet's derived addresses
   * @param {Array} outputDetails - from getTransactionInfo
   * @param {string} zpub - wallet's zpub
   */
  function identifyChangeOutputs(outputDetails, zpub) {
    if (!zpub || !outputDetails || outputDetails.length === 0) return;

    // Build address set (cached per zpub)
    if (!_addressCache[zpub]) {
      var addresses = {};
      // Derive receiving (path=0) and change (path=1) addresses, indices 0-24
      for (var change = 0; change <= 1; change++) {
        for (var idx = 0; idx <= 24; idx++) {
          try {
            var result = WalletService.getAddressFromZpub(
              zpub,
              idx,
              change === 1
            );
            if (result && result.address) {
              addresses[result.address] = { change: change, index: idx };
            }
          } catch (e) {
            // Skip derivation errors
          }
        }
      }
      _addressCache[zpub] = addresses;
    }

    var addresses = _addressCache[zpub];

    for (var i = 0; i < outputDetails.length; i++) {
      var out = outputDetails[i];
      if (out.address && addresses[out.address]) {
        var info = addresses[out.address];
        // Mark as change only if it's on the change derivation path (path=1)
        out.isChange = info.change === 1;
      }
    }
  }

  /**
   * Compute fee warning level based on fee relative to send amount
   * @param {object} txInfo - transaction info from getTransactionInfo (with change detection done)
   * @returns {object|null} { level: "high"|"extreme"|"unknown", message: string }
   */
  function computeFeeWarning(txInfo) {
    if (txInfo.fee === null) {
      return {
        level: "unknown",
        message: "Fee cannot be calculated (missing input data)",
      };
    }

    // sendAmount = sum of non-change outputs
    var sendAmount = 0;
    var hasChangeDetection = false;
    if (txInfo.outputDetails) {
      for (var i = 0; i < txInfo.outputDetails.length; i++) {
        var out = txInfo.outputDetails[i];
        if (out.isChange) {
          hasChangeDetection = true;
        } else {
          sendAmount += out.valueSat;
        }
      }
    }

    // If no change detection happened, use total output amount
    if (!hasChangeDetection) {
      sendAmount = txInfo.outputAmount;
    }

    if (sendAmount <= 0) {
      return null;
    }

    var feePercent = (txInfo.fee / sendAmount) * 100;

    if (feePercent >= 50) {
      return {
        level: "extreme",
        message:
          "DANGER: Fee is " +
          feePercent.toFixed(1) +
          "% of send amount!",
      };
    }

    if (feePercent >= 10 || txInfo.fee >= 100000) {
      return {
        level: "high",
        message:
          "Warning: Fee is " +
          feePercent.toFixed(1) +
          "% of send amount",
      };
    }

    return null; // Normal fee
  }

  /**
   * Sign PSBT with wallet mnemonic
   * Uses the same signing logic as the original, but works with our minimal PSBT format
   */
  function signPSBT(psbt, mnemonic) {
    checkBitcoinLib();

    if (typeof window.bitcoin.HDNode === "undefined") {
      throw new Error("bitcoinjs-lib HDNode not available");
    }

    try {
      var network = window.bitcoin.networks.bitcoin;
      var seed = WalletService.mnemonicToSeed(mnemonic);
      var masterNode = window.bitcoin.HDNode.fromSeedBuffer(seed, network);

      var unsignedTx = psbt.unsignedTx || psbt.globalMap.unsignedTx;
      if (!unsignedTx) {
        throw new Error("PSBT missing unsigned transaction");
      }

      var inputs = psbt.inputs || [];
      var signedCount = 0;
      var skippedCount = 0;
      var errors = [];

      for (var i = 0; i < inputs.length; i++) {
        var input = inputs[i];

        if (input.partialSig && input.partialSig.length > 0) {
          signedCount++;
          continue;
        }

        if (!input.bip32Derivation || input.bip32Derivation.length === 0) {
          errors.push("Input " + i + " has no derivation info");
          skippedCount++;
          continue;
        }

        var derivation = input.bip32Derivation[0];
        var path = derivation.path;
        var isPartialPath = derivation._isPartialPath || false;
        var pathFound = false;
        var signingPubkey = null;

        // Always try to find the correct path by checking the witness script's pubkey hash
        // This handles both partial paths and cases where the path is malformed
        if (input.witnessUtxo) {
          var witnessScript = Buffer.isBuffer(input.witnessUtxo.script)
            ? input.witnessUtxo.script
            : Buffer.from(input.witnessUtxo.script);

          // Extract pubkey hash from witness script (P2WPKH: 0x00 0x14 <20-byte hash>)
          if (
            witnessScript.length >= 22 &&
            witnessScript[0] === 0x00 &&
            witnessScript[1] === 0x14
          ) {
            var expectedPubkeyHash = witnessScript.slice(2, 22);

            // First, try the path from the PSBT if it's not partial
            if (!isPartialPath) {
              try {
                var testNode = masterNode.derivePath(path);
                var testPubkey = testNode.keyPair.getPublicKeyBuffer();
                var testPubkeyHash = window.bitcoin.crypto.hash160(testPubkey);

                if (testPubkeyHash.equals(expectedPubkeyHash)) {
                  // Path is correct!
                  pathFound = true;
                  signingPubkey = testPubkey;
                }
              } catch (e) {
                // Path derivation failed, will try discovery below
                console.log(
                  "Path derivation failed for input " + i + ": " + e.message
                );
              }
            }

            // If path from PSBT didn't work, try to find the correct BIP84 path
            if (!pathFound) {
              // Try standard BIP84 paths: m/84'/0'/0'/0/{0-100} and change addresses
              for (var changeIndex = 0; changeIndex <= 1; changeIndex++) {
                for (var addrIndex = 0; addrIndex <= 100; addrIndex++) {
                  var testPath = "m/84'/0'/0'/" + changeIndex + "/" + addrIndex;
                  try {
                    var testNode = masterNode.derivePath(testPath);
                    var testPubkey = testNode.keyPair.getPublicKeyBuffer();
                    var testPubkeyHash =
                      window.bitcoin.crypto.hash160(testPubkey);

                    if (testPubkeyHash.equals(expectedPubkeyHash)) {
                      path = testPath;
                      pathFound = true;
                      signingPubkey = testPubkey;
                      console.log(
                        "Found correct path for input " + i + ": " + testPath
                      );
                      break;
                    }
                  } catch (e) {
                    // Skip invalid paths
                    continue;
                  }
                }
                if (pathFound) break;
              }
            }

            if (!pathFound) {
              errors.push(
                "Input " +
                  i +
                  ": Could not find matching derivation path (searched up to index 100)"
              );
              skippedCount++;
              continue;
            }
          } else {
            errors.push("Input " + i + ": Invalid witness script format");
            skippedCount++;
            continue;
          }
        } else {
          errors.push("Input " + i + ": Missing witnessUtxo");
          skippedCount++;
          continue;
        }

        // Derive the key pair using the found path
        var childNode = masterNode.derivePath(path);
        var keyPair = childNode.keyPair;

        // Use the signing pubkey we found, or derive it
        if (!signingPubkey) {
          signingPubkey = keyPair.getPublicKeyBuffer();
        }

        if (input.witnessUtxo) {
          var witnessScript = Buffer.isBuffer(input.witnessUtxo.script)
            ? input.witnessUtxo.script
            : Buffer.from(input.witnessUtxo.script);

          var value = input.witnessUtxo.value;

          // Check if value is missing or invalid
          if (value === null || value === undefined) {
            errors.push(
              "Input " +
                i +
                ": witnessUtxo value is missing. Cannot sign without UTXO value."
            );
            skippedCount++;
            continue;
          }

          // Convert to number if needed
          if (typeof value === "bigint") {
            // Check if bigint is within safe integer range
            if (
              value > Number.MAX_SAFE_INTEGER ||
              value < Number.MIN_SAFE_INTEGER
            ) {
              errors.push(
                "Input " +
                  i +
                  ": witnessUtxo value is too large: " +
                  value.toString()
              );
              skippedCount++;
              continue;
            }
            value = Number(value);
          }
          if (typeof value !== "number") {
            value = parseInt(value, 10);
          }

          // Validate value is a reasonable satoshi amount (not too large)
          if (isNaN(value) || value < 0 || value > 21000000 * 100000000) {
            errors.push("Input " + i + ": Invalid witnessUtxo value: " + value);
            skippedCount++;
            continue;
          }

          var hashType = window.bitcoin.Transaction.SIGHASH_ALL;
          var pubKeyHash = witnessScript.slice(2);
          if (!Buffer.isBuffer(pubKeyHash)) {
            pubKeyHash = Buffer.from(pubKeyHash);
          }

          var scriptCode =
            window.bitcoin.script.pubKeyHash.output.encode(pubKeyHash);
          if (!Buffer.isBuffer(scriptCode)) {
            scriptCode = Buffer.from(scriptCode);
          }

          var hash = unsignedTx.hashForWitnessV0(
            i,
            scriptCode,
            value,
            hashType
          );
          var signature = keyPair.sign(hash);
          var signatureDER = signature.toDER();
          if (!Buffer.isBuffer(signatureDER)) {
            signatureDER = Buffer.from(signatureDER);
          }

          var signatureWithHashType = Buffer.concat([
            signatureDER,
            Buffer.from([hashType]),
          ]);

          if (!input.partialSig) {
            input.partialSig = [];
          }

          input.partialSig.push({
            pubkey: signingPubkey,
            signature: signatureWithHashType,
          });

          signedCount++;
        } else {
          errors.push("Input " + i + " is not SegWit");
          skippedCount++;
        }
      }

      if (signedCount === 0 && inputs.length > 0) {
        var errorMsg = "Failed to sign PSBT. No inputs were signed.";
        if (errors.length > 0) {
          errorMsg += "\nErrors: " + errors.join("; ");
        } else {
          errorMsg += "\nNo errors reported, but no inputs were signed.";
        }
        // Log detailed info for debugging
        console.error("PSBT Signing Debug Info:");
        console.error("- Total inputs:", inputs.length);
        console.error("- Signed count:", signedCount);
        console.error("- Skipped count:", skippedCount);
        console.error("- Errors:", errors);
        for (var i = 0; i < inputs.length; i++) {
          console.error("Input " + i + ":", {
            hasBip32Derivation: !!(
              inputs[i].bip32Derivation && inputs[i].bip32Derivation.length > 0
            ),
            bip32DerivationCount: inputs[i].bip32Derivation
              ? inputs[i].bip32Derivation.length
              : 0,
            hasWitnessUtxo: !!inputs[i].witnessUtxo,
            hasPartialSig: !!(
              inputs[i].partialSig && inputs[i].partialSig.length > 0
            ),
            derivationPath:
              inputs[i].bip32Derivation && inputs[i].bip32Derivation[0]
                ? inputs[i].bip32Derivation[0].path
                : "none",
          });
        }
        throw new Error(errorMsg);
      }

      return psbt;
    } catch (error) {
      throw new Error("Failed to sign PSBT: " + error.message);
    }
  }

  /**
   * Extract final transaction from signed PSBT for broadcasting
   * This builds a complete transaction with witness data from the signed PSBT
   * @param {object} psbt - Signed PSBT object
   * @returns {string} Hex-encoded final transaction ready for broadcasting
   */
  function extractTransaction(psbt) {
    checkBitcoinLib();

    try {
      var unsignedTx = psbt.unsignedTx || psbt.globalMap.unsignedTx;
      if (!unsignedTx) {
        throw new Error("PSBT missing unsigned transaction");
      }

      var inputs = psbt.inputs || [];

      // Clone the transaction to avoid modifying the original
      var txBuffer = unsignedTx.toBuffer();
      var finalTx = window.bitcoin.Transaction.fromBuffer(txBuffer);

      // For each input, add witness data from partialSig
      for (var i = 0; i < inputs.length && i < finalTx.ins.length; i++) {
        var input = inputs[i];

        // Check if this input has signatures
        if (input.partialSig && input.partialSig.length > 0) {
          // For P2WPKH (Native SegWit), witness stack is: [signature, pubkey]
          // Get the first (and usually only) signature
          var sig = input.partialSig[0];

          if (sig && sig.signature && sig.pubkey) {
            // Ensure we have Buffer objects
            var signature = Buffer.isBuffer(sig.signature)
              ? sig.signature
              : Buffer.from(sig.signature);
            var pubkey = Buffer.isBuffer(sig.pubkey)
              ? sig.pubkey
              : Buffer.from(sig.pubkey);

            // Create witness stack: [signature, pubkey]
            var witness = [signature, pubkey];

            // Set witness for this input
            finalTx.ins[i].witness = witness;
          }
        }
      }

      // Serialize to hex for broadcasting
      var txHex = finalTx.toHex();
      return txHex;
    } catch (error) {
      throw new Error("Failed to extract transaction: " + error.message);
    }
  }

  /**
   * Serialize PSBT to base64
   */
  function serializePSBT(psbt) {
    checkBitcoinLib();

    try {
      var parts = [];

      // Magic bytes
      parts.push(Buffer.from("psbt", "utf8"));
      parts.push(Buffer.from([0xff]));

      // Global map
      var globalMapBuffer =
        psbt.globalMap.unsignedTxBuffer || psbt.unsignedTx.toBuffer();
      var globalKey = Buffer.from([0x00]);
      var globalKeyLen = Buffer.allocUnsafe(1);
      globalKeyLen[0] = globalKey.length;
      var globalValLen = Buffer.allocUnsafe(9);
      var globalValLenBytes = writeVarInt(
        globalValLen,
        0,
        globalMapBuffer.length
      );

      parts.push(globalKeyLen);
      parts.push(globalKey);
      parts.push(globalValLen.slice(0, globalValLenBytes));
      parts.push(globalMapBuffer);
      parts.push(Buffer.from([0x00])); // End of map
      parts.push(Buffer.from([0xff])); // Separator

      // Input maps
      for (var i = 0; i < psbt.inputs.length; i++) {
        var inputParts = [];
        var input = psbt.inputs[i];

        // bip32Derivation - Use Key 0x06 (STANDARD BIP174, was incorrectly 0x01)
        for (var j = 0; j < input.bip32Derivation.length; j++) {
          var deriv = input.bip32Derivation[j];
          var key = Buffer.concat([Buffer.from([0x06]), deriv.pubkey]);
          var fingerprint = deriv.fingerprint;
          var pathBuffer = writeDerivationPath(deriv.path);
          var value = Buffer.concat([fingerprint, pathBuffer]);

          var keyLen = Buffer.allocUnsafe(1);
          keyLen[0] = key.length;
          var valLen = Buffer.allocUnsafe(9);
          var valLenBytes = writeVarInt(valLen, 0, value.length);

          inputParts.push(keyLen);
          inputParts.push(key);
          inputParts.push(valLen.slice(0, valLenBytes));
          inputParts.push(value);
        }

        // witnessUtxo - Use Key 0x01 (STANDARD BIP174, was incorrectly 0x02)
        if (input.witnessUtxo) {
          var valueBuffer = Buffer.allocUnsafe(8);
          var value = input.witnessUtxo.value;
          valueBuffer.writeUInt32LE(value & 0xffffffff, 0);
          valueBuffer.writeUInt32LE(Math.floor(value / 0x100000000), 4);
          var script = input.witnessUtxo.script;
          var scriptLen = Buffer.allocUnsafe(9);
          var scriptLenBytes = writeVarInt(scriptLen, 0, script.length);
          var witnessValue = Buffer.concat([
            valueBuffer,
            scriptLen.slice(0, scriptLenBytes),
            script,
          ]);

          var key = Buffer.from([0x01]);
          var keyLen = Buffer.allocUnsafe(1);
          keyLen[0] = key.length;
          var valLen = Buffer.allocUnsafe(9);
          var valLenBytes = writeVarInt(valLen, 0, witnessValue.length);

          inputParts.push(keyLen);
          inputParts.push(key);
          inputParts.push(valLen.slice(0, valLenBytes));
          inputParts.push(witnessValue);
        }

        // partialSig - Use Key 0x02 (STANDARD BIP174, was incorrectly 0x03)
        for (var j = 0; j < input.partialSig.length; j++) {
          var sig = input.partialSig[j];
          var key = Buffer.concat([Buffer.from([0x02]), sig.pubkey]);
          var value = sig.signature;

          var keyLen = Buffer.allocUnsafe(1);
          keyLen[0] = key.length;
          var valLen = Buffer.allocUnsafe(9);
          var valLenBytes = writeVarInt(valLen, 0, value.length);

          inputParts.push(keyLen);
          inputParts.push(key);
          inputParts.push(valLen.slice(0, valLenBytes));
          inputParts.push(value);
        }

        parts.push(Buffer.concat(inputParts));
        parts.push(Buffer.from([0x00])); // End of map
        if (i < psbt.inputs.length - 1) {
          parts.push(Buffer.from([0xff])); // Separator
        }
      }

      // Output maps (empty)
      for (var i = 0; i < psbt.outputs.length; i++) {
        parts.push(Buffer.from([0x00])); // Empty map
        if (i < psbt.outputs.length - 1) {
          parts.push(Buffer.from([0xff]));
        }
      }

      var result = Buffer.concat(parts);
      return result.toString("base64");
    } catch (error) {
      throw new Error("Failed to serialize PSBT: " + error.message);
    }
  }

  /**
   * Write derivation path to buffer
   */
  function writeDerivationPath(path) {
    var parts = path.split("/").slice(1);
    var buffers = [];
    for (var i = 0; i < parts.length; i++) {
      var part = parts[i];
      var isHardened = part.endsWith("'");
      var index = parseInt(isHardened ? part.slice(0, -1) : part, 10);
      if (isHardened) index += 0x80000000;
      var indexBuffer = Buffer.allocUnsafe(4);
      indexBuffer.writeUInt32LE(index, 0);
      buffers.push(indexBuffer);
    }
    return Buffer.concat(buffers);
  }

  // Public API - matches original PSBTService interface
  return {
    parsePSBT: parsePSBT,
    getTransactionInfo: getTransactionInfo,
    identifyChangeOutputs: identifyChangeOutputs,
    computeFeeWarning: computeFeeWarning,
    signPSBT: signPSBT,
    serializePSBT: serializePSBT,
    extractTransaction: extractTransaction,
    // Stubs for compatibility (will show "not supported" messages)
    parsePSBTFromMultiPartUR: function () {
      throw new Error(
        "UR format not supported in alternative implementation. Please use base64 PSBT file import."
      );
    },
    getURProgress: function () {
      return null;
    },
    resetURDecoder: function () {
      // No-op
    },
    checkPSBTLibs: function () {
      checkBitcoinLib();
    },
  };
})();
