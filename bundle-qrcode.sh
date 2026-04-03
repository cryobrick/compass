#!/bin/bash
# Bundle QR code library
# 
# Install from project root:
#   npm install qrcode-generator esbuild

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "📦 Bundling QR code library..."

# Check if node_modules exists
if [ ! -d "$PROJECT_ROOT/node_modules" ]; then
  echo "❌ Error: node_modules not found"
  echo "Run from project root: npm install qrcode-generator esbuild"
  exit 1
fi

# Check for required packages
if [ ! -d "$PROJECT_ROOT/node_modules/qrcode-generator" ]; then
  echo "❌ Error: qrcode-generator not found. Run: npm install qrcode-generator esbuild"
  exit 1
fi

echo "  → Running esbuild (ES2015 target)..."
cd "$PROJECT_ROOT"

./node_modules/.bin/esbuild compass/entry-qrcode.js \
  --bundle \
  --format=iife \
  --platform=browser \
  --target=es2015 \
  --outfile=compass/js/lib/qrcode-bundle.js

cd "$SCRIPT_DIR"

# Check bundle
if [ ! -s js/lib/qrcode-bundle.js ]; then
  echo "❌ Error: Bundle creation failed"
  exit 1
fi

BUNDLE_SIZE=$(wc -c < js/lib/qrcode-bundle.js | tr -d ' ')
BUNDLE_KB=$((BUNDLE_SIZE / 1024))

echo "✅ QR code bundle created: js/lib/qrcode-bundle.js (${BUNDLE_KB}KB)"

