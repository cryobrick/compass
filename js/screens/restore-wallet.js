/**
 * Restore Wallet Screen
 * Allows user to enter 12-word mnemonic to restore wallet
 */
var RestoreWalletScreen = {
  id: "restore-wallet-screen",
  wordInputs: [],
  _inputDebounceTimer: null,
  _inputDebounceIndex: null,
  _inputHandling: false,

  render: function () {
    var html =
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Restore Wallet</div>' +
      '<div class="header-subtitle">Enter your 12-word mnemonic</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div id="mnemonic-inputs" class="mnemonic-input-container"></div>' +
      '<div id="restore-error" class="restore-error" style="display: none;"></div>' +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center" id="softkey-center">SELECT</div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>";

    return html;
  },

  onEnter: function () {
    var self = this;
    this.renderInputs();

    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onFocusChange: function () {
        self.updateSoftkeys();
        self.handleFocusChange();
      },
    });

    // Ensure inputs are stored and navigation is refreshed after render
    setTimeout(function () {
      self.ensureInputsReady();
    }, 0);
  },

  ensureInputsReady: function () {
    // Make sure all inputs are stored
    if (this.wordInputs.length !== 12) {
      this.wordInputs = [];
      for (var i = 0; i < 12; i++) {
        var input = document.getElementById("mnemonic-word-" + i);
        if (input) {
          this.wordInputs.push(input);
        }
      }
    }
    // Refresh navigation to ensure all items are found
    Navigation.refreshFocusableItems();
  },

  handleFocusChange: function () {
    var focusIndex = Navigation.getFocusIndex();
    // If focus is on an input (0-11), actually focus the input element
    if (focusIndex >= 0 && focusIndex < 12) {
      // Ensure inputs are ready
      if (this.wordInputs.length !== 12) {
        this.ensureInputsReady();
      }
      if (this.wordInputs[focusIndex]) {
        // Focus the input element so user can type
        var input = this.wordInputs[focusIndex];
        // Use requestAnimationFrame to ensure DOM is ready
        var self = this;
        requestAnimationFrame(function () {
          if (
            self.wordInputs[focusIndex] &&
            input === self.wordInputs[focusIndex]
          ) {
            input.focus();
            // Ensure cursor is at the end
            if (input.setSelectionRange) {
              var len = input.value.length;
              input.setSelectionRange(len, len);
            }
          }
        });
      }
    }
  },

  onExit: function () {
    if (this._inputDebounceTimer) {
      clearTimeout(this._inputDebounceTimer);
      this._inputDebounceTimer = null;
    }
    this._inputHandling = false;
    // Blur any focused input to prevent stale focus on hidden screen
    if (document.activeElement && document.activeElement.tagName === "INPUT") {
      document.activeElement.blur();
    }
    this.wordInputs = [];
    this.hideError();
  },

  renderInputs: function () {
    var container = document.getElementById("mnemonic-inputs");
    if (!container) return;

    var html = "";
    this.wordInputs = [];

    // Create 12 text inputs for mnemonic words
    for (var i = 0; i < 12; i++) {
      html +=
        '<div class="mnemonic-input-row">' +
        '<span class="word-number">' +
        (i + 1) +
        ".</span>" +
        '<input type="text" ' +
        'id="mnemonic-word-' +
        i +
        '" ' +
        'class="mnemonic-input focusable" ' +
        'data-index="' +
        i +
        '" ' +
        'placeholder="word ' +
        (i + 1) +
        '" ' +
        'autocomplete="off" ' +
        'spellcheck="false" ' +
        'tabindex="-1" />' +
        "</div>";
    }

    // Add Restore Wallet button
    html +=
      '<div class="menu-item confirm-button" data-index="12" data-action="restore">' +
      "Restore Wallet" +
      "</div>";

    container.innerHTML = html;

    var self = this;

    // Store references to input elements and set up event listeners
    for (var j = 0; j < 12; j++) {
      var input = document.getElementById("mnemonic-word-" + j);
      if (input) {
        this.wordInputs.push(input);

        // When input gets focus via navigation, ensure it's actually focused
        input.addEventListener(
          "focus",
          (function (idx) {
            return function () {
              // Update navigation focus index to keep in sync
              Navigation.setFocusIndex(idx);
            };
          })(j)
        );

        // Add input event listeners for auto-advance (debounced to avoid hang on feature phones)
        input.addEventListener(
          "input",
          (function (idx) {
            return function () {
              self.handleInputChangeDebounced(idx);
            };
          })(j)
        );

        // Handle keyboard navigation when input is focused
        input.addEventListener(
          "keydown",
          (function (idx) {
            return function (e) {
              // Handle Enter key to move to next input or restore button
              if (e.key === "Enter") {
                e.preventDefault();
                e.stopPropagation();
                self.focusNextInput(idx);
                return;
              }

              // Handle arrow keys for navigation when at input boundaries
              if (e.key === "ArrowDown") {
                var inputElement = e.target;
                var cursorPos = inputElement.selectionStart || 0;
                var textLength = inputElement.value.length;

                // If input is empty or cursor is at the end, allow navigation down
                if (textLength === 0 || cursorPos >= textLength) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Blur input first
                  inputElement.blur();
                  // Move to next item
                  if (idx < 11) {
                    Navigation.setFocusIndex(idx + 1);
                    self.handleFocusChange();
                  } else {
                    // Last input, move to restore button
                    Navigation.setFocusIndex(12);
                    var restoreButton = document.querySelector(
                      "#" + self.id + ' [data-action="restore"]'
                    );
                    if (restoreButton) {
                      restoreButton.focus();
                    }
                  }
                }
                // Otherwise allow default cursor movement
                return;
              }

              if (e.key === "ArrowUp") {
                var inputElement = e.target;
                var cursorPos = inputElement.selectionStart || 0;
                var textLength = inputElement.value.length;

                // If input is empty or cursor is at the start, allow navigation up
                if (textLength === 0 || cursorPos === 0) {
                  e.preventDefault();
                  e.stopPropagation();
                  // Blur input first
                  inputElement.blur();
                  // Move to previous item
                  if (idx > 0) {
                    Navigation.setFocusIndex(idx - 1);
                    self.handleFocusChange();
                  }
                }
                // Otherwise allow default cursor movement
                return;
              }
            };
          })(j)
        );
      }
    }

    // Refresh navigation to pick up new focusable items
    // Use setTimeout to ensure DOM is fully rendered
    var self = this;
    setTimeout(function () {
      Navigation.refreshFocusableItems();
      // Focus the first input if it exists
      if (self.wordInputs.length > 0 && Navigation.getFocusIndex() === 0) {
        self.handleFocusChange();
      }
    }, 0);
  },

  handleInputChangeDebounced: function (index) {
    var self = this;
    if (this._inputHandling) return;
    if (this._inputDebounceTimer) clearTimeout(this._inputDebounceTimer);
    this._inputDebounceIndex = index;
    this._inputDebounceTimer = setTimeout(function () {
      self._inputDebounceTimer = null;
      self.handleInputChange(self._inputDebounceIndex);
    }, 180);
  },

  handleInputChange: function (index) {
    if (this._inputHandling) return;
    var input = this.wordInputs[index];
    if (!input) return;

    var value = input.value;
    var trimmed = value.trim().toLowerCase();
    if (trimmed.indexOf(" ") === -1) return;

    this._inputHandling = true;
    var self = this;

    var words = trimmed.split(/\s+/).filter(function (w) {
      return w.length > 0;
    });
    if (words.length > 1) {
      input.value = words[0];
      for (var i = 1; i < words.length && index + i < 12; i++) {
        if (this.wordInputs[index + i]) {
          this.wordInputs[index + i].value = words[i];
        }
      }
      setTimeout(function () {
        self.focusNextInput(index);
        self._inputHandling = false;
      }, 0);
    } else {
      this._inputHandling = false;
    }
  },

  focusNextInput: function (currentIndex) {
    // If we're at the last input (index 11), move to restore button
    if (currentIndex >= 11) {
      Navigation.setFocusIndex(12);
      var restoreButton = document.querySelector(
        "#" + this.id + ' [data-action="restore"]'
      );
      if (restoreButton) {
        // Blur current input if it has focus
        if (
          this.wordInputs[currentIndex] &&
          document.activeElement === this.wordInputs[currentIndex]
        ) {
          this.wordInputs[currentIndex].blur();
        }
        restoreButton.focus();
      }
      return;
    }

    // Find next empty input
    for (var i = currentIndex + 1; i < 12; i++) {
      if (this.wordInputs[i] && !this.wordInputs[i].value.trim()) {
        Navigation.setFocusIndex(i);
        // Blur current input if it has focus
        if (
          this.wordInputs[currentIndex] &&
          document.activeElement === this.wordInputs[currentIndex]
        ) {
          this.wordInputs[currentIndex].blur();
        }
        this.wordInputs[i].focus();
        return;
      }
    }

    // If no empty input found, move to next input anyway
    if (currentIndex < 11) {
      var nextIndex = currentIndex + 1;
      Navigation.setFocusIndex(nextIndex);
      // Blur current input if it has focus
      if (
        this.wordInputs[currentIndex] &&
        document.activeElement === this.wordInputs[currentIndex]
      ) {
        this.wordInputs[currentIndex].blur();
      }
      this.wordInputs[nextIndex].focus();
    }
  },

  updateSoftkeys: function () {
    var centerSoftkey = document.getElementById("softkey-center");
    if (!centerSoftkey) return;

    var focusIndex = Navigation.getFocusIndex();
    var focusableItems = document.querySelectorAll(
      "#" + this.id + " .focusable, #" + this.id + " .menu-item"
    );

    // Show SELECT for inputs and restore button
    if (focusIndex >= 0 && focusIndex <= 12 && focusableItems[focusIndex]) {
      centerSoftkey.textContent = "SELECT";
      centerSoftkey.style.color = "#000000";
      centerSoftkey.style.fontWeight = "bold";
    } else {
      centerSoftkey.textContent = "";
    }
  },

  getMnemonic: function () {
    var words = [];
    for (var i = 0; i < 12; i++) {
      if (this.wordInputs[i]) {
        var word = this.wordInputs[i].value.trim().toLowerCase();
        if (word) {
          words.push(word);
        }
      }
    }
    return words.join(" ");
  },

  validateMnemonic: function (mnemonic) {
    // Check if BIP39 is loaded
    if (typeof window.bip39 === "undefined") {
      return {
        valid: false,
        error: "BIP39 library not loaded",
      };
    }

    // Check if mnemonic is not empty
    if (!mnemonic || !mnemonic.trim()) {
      return {
        valid: false,
        error: "Please enter all 12 words",
      };
    }

    // Check word count
    var words = mnemonic.trim().split(/\s+/);
    if (words.length !== 12) {
      return {
        valid: false,
        error: "Mnemonic must contain exactly 12 words",
      };
    }

    // Validate using BIP39
    // bip39@2.5.0 API: validateMnemonic(mnemonic)
    var isValid = window.bip39.validateMnemonic(mnemonic);
    if (!isValid) {
      return {
        valid: false,
        error: "Invalid mnemonic. Please check your words.",
      };
    }

    return {
      valid: true,
      error: null,
    };
  },

  showError: function (message) {
    var errorDiv = document.getElementById("restore-error");
    if (errorDiv) {
      errorDiv.textContent = message;
      errorDiv.style.display = "block";
    }
  },

  hideError: function () {
    var errorDiv = document.getElementById("restore-error");
    if (errorDiv) {
      errorDiv.style.display = "none";
    }
  },

  handleSelect: function (action, index) {
    if (action === "restore") {
      this.restoreWallet();
    } else if (index >= 0 && index < 12) {
      // Focus the input when selected
      if (this.wordInputs[index]) {
        this.wordInputs[index].focus();
      }
    }
  },

  restoreWallet: function () {
    // Hide any previous errors
    this.hideError();

    // Get mnemonic from inputs
    var mnemonic = this.getMnemonic();

    // Validate mnemonic
    var validation = this.validateMnemonic(mnemonic);
    if (!validation.valid) {
      this.showError(validation.error);
      return;
    }

    try {
      // Store mnemonic in memory temporarily (will be encrypted in set-password screen)
      WalletService.setTempMnemonic(mnemonic);

      // Navigate to set-password screen to encrypt the wallet
      App.showScreen("set-password");
    } catch (error) {
      console.error("Failed to restore wallet:", error);
      this.showError("Error restoring wallet: " + error.message);
    }
  },

  handleBack: function () {
    App.showScreen("welcome");
  },
};
