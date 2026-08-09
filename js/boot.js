/**
 * Boot - Early error visibility and startup watchdog.
 *
 * Loaded FIRST (before all other scripts). Must stay a separate external
 * file: the privileged app CSP (script-src 'self') blocks inline scripts.
 * Styles for the overlay live in css/style.css (.boot-error), not inline.
 *
 * Firefox 48: no window.onunhandledrejection — window.onerror only.
 */
var Boot = (function () {
  "use strict";

  var WATCHDOG_MS = 15000;

  var started = false;
  var errorShown = false;
  var extraErrors = 0;

  function basename(path) {
    if (!path) return "unknown";
    var s = String(path);
    var i = s.lastIndexOf("/");
    return i >= 0 ? s.substring(i + 1) : s;
  }

  function showOverlay(message, source, lineno) {
    if (!document.body) return;

    if (errorShown) {
      extraErrors++;
      var counter = document.getElementById("boot-error-count");
      if (counter) {
        counter.textContent = "(+" + extraErrors + " more)";
      }
      return;
    }
    errorShown = true;

    var overlay = document.createElement("div");
    overlay.id = "boot-error";
    overlay.className = "boot-error";

    var title = document.createElement("div");
    title.className = "boot-error-title";
    title.textContent = "App Error";
    overlay.appendChild(title);

    var msg = document.createElement("div");
    msg.textContent = String(message || "Unknown error");
    overlay.appendChild(msg);

    if (source || lineno) {
      var loc = document.createElement("div");
      loc.className = "boot-error-loc";
      loc.textContent = basename(source) + (lineno ? ":" + lineno : "");
      overlay.appendChild(loc);
    }

    var counterEl = document.createElement("div");
    counterEl.id = "boot-error-count";
    overlay.appendChild(counterEl);

    document.body.appendChild(overlay);
  }

  function hideLoading() {
    var el = document.getElementById("boot-loading");
    if (el) {
      el.style.display = "none";
    }
  }

  window.onerror = function (message, source, lineno) {
    // Auto-show the overlay only while booting (that's where a silent
    // failure means a permanent white screen). After the app has started,
    // an uncaught error in some handler shouldn't cover a working UI —
    // keep the old behavior (console only). Boot.fatal() always shows.
    if (!started || errorShown) {
      showOverlay(message, source, lineno);
    }
    return false; // let the console log it too
  };

  // Watchdog: if the app never reaches first render, tell the user
  // something is still happening instead of leaving a frozen screen.
  setTimeout(function () {
    if (started || errorShown) return;
    var el = document.getElementById("boot-loading");
    if (el) {
      el.textContent = "Still loading… please wait";
    }
  }, WATCHDOG_MS);

  return {
    fatal: function (message) {
      hideLoading();
      showOverlay(message, null, null);
    },
    appStarted: function () {
      started = true;
      hideLoading();
    },
  };
})();
