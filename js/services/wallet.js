/**
 * Wallet Service - Encrypted mnemonic storage and address generation
 * Mnemonic is encrypted with AES-GCM using a user password.
 * Zpub is stored unencrypted for read-only operations (address explorer, export).
 */
var WalletService = (function () {
  var STORAGE_KEY = "compass_wallet";

  // BIP84 Native SegWit derivation path constants
  var PURPOSE = 84; // Native SegWit
  var COIN_TYPE = 0; // Bitcoin mainnet
  var ACCOUNT = 0;

  // In-memory temporary mnemonic (used during wallet creation flow before password is set)
  var _tempMnemonic = null;

  // SLIP-132: Zpub Network Parameters
  // This tells bip32 to use 'zpub' prefix (0x04b24746) instead of 'xpub' (0x0488b21e)
  var ZPUB_NETWORK = {
    messagePrefix: "\x18Bitcoin Signed Message:\n",
    bech32: "bc",
    bip32: {
      public: 0x04b24746, // Magic bytes for "zpub"
      private: 0x04b2430c, // Magic bytes for "zprv"
    },
    pubKeyHash: 0x00,
    scriptHash: 0x05,
    wif: 0x80,
  };

  /**
   * Check if address libraries are loaded
   */
  function checkAddressLibs() {
    var bip32Loaded = typeof window.bip32 !== "undefined";
    var bitcoinLoaded = typeof window.bitcoin !== "undefined";
    var addressLibsLoaded = window.addressLibsLoaded === true;

    if (!bip32Loaded || !bitcoinLoaded || !addressLibsLoaded) {
      var errorMsg = "Address libraries not loaded.";
      if (window.addressLibsError) {
        errorMsg += " Error: " + window.addressLibsError;
      }
      errorMsg +=
        " | bip32: " +
        bip32Loaded +
        ", bitcoin: " +
        bitcoinLoaded +
        ", addressLibsLoaded: " +
        addressLibsLoaded;
      throw new Error(errorMsg);
    }
  }

  /**
   * Convert mnemonic to seed (using BIP39)
   * @param {string} mnemonic
   * @param {string} passphrase - Optional passphrase
   * @returns {Buffer} 64-byte seed
   */
  function mnemonicToSeed(mnemonic, passphrase) {
    if (typeof window.bip39 === "undefined") {
      throw new Error("BIP39 library not loaded");
    }
    passphrase = passphrase || "";
    // bip39@2.5.0: mnemonicToSeedHex returns hex string
    var seedHex = window.bip39.mnemonicToSeedHex(mnemonic, passphrase);
    return Buffer.from(seedHex, "hex");
  }

  /**
   * Get BIP84 derivation path for receiving address
   * @param {number} index - Address index
   * @param {boolean} isChange - Whether this is a change address
   * @returns {string} Derivation path
   */
  function getDerivationPath(index, isChange) {
    var change = isChange ? 1 : 0;
    return (
      "m/" +
      PURPOSE +
      "'/" +
      COIN_TYPE +
      "'/" +
      ACCOUNT +
      "'/" +
      change +
      "/" +
      index
    );
  }

  /**
   * Generate Native SegWit (BIP84) address from mnemonic
   * @param {string} mnemonic
   * @param {number} index - Address index (default: 0)
   * @param {boolean} isChange - Whether this is a change address (default: false)
   * @returns {object} { address, path, publicKey }
   */
  function getAddress(mnemonic, index, isChange) {
    index = index || 0;
    isChange = isChange || false;

    checkAddressLibs();

    // 1. Convert mnemonic to seed
    var seed = mnemonicToSeed(mnemonic);

    // 2. Derive master key from seed
    // bip32@1.0.2 API: fromSeed(seed, network?)
    var masterKey = window.bip32.fromSeed(seed);

    // 3. Derive BIP84 path
    var path = getDerivationPath(index, isChange);
    var childKey = masterKey.derivePath(path);

    // 4. Get public key
    var publicKey = childKey.publicKey;

    // 5. Generate Native SegWit address (P2WPKH)
    // bitcoinjs-lib@3.3.2 API
    var keyPair = window.bitcoin.ECPair.fromPublicKeyBuffer(publicKey);
    var pubKeyHash = window.bitcoin.crypto.hash160(
      keyPair.getPublicKeyBuffer()
    );
    var scriptPubKey =
      window.bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash);
    var address = window.bitcoin.address.fromOutputScript(scriptPubKey);

    return {
      address: address,
      path: path,
      publicKey: publicKey,
    };
  }

  /**
   * Generate Native SegWit (BIP84) address from zpub (public key only, no mnemonic needed)
   * @param {string} zpub - Extended public key (zpub format)
   * @param {number} index - Address index (default: 0)
   * @param {boolean} isChange - Whether this is a change address (default: false)
   * @returns {object} { address, path }
   */
  function getAddressFromZpub(zpub, index, isChange) {
    index = index || 0;
    isChange = isChange || false;

    checkAddressLibs();

    var change = isChange ? 1 : 0;

    // Decode zpub to get account-level public key node
    var accountNode = window.bip32.fromBase58(zpub, ZPUB_NETWORK);

    // Derive non-hardened child: {change}/{index}
    var childNode = accountNode.derive(change).derive(index);
    var publicKey = childNode.publicKey;

    // Generate P2WPKH address from public key
    var keyPair = window.bitcoin.ECPair.fromPublicKeyBuffer(publicKey);
    var pubKeyHash = window.bitcoin.crypto.hash160(
      keyPair.getPublicKeyBuffer()
    );
    var scriptPubKey =
      window.bitcoin.script.witnessPubKeyHash.output.encode(pubKeyHash);
    var address = window.bitcoin.address.fromOutputScript(scriptPubKey);

    var path =
      "m/" +
      PURPOSE +
      "'/" +
      COIN_TYPE +
      "'/" +
      ACCOUNT +
      "'/" +
      change +
      "/" +
      index;

    return {
      address: address,
      path: path,
    };
  }

  /**
   * Save wallet with encrypted mnemonic and plaintext zpub
   * @param {string} encryptedMnemonic - Base64 ciphertext
   * @param {string} iv - Hex IV
   * @param {string} salt - Hex salt
   * @param {string} zpub - Plaintext zpub for read-only operations
   */
  function saveWalletEncrypted(encryptedMnemonic, iv, salt, zpub) {
    var walletData = {
      encryptedMnemonic: encryptedMnemonic,
      iv: iv,
      salt: salt,
      zpub: zpub,
      createdAt: new Date().toISOString(),
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(walletData));
  }

  /**
   * Load wallet data from localStorage
   * @returns {object|null} Wallet data or null
   */
  function loadWallet() {
    var data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      try {
        return JSON.parse(data);
      } catch (e) {
        return null;
      }
    }
    return null;
  }

  /**
   * Check if wallet exists
   * @returns {boolean}
   */
  function hasWallet() {
    return loadWallet() !== null;
  }

  /**
   * Check if wallet is encrypted (has encryptedMnemonic vs plaintext mnemonic)
   * @returns {boolean}
   */
  function isWalletEncrypted() {
    var wallet = loadWallet();
    return wallet !== null && !!wallet.encryptedMnemonic;
  }

  /**
   * Get encrypted wallet data for decryption
   * @returns {{encryptedMnemonic: string, iv: string, salt: string}|null}
   */
  function getEncryptedWallet() {
    var wallet = loadWallet();
    if (wallet && wallet.encryptedMnemonic) {
      return {
        encryptedMnemonic: wallet.encryptedMnemonic,
        iv: wallet.iv,
        salt: wallet.salt,
      };
    }
    return null;
  }

  /**
   * Get zpub from stored wallet data (no decryption needed)
   * @returns {string|null}
   */
  function getZpub() {
    var wallet = loadWallet();
    if (wallet && wallet.zpub) {
      return wallet.zpub;
    }
    return null;
  }

  /**
   * Store mnemonic temporarily in memory during wallet creation flow
   * @param {string} mnemonic
   */
  function setTempMnemonic(mnemonic) {
    _tempMnemonic = mnemonic;
  }

  /**
   * Get the temporarily stored mnemonic
   * @returns {string|null}
   */
  function getTempMnemonic() {
    return _tempMnemonic;
  }

  /**
   * Clear the temporarily stored mnemonic
   */
  function clearTempMnemonic() {
    _tempMnemonic = null;
  }

  /**
   * Decrypt mnemonic using password
   * @param {string} password
   * @returns {Promise<string>} Decrypted mnemonic
   */
  function decryptMnemonic(password) {
    var encData = getEncryptedWallet();
    if (!encData) {
      return Promise.reject(new Error("No encrypted wallet found"));
    }
    return CryptoService.decrypt(
      encData.encryptedMnemonic,
      encData.iv,
      encData.salt,
      password
    );
  }

  /**
   * Delete wallet (secure logout)
   */
  function deleteWallet() {
    localStorage.removeItem(STORAGE_KEY);
    _tempMnemonic = null;
  }

  /**
   * Get BIP84 account-level extended public key (zpub) from mnemonic
   * @param {string} mnemonic
   * @returns {string} Extended public key (zpub)
   */
  function deriveZpub(mnemonic) {
    checkAddressLibs();

    // 1. Convert mnemonic to seed
    var seed = mnemonicToSeed(mnemonic);

    // 2. Derive master key from seed
    var masterKey = window.bip32.fromSeed(seed);

    // 3. Derive BIP84 account path: m/84'/0'/0'
    var accountPath = "m/" + PURPOSE + "'/" + COIN_TYPE + "'/" + ACCOUNT + "'";
    var accountKey = masterKey.derivePath(accountPath);

    // 4. Get extended public key (neutered = public-only version)
    var publicKey = accountKey.neutered();

    // 5. Inject the ZPUB network parameters
    publicKey.network = ZPUB_NETWORK;

    // 6. Generate zpub string
    return publicKey.toBase58();
  }

  // Public API
  return {
    // Encrypted storage
    saveWalletEncrypted: saveWalletEncrypted,
    getEncryptedWallet: getEncryptedWallet,
    decryptMnemonic: decryptMnemonic,
    isWalletEncrypted: isWalletEncrypted,
    // Zpub (unencrypted, read-only)
    getZpub: getZpub,
    deriveZpub: deriveZpub,
    // Address generation
    getAddress: getAddress,
    getAddressFromZpub: getAddressFromZpub,
    getDerivationPath: getDerivationPath,
    // Temp mnemonic (in-memory during creation flow)
    setTempMnemonic: setTempMnemonic,
    getTempMnemonic: getTempMnemonic,
    clearTempMnemonic: clearTempMnemonic,
    // Utilities
    hasWallet: hasWallet,
    loadWallet: loadWallet,
    deleteWallet: deleteWallet,
    mnemonicToSeed: mnemonicToSeed,
  };
})();
