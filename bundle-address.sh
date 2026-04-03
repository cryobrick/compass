#!/bin/bash
# Bundle BIP32 + bitcoinjs-lib for Native SegWit address generation
# 
# Install from project root:
#   npm install bip32@1.0.2 bitcoinjs-lib@3.3.2 buffer crypto-browserify esbuild stream-browserify

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 Bundling address libraries (BIP32 + bitcoinjs-lib)..."

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo "❌ Error: node_modules not found"
  echo "Run from project root: npm install bip32@1.0.2 bitcoinjs-lib@3.3.2 buffer crypto-browserify esbuild stream-browserify"
  exit 1
fi

# Check for required packages
for pkg in bip32 bitcoinjs-lib buffer crypto-browserify; do
  if [ ! -d "$PROJECT_ROOT/node_modules/$pkg" ]; then
    echo "❌ Error: $pkg not found. Run: npm install bip32@1.0.2 bitcoinjs-lib@3.3.2 buffer crypto-browserify esbuild stream-browserify"
    exit 1
  fi
done

echo "  → Running esbuild (ES2015 target)..."
cd "$PROJECT_ROOT"

./node_modules/.bin/esbuild compass/entry-address.js \
  --bundle \
  --format=iife \
  --platform=browser \
  --target=es2015 \
  --outfile=compass/js/lib/address-bundle.js \
  --define:process.browser=true \
  --define:process.env.NODE_ENV='"production"' \
  --define:global=window \
  --alias:buffer=buffer \
  --alias:stream=stream-browserify \
  --alias:crypto=crypto-browserify \
  --alias:process=process

cd "$SCRIPT_DIR"

# Check bundle
if [ ! -s js/lib/address-bundle.js ]; then
  echo "❌ Error: Bundle creation failed"
  exit 1
fi

BUNDLE_SIZE=$(wc -c < js/lib/address-bundle.js | tr -d ' ')
BUNDLE_KB=$((BUNDLE_SIZE / 1024))

echo "✅ Address bundle created: js/lib/address-bundle.js (${BUNDLE_KB}KB)"
echo ""
echo "Next: Update wallet service to use address generation functions"

