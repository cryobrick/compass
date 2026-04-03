/**
 * Create Wallet Screen
 * Generates and displays 12-word BIP39 mnemonic
 */
var CreateWalletScreen = {
  id: "create-wallet-screen",
  mnemonic: null,

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Create Wallet</div>' +
      '<div class="header-subtitle">Write down these 12 words</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div id="mnemonic-display" class="mnemonic-list"></div>' +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left">BACK</div>' +
      '<div class="softkey softkey-center" id="softkey-center"></div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    var self = this;
    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
      onSoftLeft: this.handleBack.bind(this),
      onFocusChange: function () {
        self.updateSoftkeys();
      },
    });

    // Generate mnemonic
    this.generateMnemonic();
  },

  onExit: function () {
    this.mnemonic = null;
  },

  generateMnemonic: function () {
    try {
      // Check if BIP39 is loaded
      if (typeof window.bip39 === "undefined") {
        this.showError("BIP39 library not loaded");
        return;
      }

      // Generate 12-word mnemonic (128 bits = 12 words)
      // bip39@2.5.0 API: generateMnemonic(strength)
      this.mnemonic = window.bip39.generateMnemonic(128);
      this.displayMnemonic();
      Navigation.refreshFocusableItems();
      this.updateSoftkeys();
    } catch (error) {
      console.error("Failed to generate mnemonic:", error);
      this.showError("Error: " + error.message);
    }
  },

  displayMnemonic: function () {
    var container = document.getElementById("mnemonic-display");
    if (!container || !this.mnemonic) return;

    var words = this.mnemonic.split(" ");
    if (words.length !== 12) {
      this.showError("Invalid mnemonic length");
      return;
    }

    var html = "";

    // Each word is focusable but NOT selectable (no data-action)
    for (var i = 0; i < words.length; i++) {
      html +=
        '<div class="menu-item mnemonic-word" data-index="' +
        i +
        '">' +
        '<span class="word-number">' +
        (i + 1) +
        ".</span>" +
        '<span class="word-text">' +
        words[i] +
        "</span>" +
        "</div>";
    }

    // Confirm button is the only selectable item
    html +=
      '<div class="menu-item confirm-button" data-index="12" data-action="confirm">' +
      "Confirm Create" +
      "</div>";

    container.innerHTML = html;
  },

  updateSoftkeys: function () {
    var centerSoftkey = document.getElementById("softkey-center");
    if (!centerSoftkey) return;

    var focusIndex = Navigation.getFocusIndex();
    var focusableItems = document.querySelectorAll(
      "#" + this.id + " .menu-item"
    );

    // Only show SELECT when confirm button is focused (index 12)
    if (focusIndex === 12 && focusableItems[12]) {
      centerSoftkey.textContent = "SELECT";
      centerSoftkey.style.color = "#000000";
      centerSoftkey.style.fontWeight = "bold";
    } else {
      centerSoftkey.textContent = "";
    }
  },

  showError: function (message) {
    var container = document.getElementById("mnemonic-display");
    if (container) {
      container.innerHTML =
        '<div class="mnemonic-error" style="padding:20px;text-align:center;color:#cc0000;">' +
        message +
        "</div>";
    }
  },

  handleSelect: function (action, index) {
    // Only confirm button has an action
    if (action === "confirm") {
      this.confirmCreate();
    }
    // Words don't have actions, so nothing happens when selected
  },

  confirmCreate: function () {
    if (!this.mnemonic) {
      alert("Error: No mnemonic to save");
      return;
    }

    try {
      // Store mnemonic in memory temporarily (will be encrypted in set-password screen)
      WalletService.setTempMnemonic(this.mnemonic);

      // Navigate to set-password screen to encrypt the wallet
      App.showScreen("set-password");
    } catch (error) {
      console.error("Failed to save wallet:", error);
      alert("Error saving wallet: " + error.message);
    }
  },

  handleBack: function () {
    App.showScreen("welcome");
  },
};
