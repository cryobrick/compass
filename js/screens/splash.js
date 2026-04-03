/**
 * Splash Screen - UI Only
 */
var SplashScreen = {
  id: "splash-screen",

  render: function () {
    return (
      '<div id="' +
      this.id +
      '" class="screen">' +
      '<div class="splash-content">' +
      '<div class="splash-title">Compass</div>' +
      '<div class="splash-subtitle">Loading...</div>' +
      "</div>" +
      "</div>"
    );
  },

  onEnter: function () {
    // Auto-navigate after 2 seconds
    // Check if wallet exists to determine destination
    setTimeout(function () {
      if (WalletService.hasWallet()) {
        // Wallet exists, go to home
        App.showScreen("home");
      } else {
        // No wallet, go to welcome
        App.showScreen("welcome");
      }
    }, 1000);
  },

  onExit: function () {
    // Cleanup
  },
};
