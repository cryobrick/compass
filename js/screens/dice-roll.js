/**
 * Dice Roll Screen
 * Coldcard-style seed generation from real dice rolls.
 * Entropy = SHA-256(ASCII roll string), first 16 bytes -> 12-word BIP39
 * mnemonic (verifiable against Coldcard's dice tooling).
 * 12-word mode only: requires at least 50 rolls (~129 bits).
 */
var DiceRollScreen = {
  id: "dice-roll-screen",

  MIN_ROLLS: 50,
  MAX_ROLLS: 150,
  // Must always fit 240px minus paddings in 13px monospace — the newest
  // roll getting visually clipped misleads the user into re-typing it
  HISTORY_LEN: 8,

  rolls: "",
  generating: false,
  keyHandler: null,
  hintTimer: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Dice Seed</div>' +
      '<div class="header-subtitle">Roll a real die</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div class="dice-roll-content">' +
      '<div class="dice-instructions">' +
      "Roll a real die. Press 1-6 for each roll.<br />" +
      "12-word seed &middot; needs 50+ rolls" +
      "</div>" +
      '<div id="dice-counter" class="dice-counter">0 / 50</div>' +
      '<div class="dice-progress-track">' +
      '<div id="dice-progress-fill" class="dice-progress-fill"></div>' +
      "</div>" +
      '<div class="dice-history-wrap">' +
      '<span id="dice-history" class="dice-history"></span>' +
      '<span id="dice-history-last" class="dice-history-last"></span>' +
      "</div>" +
      '<div id="dice-hint" class="dice-hint"></div>' +
      '<div id="dice-error" class="restore-error" style="display: none;"></div>' +
      '<div class="menu-list">' +
      '<div class="menu-item" data-index="0" data-action="generate">' +
      "Generate Seed" +
      "</div>" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center" id="dice-sk-center"></div>' +
      '<div class="softkey softkey-right" id="dice-sk-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;

    this.rolls = "";
    this.generating = false;
    this.hideError();
    this.updateDisplay();

    // Capture-phase listener so digits never reach Navigation
    // (same pattern as create-pin.js)
    this.keyHandler = function (e) {
      if (self.generating) {
        if ((e.key >= "0" && e.key <= "9") || e.key === "Backspace") {
          e.preventDefault();
          e.stopPropagation();
        }
        return;
      }
      if (e.key >= "1" && e.key <= "6") {
        e.preventDefault();
        e.stopPropagation();
        // Auto-repeat from a held key must not inject rolls
        if (!e.repeat) {
          self.addRoll(e.key);
        }
      } else if (
        e.key === "0" ||
        e.key === "7" ||
        e.key === "8" ||
        e.key === "9"
      ) {
        e.preventDefault();
        e.stopPropagation();
        self.showHint("Only 1-6");
      } else if (e.key === "Backspace" && self.rolls.length > 0) {
        e.preventDefault();
        e.stopPropagation();
        self.deleteLast();
      }
      // Backspace at 0 rolls falls through -> Navigation onBack -> welcome
    };
    document.addEventListener("keydown", this.keyHandler, true);

    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onSoftRight: this.deleteLast.bind(this),
    });
  },

  onExit: function () {
    if (this.keyHandler) {
      document.removeEventListener("keydown", this.keyHandler, true);
      this.keyHandler = null;
    }
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
      this.hintTimer = null;
    }
    // Rolls are sensitive entropy input - never keep them around
    this.rolls = "";
    this.generating = false;
    this.updateDisplay();
    this.hideError();
  },

  addRoll: function (digit) {
    if (this.rolls.length >= this.MAX_ROLLS) {
      this.showHint("Enough rolls — press Generate");
      return;
    }
    this.rolls += digit;
    this.hideError();
    this.updateDisplay();
  },

  deleteLast: function () {
    if (this.rolls.length === 0) return;
    this.rolls = this.rolls.slice(0, -1);
    this.updateDisplay();
  },

  // Per-keypress updates use textContent/style only - never innerHTML -
  // so the Generate menu-item and its focus state are never disturbed.
  updateDisplay: function () {
    var count = this.rolls.length;

    var counter = document.getElementById("dice-counter");
    if (counter) {
      counter.textContent = count + " / " + this.MIN_ROLLS;
    }

    var fill = document.getElementById("dice-progress-fill");
    if (fill) {
      var pct = Math.min(count / this.MIN_ROLLS, 1) * 100;
      fill.style.width = pct + "%";
    }

    var history = document.getElementById("dice-history");
    var historyLast = document.getElementById("dice-history-last");
    if (history && historyLast) {
      var tail = this.rolls.slice(-this.HISTORY_LEN);
      var prefix = count > this.HISTORY_LEN ? "… " : "";
      var older = tail.slice(0, -1);
      var last = tail.slice(-1);
      history.textContent =
        prefix + older.split("").join(" ") + (older ? " " : "");
      // Newest roll rendered separately in bold — clear per-press feedback
      historyLast.textContent = last;
    }

    this.updateSoftkeys();
  },

  updateSoftkeys: function () {
    var count = this.rolls.length;
    var center = document.getElementById("dice-sk-center");
    if (center) {
      center.textContent = count >= this.MIN_ROLLS ? "GENERATE" : "";
    }
    var right = document.getElementById("dice-sk-right");
    if (right) {
      right.textContent = count > 0 ? "DEL" : "";
    }
  },

  showHint: function (message) {
    var self = this;
    var hint = document.getElementById("dice-hint");
    if (!hint) return;
    hint.textContent = message;
    if (this.hintTimer) {
      clearTimeout(this.hintTimer);
    }
    this.hintTimer = setTimeout(function () {
      hint.textContent = "";
      self.hintTimer = null;
    }, 1200);
  },

  showError: function (message) {
    var el = document.getElementById("dice-error");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideError: function () {
    var el = document.getElementById("dice-error");
    if (el) {
      el.style.display = "none";
    }
  },

  bufferToHex: function (buffer) {
    var arr = new Uint8Array(buffer);
    var hex = "";
    for (var i = 0; i < arr.length; i++) {
      var h = arr[i].toString(16);
      hex += h.length === 1 ? "0" + h : h;
    }
    return hex;
  },

  generate: function () {
    var self = this;

    if (this.generating) return;

    if (this.rolls.length < this.MIN_ROLLS) {
      this.showError(
        "Need at least " +
          this.MIN_ROLLS +
          " rolls (" +
          (this.MIN_ROLLS - this.rolls.length) +
          " more)"
      );
      return;
    }

    var cr = window.crypto || window.msCrypto;
    if (!cr || !cr.subtle) {
      this.showError("Web Crypto not available");
      return;
    }

    // bip39 bundle is lazy-loaded; by the time 50 rolls are entered it is
    // almost always ready - handle the exceptions gracefully
    if (!LibLoader.isLoaded("bip39")) {
      this.showError(
        LibLoader.getStatus("bip39") === "error"
          ? "BIP39 library not loaded"
          : "Libraries still loading. Try again in a moment."
      );
      LibLoader.ensure("bip39", function (err) {
        if (App.getCurrentScreen() !== self) return;
        if (!err) self.hideError();
      });
      return;
    }

    this.generating = true;
    this.hideError();

    var encoder = new TextEncoder();
    cr.subtle
      .digest("SHA-256", encoder.encode(this.rolls))
      .then(function (hashBuffer) {
        if (App.getCurrentScreen() !== self) return;
        // Coldcard-compatible: first 16 bytes of the digest as entropy
        var entropyHex = self.bufferToHex(hashBuffer).slice(0, 32);
        var mnemonic = window.bip39.entropyToMnemonic(entropyHex);
        self.rolls = "";
        CreateWalletScreen.presetMnemonic = mnemonic;
        App.showScreen("create-wallet");
      })
      .catch(function (error) {
        if (App.getCurrentScreen() !== self) return;
        self.generating = false;
        self.showError("Failed to generate: " + error.message);
      });
  },

  handleSelect: function (action, index) {
    if (action === "generate") {
      this.generate();
    }
  },

  handleBack: function () {
    App.showScreen("welcome");
  },
};
