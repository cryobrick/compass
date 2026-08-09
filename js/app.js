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
    // localStorage can throw (SecurityError) on some devices. Don't fall
    // through to create-pin in that case — setting a PIN would fail too.
    var pinSet;
    try {
      pinSet = PinService.hasPinSet();
    } catch (e) {
      Boot.fatal("Storage unavailable: " + e.message);
      return;
    }
    showScreen(pinSet ? "compass" : "create-pin");

    // First screen is up — hide the boot indicator and start loading the
    // heavy library bundles in the background (after a short delay so the
    // first paint and D-pad input aren't blocked by bundle parsing).
    Boot.appStarted();
    if (typeof LibLoader !== "undefined") {
      setTimeout(function () {
        LibLoader.startBackgroundLoad();
      }, 400);
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

// Start app when DOM is ready. Any startup error becomes a readable
// on-screen message instead of a silent white screen.
function startApp() {
  try {
    App.init();
  } catch (e) {
    if (typeof Boot !== "undefined") {
      Boot.fatal(e.message + (e.stack ? "\n" + e.stack : ""));
    }
    console.error("App init failed:", e);
  }
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", startApp);
} else {
  startApp();
}
