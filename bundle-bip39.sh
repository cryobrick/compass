#!/bin/bash
# Bundle BIP39 library only (for mnemonic generation)
# 
# Install from project root:
#   npm install bip39@2.5.0 buffer esbuild

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 Bundling BIP39 library for mnemonic generation..."

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo "❌ Error: node_modules not found"
  echo "Run from project root: npm install bip39@2.5.0 buffer esbuild"
  exit 1
fi

# Check for required packages
for pkg in bip39 buffer; do
  if [ ! -d "$PROJECT_ROOT/node_modules/$pkg" ]; then
    echo "❌ Error: $pkg not found. Run: npm install bip39@2.5.0 buffer esbuild"
    exit 1
  fi
done

echo "  → Running esbuild (ES2015 target)..."
cd "$PROJECT_ROOT"

./node_modules/.bin/esbuild compass/entry-bip39.js \
  --bundle \
  --format=iife \
  --platform=browser \
  --target=es2015 \
  --outfile=compass/js/lib/bip39-bundle.js \
  --define:process.browser=true \
  --define:global=window \
  --alias:buffer=buffer \
  --alias:stream=stream-browserify

cd "$SCRIPT_DIR"

# Check bundle
if [ ! -s js/lib/bip39-bundle.js ]; then
  echo "❌ Error: Bundle creation failed"
  exit 1
fi

BUNDLE_SIZE=$(wc -c < js/lib/bip39-bundle.js | tr -d ' ')
BUNDLE_KB=$((BUNDLE_SIZE / 1024))

echo "✅ BIP39 bundle created: js/lib/bip39-bundle.js (${BUNDLE_KB}KB)"
echo ""
echo "Next: Update create-wallet.js to use window.bip39.generateMnemonic()"

