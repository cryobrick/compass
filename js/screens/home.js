/**
 * Home Screen - Main wallet menu
 */
var HomeScreen = {
  id: "home-screen",

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Compass</div>' +
      '<div class="header-subtitle">Bitcoin Wallet</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div class="menu-list">' +
      '<div class="menu-item" data-index="0" data-action="ready-to-sign">' +
      "Ready To Sign" +
      "</div>" +
      '<div class="menu-item" data-index="1" data-action="address-explorer">' +
      "Address Explorer" +
      "</div>" +
      '<div class="menu-item" data-index="2" data-action="export-xpub">' +
      "Export XPUB" +
      "</div>" +
      '<div class="menu-item" data-index="3" data-action="backup">' +
      "Backup" +
      "</div>" +
      '<div class="menu-item" data-index="4" data-action="secure-logout">' +
      "Secure Logout" +
      "</div>" +
      '<div class="menu-item" data-index="5" data-action="help">' +
      "Help" +
      "</div>" +
      "</div>" +
      "</div>" +
      '<div class="screen-footer">' +
      '<div class="softkey softkey-left"></div>' +
      '<div class="softkey softkey-center">SELECT</div>' +
      '<div class="softkey softkey-right"></div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
    });
  },

  onExit: function () {
    // Cleanup
  },

  handleSelect: function (action, index) {
    switch (action) {
      case "ready-to-sign":
        App.showScreen("ready-to-sign");
        break;
      case "address-explorer":
        this.navigateWithLoading(index, "address-explorer");
        break;
      case "export-xpub":
        this.navigateWithLoading(index, "export-xpub");
        break;
      case "backup":
        this.handleBackup();
        break;
      case "secure-logout":
        this.handleSecureLogout();
        break;
      case "help":
        App.showScreen("help");
        break;
    }
  },

  navigateWithLoading: function (index, screenName) {
    // Show "Loading..." on the menu item for immediate feedback
    var items = document.querySelectorAll("#" + this.id + " .menu-item");
    var item = items[index];
    var originalText = item ? item.textContent : "";
    if (item) {
      item.textContent = "Loading...";
    }
    // Defer navigation to let the UI repaint before heavy computation
    setTimeout(function () {
      App.showScreen(screenName);
      // Restore original text for when user comes back
      if (item) {
        item.textContent = originalText;
      }
    }, 50);
  },

  handleBackup: function () {
    EnterPasswordScreen.setCallbacksForDecryption(
      function (mnemonic) {
        BackupScreen.setMnemonic(mnemonic);
        App.showScreen("backup");
      },
      function () {
        App.showScreen("home");
      },
      {
        subtitle: "Decrypt wallet to backup",
        instructions: "Enter your wallet password to view your mnemonic.",
        buttonText: "Decrypt",
      },
    );
    App.showScreen("enter-password");
  },

  handleSecureLogout: function () {
    // Delete wallet and return to welcome
    WalletService.deleteWallet();
    App.showScreen("welcome");
  },

  handleBack: function () {
    // On home screen, back should close/minimize the app
    window.close();
  },
};
