#!/usr/bin/env node
/**
 * ES2015 syntax gate for KaiOS (Firefox 48 / Gecko 48).
 *
 * Parses every shipped non-bundle JS file strictly as ES2015 (acorn
 * ecmaVersion 6). Anything newer — trailing commas in call/param lists
 * (ES2017), async/await, object spread, optional chaining, etc. — fails
 * the build here instead of throwing a SyntaxError on the device.
 *
 * Modern browsers and Node accept ES2017+ syntax, so desktop testing
 * cannot catch these; this gate is the only automated protection.
 * (Real-world case: a trailing comma in home.js broke the app on every
 * Gecko-48 device with "SyntaxError: expected expression, got ')'".)
 *
 * acorn is resolved from the PARENT directory's node_modules, same
 * convention as bundle-*.sh use the parent's esbuild.
 */
var fs = require("fs");
var path = require("path");

var ROOT = __dirname;

var acorn;
try {
  acorn = require(path.join(ROOT, "..", "node_modules", "acorn"));
} catch (e) {
  console.error("ERROR: acorn not found in parent node_modules.");
  console.error("Fix: cd " + path.dirname(ROOT) + " && npm install acorn");
  process.exit(1);
}

var DIRS = ["js", path.join("js", "screens"), path.join("js", "services")];

var files = [];
DIRS.forEach(function (dir) {
  var abs = path.join(ROOT, dir);
  fs.readdirSync(abs).forEach(function (name) {
    if (name.slice(-3) === ".js") {
      files.push(path.join(dir, name));
    }
  });
});

var failures = 0;
files.forEach(function (rel) {
  var source = fs.readFileSync(path.join(ROOT, rel), "utf8");
  try {
    acorn.parse(source, { ecmaVersion: 6 });
  } catch (e) {
    failures++;
    var loc = e.loc ? e.loc.line + ":" + e.loc.column : "?";
    console.error("NOT ES2015: " + rel + ":" + loc + " — " + e.message);
  }
});

if (failures > 0) {
  console.error(
    "\n" + failures + " file(s) use syntax newer than ES2015 — " +
    "this WILL crash Firefox 48 / KaiOS 2.5 at parse time."
  );
  process.exit(1);
}
console.log("ES2015 check passed (" + files.length + " files)");
