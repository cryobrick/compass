/**
 * Welcome Screen - Main menu
 * Shows Create Wallet only if no wallet exists
 */
var WelcomeScreen = {
  id: "welcome-screen",

  render: function () {
    // Initial render - will be updated in onEnter based on wallet state
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="screen-header">' +
      '<div class="header-title">Compass</div>' +
      '<div class="header-subtitle">Air-Gapped Bitcoin Wallet</div>' +
      "</div>" +
      '<div class="screen-content">' +
      '<div class="menu-list" id="welcome-menu-list"></div>' +
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
    // Update menu based on current wallet state
    this.updateMenu();

    Navigation.setCallbacks({
      onSelect: this.handleSelect.bind(this),
      onBack: this.handleBack.bind(this),
    });
  },

  updateMenu: function () {
    var menuList = document.getElementById("welcome-menu-list");
    if (!menuList) return;

    var menuHtml = "";
    var index = 0;

    // Only show "Create Wallet" if no wallet exists
    if (!WalletService.hasWallet()) {
      menuHtml +=
        '<div class="menu-item" data-index="' +
        index +
        '" data-action="create-wallet">' +
        "Create Wallet" +
        "</div>";
      index++;
    }

    // Always show "Restore Wallet"
    menuHtml +=
      '<div class="menu-item" data-index="' +
      index +
      '" data-action="restore-wallet">' +
      "Restore Wallet" +
      "</div>";

    menuList.innerHTML = menuHtml;

    // Refresh navigation to pick up new menu items
    Navigation.refreshFocusableItems();
  },

  onExit: function () {
    // Cleanup
  },

  handleSelect: function (action, index) {
    switch (action) {
      case "create-wallet":
        App.showScreen("create-wallet");
        break;
      case "restore-wallet":
        App.showScreen("restore-wallet");
        break;
    }
  },

  handleBack: function () {
    // On welcome screen, back should close/minimize the app
    window.close();
  },
};
