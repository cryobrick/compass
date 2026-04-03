/**
 * Compass - Main Application (UI Only)
 */

var App = (function () {
  // Screen registry
  var screens = {
    splash: SplashScreen,
    compass: CompassScreen,
    "create-pin": CreatePinScreen,
    welcome: WelcomeScreen,
    "create-wallet": CreateWalletScreen,
    "restore-wallet": RestoreWalletScreen,
    "set-password": SetPasswordScreen,
    "enter-password": EnterPasswordScreen,
    home: HomeScreen,
    backup: BackupScreen,
    "address-explorer": AddressExplorerScreen,
    "export-xpub": ExportXpubScreen,
    "ready-to-sign": ReadyToSignScreen,
    help: HelpScreen,
  };

  var currentScreen = null;
  var container = null;

  function init() {
    container = document.getElementById("app-container");

    // Initialize navigation
    Navigation.init();

    // Render all screens
    renderScreens();

    // First-time or migration: no PIN set → Create PIN; else Compass (plausible deniability)
    if (!PinService.hasPinSet()) {
      showScreen("create-pin");
    } else {
      showScreen("compass");
    }
  }

  function renderScreens() {
    var html = "";
    for (var name in screens) {
      if (screens.hasOwnProperty(name)) {
        html += screens[name].render();
      }
    }
    container.innerHTML = html;
  }

  function showScreen(name) {
    var screen = screens[name];
    if (!screen) {
      console.error("Screen not found: " + name);
      return;
    }

    // Exit current screen
    if (currentScreen && currentScreen.onExit) {
      currentScreen.onExit();
    }

    // Hide all screens
    var allScreens = container.querySelectorAll(".screen");
    for (var i = 0; i < allScreens.length; i++) {
      allScreens[i].classList.remove("active");
    }

    // Show new screen
    var screenEl = document.getElementById(screen.id);
    if (screenEl) {
      screenEl.classList.add("active");
    }

    // Update navigation for new screen
    Navigation.setScreen(screen.id);

    // Enter new screen
    currentScreen = screen;
    if (screen.onEnter) {
      screen.onEnter();
    }
  }

  function getCurrentScreen() {
    return currentScreen;
  }

  // Public API
  return {
    init: init,
    showScreen: showScreen,
    getCurrentScreen: getCurrentScreen,
  };
})();

// Start app when DOM is ready
document.addEventListener("DOMContentLoaded", function () {
  App.init();
});
