/**
 * LibLoader - Lazy loading for the heavy library bundles.
 *
 * The three bundles (~2.4MB total) used to be loaded synchronously in
 * index.html, which blocked DOMContentLoaded — on low-memory devices
 * (JioPhone) the app never reached first paint. They are now injected
 * after the first screen renders.
 *
 * IMPORTANT: bip39-bundle and address-bundle BOTH assign window.Buffer;
 * address-bundle's Buffer must win (matches the old static script order).
 * Keep the background chain sequential: qrcode -> bip39 -> address.
 * Do not parallelize.
 */
var LibLoader = (function () {
  "use strict";

  var SOURCES = {
    qrcode: "js/lib/qrcode-bundle.js",
    bip39: "js/lib/bip39-bundle.js",
    address: "js/lib/address-bundle.js",
  };

  // Globals set by each bundle's entry file on successful init
  var SENTINELS = {
    qrcode: "qrcodeLoaded",
    bip39: "bip39Loaded",
    address: "addressLibsLoaded",
  };

  // Delay between background loads so the single-core CPU can repaint
  var STAGGER_MS = 100;

  // name -> "pending" | "loading" | "loaded" | "error"
  var status = { qrcode: "pending", bip39: "pending", address: "pending" };
  var errors = { qrcode: null, bip39: null, address: null };
  var callbacks = { qrcode: [], bip39: [], address: [] };

  function settle(name, err) {
    status[name] = err ? "error" : "loaded";
    errors[name] = err || null;
    var cbs = callbacks[name];
    callbacks[name] = [];
    for (var i = 0; i < cbs.length; i++) {
      try {
        cbs[i](err || null);
      } catch (e) {
        console.error("LibLoader callback error (" + name + "): " + e.message);
      }
    }
  }

  function load(name) {
    if (status[name] !== "pending") return;
    status[name] = "loading";

    var script = document.createElement("script");
    script.src = SOURCES[name];
    script.onload = function () {
      if (window[SENTINELS[name]] === true) {
        settle(name, null);
      } else {
        // Bundle ran but its own init failed (e.g. entry-address.js
        // catches internally and sets addressLibsError)
        var detail =
          name === "address" ? window.addressLibsError : null;
        settle(name, detail || "Library failed to initialize");
      }
    };
    script.onerror = function () {
      settle(name, "Failed to load " + SOURCES[name]);
    };
    document.body.appendChild(script);
  }

  function ensure(name, callback) {
    if (!SOURCES[name]) {
      callback("Unknown library: " + name);
      return;
    }
    if (status[name] === "loaded" || status[name] === "error") {
      callback(errors[name]);
      return;
    }
    callbacks[name].push(callback);
    if (status[name] === "pending") {
      load(name);
    }
  }

  function startBackgroundLoad() {
    // Sequential chain; continues even if a load fails. If a screen
    // already requested a lib via ensure(), load() is a no-op for it.
    ensure("qrcode", function () {
      setTimeout(function () {
        ensure("bip39", function () {
          setTimeout(function () {
            ensure("address", function () {});
          }, STAGGER_MS);
        });
      }, STAGGER_MS);
    });
  }

  return {
    ensure: ensure,
    isLoaded: function (name) {
      return status[name] === "loaded" && window[SENTINELS[name]] === true;
    },
    getStatus: function (name) {
      return status[name] || "pending";
    },
    getError: function (name) {
      return errors[name] || null;
    },
    startBackgroundLoad: startBackgroundLoad,
  };
})();
