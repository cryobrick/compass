// process-shim.js - Process polyfill for browser
if (typeof process === "undefined") {
  var process = {
    browser: true,
    env: {},
    version: "",
    versions: {},
    nextTick: function (fn) {
      setTimeout(fn, 0);
    },
  };
  if (typeof window !== "undefined") {
    window.process = process;
  }
  if (typeof global !== "undefined") {
    global.process = process;
  }
}
