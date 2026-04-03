/**
 * Enter Password Screen
 * Shown when user needs to decrypt the mnemonic for signing transactions.
 * On success, calls the registered callback with the decrypted mnemonic.
 */
var EnterPasswordScreen = {
  id: "enter-password-screen",
  _onSuccess: null, // callback(mnemonic) called on successful decryption
  _onCancel: null, // callback() called when user cancels
  _context: null, // optional {subtitle, instructions, buttonText}

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Enter Password</div>' +
      '<div class="header-subtitle">Decrypt wallet to sign</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div class="password-instructions">' +
      "Enter your wallet password to sign the transaction." +
      "</div>" +
      '<div class="password-input-group">' +
      '<label class="password-label">Password:</label>' +
      '<input type="password" ' +
      'id="enter-password-input" ' +
      'class="password-input focusable" ' +
      'data-index="0" ' +
      'placeholder="Enter password..." ' +
      'autocomplete="off" />' +
      "</div>" +
      '<div id="enter-password-error" class="password-error" style="display: none;"></div>' +
      '<div id="enter-password-status" class="password-status" style="display: none;"></div>' +
      '<div class="menu-list">' +
      '<div class="menu-item confirm-button" data-index="1" data-action="submit-password">' +
      "Decrypt & Sign" +
      "</div>" +
      '<div class="menu-item" data-index="2" data-action="cancel-password">' +
      "Cancel" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center" id="softkey-center">SELECT</div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  /**
   * Set callbacks before navigating to this screen
   * @param {Function} onSuccess - Called with decrypted mnemonic
   * @param {Function} onCancel - Called when user cancels
   */
  setCallbacksForDecryption: function (onSuccess, onCancel, context) {
    this._onSuccess = onSuccess;
    this._onCancel = onCancel;
    this._context = context || null;
  },

  onEnter: function () {
    var self = this;
    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onFocusChange: function () {
        self.handleFocusChange();
      },
    });

    this.clearInput();
    this.applyContext();
    this.attachKeyHandler();
    Navigation.refreshFocusableItems();
  },

  onExit: function () {
    this.detachKeyHandler();
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
    }
    this.clearInput();
  },

  applyContext: function () {
    var screen = document.getElementById(this.id);
    if (!screen) return;
    var subtitle = screen.querySelector(".header-subtitle");
    var instructions = screen.querySelector(".password-instructions");
    var submitBtn = screen.querySelector('[data-action="submit-password"]');

    if (this._context) {
      if (subtitle) subtitle.textContent = this._context.subtitle || "Decrypt wallet to sign";
      if (instructions) instructions.textContent = this._context.instructions || "Enter your wallet password to sign the transaction.";
      if (submitBtn) submitBtn.textContent = this._context.buttonText || "Decrypt & Sign";
    } else {
      // Default text for signing flow
      if (subtitle) subtitle.textContent = "Decrypt wallet to sign";
      if (instructions) instructions.textContent = "Enter your wallet password to sign the transaction.";
      if (submitBtn) submitBtn.textContent = "Decrypt & Sign";
    }
  },

  attachKeyHandler: function () {
    var self = this;
    this._keyHandler = function (e) {
      if (e.target.tagName !== "INPUT") return;
      if (e.key === "ArrowDown" || e.key === "Enter") {
        e.preventDefault();
        e.stopPropagation();
        e.target.blur();
        Navigation.setFocusIndex(1);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    var input = document.getElementById("enter-password-input");
    if (input) input.addEventListener("keydown", this._keyHandler);
  },

  detachKeyHandler: function () {
    if (this._keyHandler) {
      var input = document.getElementById("enter-password-input");
      if (input) input.removeEventListener("keydown", this._keyHandler);
      this._keyHandler = null;
    }
  },

  clearInput: function () {
    var input = document.getElementById("enter-password-input");
    if (input) input.value = "";
    this.hideError();
    this.hideStatus();
  },

  handleFocusChange: function () {
    var focusIndex = Navigation.getFocusIndex();
    if (focusIndex === 0) {
      var input = document.getElementById("enter-password-input");
      if (input) input.focus();
    }
  },

  showError: function (message) {
    var el = document.getElementById("enter-password-error");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideError: function () {
    var el = document.getElementById("enter-password-error");
    if (el) el.style.display = "none";
  },

  showStatus: function (message) {
    var el = document.getElementById("enter-password-status");
    if (el) {
      el.textContent = message;
      el.style.display = "block";
    }
  },

  hideStatus: function () {
    var el = document.getElementById("enter-password-status");
    if (el) el.style.display = "none";
  },

  handleSelect: function (action, index) {
    if (action === "submit-password") {
      this.submitPassword();
    } else if (action === "cancel-password") {
      this.cancel();
    } else if (index === 0) {
      var input = document.getElementById("enter-password-input");
      if (input) input.focus();
    }
  },

  submitPassword: function () {
    var self = this;
    this.hideError();

    var input = document.getElementById("enter-password-input");
    if (!input) return;

    var password = input.value;
    if (!password) {
      this.showError("Please enter your password");
      return;
    }

    this.showStatus("Decrypting...");

    WalletService.decryptMnemonic(password).then(
      function (mnemonic) {
        self.hideStatus();
        // Clear the input immediately
        if (input) input.value = "";

        // Call success callback with decrypted mnemonic
        if (self._onSuccess) {
          self._onSuccess(mnemonic);
        }
      },
      function (error) {
        self.hideStatus();
        // AES-GCM decryption failure means wrong password
        self.showError("Wrong password. Please try again.");
        console.error("Decryption error:", error);
      }
    );
  },

  cancel: function () {
    if (this._onCancel) {
      this._onCancel();
    } else {
      App.showScreen("home");
    }
  },

  handleBack: function () {
    this.cancel();
  },
};
