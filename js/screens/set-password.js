/**
 * Set Password Screen
 * Two-step flow: Step 1 = enter password with live validation, Step 2 = confirm password.
 * Encrypts mnemonic with user's password after confirmation.
 * Password requirements: min 12 chars, must include letters, numbers, and symbols.
 */
var SetPasswordScreen = {
  id: "set-password-screen",
  _step: 1, // 1 = set password, 2 = confirm password
  _password: "", // stored from step 1

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title" id="set-pw-title">Set Password</div>' +
      '<div class="header-subtitle" id="set-pw-subtitle">Step 1 of 2</div>' +
      "</div>" +
      '<div class="screen-content">' +
      // Step 1: Set password
      '<div id="set-pw-step1">' +
      '<div class="password-instructions">' +
      "Create a strong password to encrypt your wallet. " +
      "You will need this password to sign transactions." +
      "</div>" +
      '<div class="password-input-group">' +
      '<label class="password-label">Password:</label>' +
      '<input type="password" ' +
      'id="set-password-input" ' +
      'class="password-input focusable" ' +
      'data-index="0" ' +
      'placeholder="Enter password..." ' +
      'autocomplete="off" />' +
      "</div>" +
      '<div id="set-pw-checklist" class="pw-checklist">' +
      '<div class="pw-check" id="pw-check-length">' +
      '<span class="pw-check-icon" id="pw-icon-length">-</span> ' +
      "12+ characters" +
      "</div>" +
      '<div class="pw-check" id="pw-check-letter">' +
      '<span class="pw-check-icon" id="pw-icon-letter">-</span> ' +
      "Contains a letter" +
      "</div>" +
      '<div class="pw-check" id="pw-check-number">' +
      '<span class="pw-check-icon" id="pw-icon-number">-</span> ' +
      "Contains a number" +
      "</div>" +
      '<div class="pw-check" id="pw-check-symbol">' +
      '<span class="pw-check-icon" id="pw-icon-symbol">-</span> ' +
      "Contains a symbol" +
      "</div>" +
      "</div>" +
      '<div class="menu-item confirm-button" data-index="1" data-action="next-step">' +
      "Next" +
      "</div>" +
      "</div>" +
      // Step 2: Confirm password
      '<div id="set-pw-step2" style="display:none;">' +
      '<div class="password-instructions">' +
      "Re-enter your password to confirm." +
      "</div>" +
      '<div class="password-input-group">' +
      '<label class="password-label">Confirm Password:</label>' +
      '<input type="password" ' +
      'id="set-password-confirm" ' +
      'class="password-input focusable" ' +
      'data-index="0" ' +
      'placeholder="Re-enter password..." ' +
      'autocomplete="off" />' +
      "</div>" +
      '<div class="menu-item confirm-button" data-index="1" data-action="confirm-password">' +
      "Confirm" +
      "</div>" +
      "</div>" +
      '<div id="set-password-error" class="password-error" style="display: none;"></div>' +
      '<div id="set-password-status" class="password-status" style="display: none;"></div>' +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left" id="set-pw-softleft">BACK</div>' +
      '<div class="softkey softkey-center" id="softkey-center">SELECT</div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;
    this._step = 1;
    this._password = "";

    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onFocusChange: function () {
        self.handleFocusChange();
      },
    });

    this.showStep(1);
    this.clearInputs();
    this.resetChecklist();
    this.attachInputListener();
    this.attachKeyHandlers();
    Navigation.refreshFocusableItems();
  },

  onExit: function () {
    this.detachInputListener();
    this.detachKeyHandlers();
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
    }
    this.clearInputs();
    this._password = "";
  },

  attachInputListener: function () {
    var self = this;
    this._onInputHandler = function () {
      self.updateChecklist();
    };
    var input = document.getElementById("set-password-input");
    if (input) {
      input.addEventListener("input", this._onInputHandler);
    }
  },

  detachInputListener: function () {
    if (this._onInputHandler) {
      var input = document.getElementById("set-password-input");
      if (input) {
        input.removeEventListener("input", this._onInputHandler);
      }
      this._onInputHandler = null;
    }
  },

  attachKeyHandlers: function () {
    var self = this;
    this._keyHandler = function (e) {
      var input = e.target;
      if (input.tagName !== "INPUT") return;

      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        input.blur();
        // Move focus to the button (index 1)
        Navigation.setFocusIndex(1);
      } else if (e.key === "ArrowUp") {
        // Already at index 0 (the input), nowhere to go up
        e.preventDefault();
        e.stopPropagation();
      }
    };
    var passInput = document.getElementById("set-password-input");
    var confirmInput = document.getElementById("set-password-confirm");
    if (passInput) passInput.addEventListener("keydown", this._keyHandler);
    if (confirmInput) confirmInput.addEventListener("keydown", this._keyHandler);
  },

  detachKeyHandlers: function () {
    if (this._keyHandler) {
      var passInput = document.getElementById("set-password-input");
      var confirmInput = document.getElementById("set-password-confirm");
      if (passInput) passInput.removeEventListener("keydown", this._keyHandler);
      if (confirmInput) confirmInput.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
  },

  showStep: function (step) {
    this._step = step;
    var step1 = document.getElementById("set-pw-step1");
    var step2 = document.getElementById("set-pw-step2");
    var title = document.getElementById("set-pw-title");
    var subtitle = document.getElementById("set-pw-subtitle");

    if (step === 1) {
      if (step1) step1.style.display = "block";
      if (step2) step2.style.display = "none";
      if (title) title.textContent = "Set Password";
      if (subtitle) subtitle.textContent = "Step 1 of 2";
    } else {
      if (step1) step1.style.display = "none";
      if (step2) step2.style.display = "block";
      if (title) title.textContent = "Confirm Password";
      if (subtitle) subtitle.textContent = "Step 2 of 2";
    }

    this.hideError();
    this.hideStatus();
  },

  clearInputs: function () {
    var passInput = document.getElementById("set-password-input");
    var confirmInput = document.getElementById("set-password-confirm");
    if (passInput) passInput.value = "";
    if (confirmInput) confirmInput.value = "";
    this.hideError();
    this.hideStatus();
  },

  resetChecklist: function () {
    var checks = ["length", "letter", "number", "symbol"];
    for (var i = 0; i < checks.length; i++) {
      var icon = document.getElementById("pw-icon-" + checks[i]);
      var row = document.getElementById("pw-check-" + checks[i]);
      if (icon) icon.textContent = "-";
      if (row) {
        row.classList.remove("pw-check-pass");
        row.classList.remove("pw-check-fail");
      }
    }
  },

  updateChecklist: function () {
    var input = document.getElementById("set-password-input");
    if (!input) return;
    var pw = input.value;

    var hasLength = pw.length >= 12;
    var hasLetter = false;
    var hasNumber = false;
    var hasSymbol = false;

    for (var i = 0; i < pw.length; i++) {
      var c = pw[i];
      if ((c >= "a" && c <= "z") || (c >= "A" && c <= "Z")) {
        hasLetter = true;
      } else if (c >= "0" && c <= "9") {
        hasNumber = true;
      } else {
        hasSymbol = true;
      }
    }

    this.setCheck("length", hasLength, pw.length > 0);
    this.setCheck("letter", hasLetter, pw.length > 0);
    this.setCheck("number", hasNumber, pw.length > 0);
    this.setCheck("symbol", hasSymbol, pw.length > 0);
  },

  setCheck: function (name, passed, hasInput) {
    var icon = document.getElementById("pw-icon-" + name);
    var row = document.getElementById("pw-check-" + name);
    if (!icon || !row) return;

    if (!hasInput) {
      icon.textContent = "-";
      row.classList.remove("pw-check-pass");
      row.classList.remove("pw-check-fail");
    } else if (passed) {
      icon.textContent = "+";
      row.classList.add("pw-check-pass");
      row.classList.remove("pw-check-fail");
    } else {
      icon.textContent = "x";
      row.classList.remove("pw-check-pass");
      row.classList.add("pw-check-fail");
    }
  },

  handleFocusChange: function () {
    var focusIndex = Navigation.getFocusIndex();
    if (focusIndex === 0) {
      if (this._step === 1) {
        var input = document.getElementById("set-password-input");
        if (input) input.focus();
      } else {
        var input = document.getElementById("set-password-confirm");
        if (input) input.focus();
      }
    }
  },

  showError: function (message) {
    var el = document.getElementById("set-password-error");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideError: function () {
    var el = document.getElementById("set-password-error");
    if (el) el.style.display = "none";
  },

  showStatus: function (message) {
    var el = document.getElementById("set-password-status");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideStatus: function () {
    var el = document.getElementById("set-password-status");
    if (el) el.style.display = "none";
  },

  handleSelect: function (action, index) {
    if (action === "next-step") {
      this.goToStep2();
    } else if (action === "confirm-password") {
      this.confirmPassword();
    } else if (index === 0) {
      this.handleFocusChange();
    }
  },

  goToStep2: function () {
    this.hideError();
    var passInput = document.getElementById("set-password-input");
    if (!passInput) return;

    var password = passInput.value;

    // Validate password
    var validation = CryptoService.validatePassword(password);
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    // Store password and move to step 2
    this._password = password;
    this.showStep(2);
    Navigation.refreshFocusableItems();
    // Focus the confirm input
    var self = this;
    setTimeout(function () {
      self.handleFocusChange();
    }, 0);
  },

  confirmPassword: function () {
    var self = this;
    this.hideError();
    this.hideStatus();

    var confirmInput = document.getElementById("set-password-confirm");
    if (!confirmInput) return;

    var confirm = confirmInput.value;

    // Check passwords match
    if (this._password !== confirm) {
      this.showError("Passwords do not match");
      return;
    }

    // Get the mnemonic from the creation/restore flow
    var mnemonic = WalletService.getTempMnemonic();
    if (!mnemonic) {
      this.showError("No wallet data found");
      return;
    }

    this.showStatus("Encrypting wallet...");

    // Derive zpub before encrypting (while mnemonic is in memory)
    var zpub;
    try {
      zpub = WalletService.deriveZpub(mnemonic);
    } catch (error) {
      this.hideStatus();
      this.showError("Failed to derive zpub: " + error.message);
      return;
    }

    // Encrypt mnemonic
    CryptoService.encrypt(mnemonic, this._password).then(
      function (encrypted) {
        // Save encrypted wallet
        WalletService.saveWalletEncrypted(
          encrypted.ciphertext,
          encrypted.iv,
          encrypted.salt,
          zpub
        );

        // Clear temp mnemonic from memory
        WalletService.clearTempMnemonic();

        self.hideStatus();
        self._password = "";

        // Navigate to home
        App.showScreen("home");
      },
      function (error) {
        self.hideStatus();
        self.showError("Encryption failed: " + error.message);
      }
    );
  },

  handleBack: function () {
    if (this._step === 2) {
      // Go back to step 1, keep the password input value
      this.showStep(1);
      Navigation.refreshFocusableItems();
      this.updateChecklist();
      var self = this;
      setTimeout(function () {
        self.handleFocusChange();
      }, 0);
    } else {
      // Don't allow going back from step 1 — user must set a password
      this.showError("You must set a password to protect your wallet");
    }
  },
};
