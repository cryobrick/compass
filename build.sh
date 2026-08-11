#!/bin/bash

# Compass - KaiOS Build Script
# Packages the app for installation via OmniSD

set -e

# ===================
# VERSION - Update this for each release
# ===================
VERSION="1.1.2"
APP_ID="compass"
APP_ORIGIN="cryobrick.com"

echo "Building Compass v${VERSION} for KaiOS..."

# Navigate to project root
cd "$(dirname "$0")"

# Step 1: Create dist folder
echo "📁 Preparing build..."
rm -rf dist
mkdir -p dist/app
mkdir -p dist/package

# Step 2: Copy app files (strip extended attributes)
echo "📋 Copying app files..."
cp -X index.html dist/app/ 2>/dev/null || cp index.html dist/app/
cp -X manifest.webapp dist/app/ 2>/dev/null || cp manifest.webapp dist/app/
cp -rX css dist/app/ 2>/dev/null || cp -r css dist/app/
cp -rX js dist/app/ 2>/dev/null || cp -r js dist/app/
# Clean any extended attributes that might have been copied
find dist/app -type f -exec xattr -c {} \; 2>/dev/null || true

# ES2015 syntax gate — Firefox 48 crashes at parse time on anything newer
# (desktop browsers/Node accept ES2017+, so only this catches it)
echo "🔍 Checking ES2015 syntax compatibility..."
if ! node check-es2015.js; then
  echo "❌ ERROR: ES2015 syntax check failed!"
  exit 1
fi

# Verify critical files are present
echo "🔍 Verifying critical files..."
if [ ! -f "dist/app/js/screens/restore-wallet.js" ]; then
  echo "❌ ERROR: restore-wallet.js not found!"
  exit 1
fi
if ! grep -q "handleFocusChange" "dist/app/js/screens/restore-wallet.js"; then
  echo "❌ ERROR: restore-wallet.js appears to be outdated!"
  exit 1
fi

# Boot/loader scripts must be present
for f in js/boot.js js/services/lib-loader.js; do
  if [ ! -f "dist/app/$f" ]; then
    echo "❌ ERROR: $f not found!"
    exit 1
  fi
done

# Library bundles must exist and be sane-sized.
# js/lib is gitignored — a fresh clone has NO bundles and would otherwise
# silently ship a broken zip. Rebuild with ./bundle-*.sh if this fails.
check_bundle() {
  local f="dist/app/js/lib/$1"
  if [ ! -f "$f" ]; then
    echo "❌ ERROR: $1 missing — run ./bundle-*.sh first!"
    exit 1
  fi
  local size
  size=$(stat -f "%z" "$f" 2>/dev/null || stat -c "%s" "$f")
  if [ "$size" -lt "$2" ]; then
    echo "❌ ERROR: $1 is ${size} bytes, expected >= $2 — rebuild with ./bundle-*.sh!"
    exit 1
  fi
}
check_bundle bip39-bundle.js 500000
check_bundle address-bundle.js 1000000
check_bundle qrcode-bundle.js 30000

# Manifest version must match the build version
if ! grep -q "\"version\": \"${VERSION}\"" manifest.webapp; then
  echo "❌ ERROR: manifest.webapp version does not match ${VERSION}!"
  exit 1
fi
echo "✅ Critical files verified"

# Step 3: Copy icons (if they exist)
if [ -d "icons" ]; then
  cp -r icons dist/app/
else
  echo "⚠️  Warning: icons folder not found!"
  echo "   Please create:"
  echo "   - icons/compass-56.png (56x56 pixels, required)"
  echo "   - icons/compass-112.png (112x112 pixels, recommended)"
fi

# Step 4: Create application.zip
echo "🗜️  Creating application.zip..."
cd dist/app
zip -r -X ../package/application.zip . -x "*.DS_Store" -x "__MACOSX/*" -x "*/__MACOSX/*" -x "*.DS_Store/*"
cd ../..

# Step 5: Copy manifest.webapp to package root
cp manifest.webapp dist/package/

# Step 6: Create metadata.json
cat > dist/package/metadata.json << EOF
{"version": 1, "manifestURL": "app://${APP_ORIGIN}/manifest.webapp"}
EOF

# Step 7: Create final OmniSD package
ZIP_NAME="${APP_ID}-v${VERSION}.zip"
echo "📦 Creating ${ZIP_NAME}..."
cd dist/package
zip -r -X "../../dist/${ZIP_NAME}" application.zip manifest.webapp metadata.json -x "*.DS_Store" -x "__MACOSX/*"
cd ../..

# Step 8: Remove Mac extended attributes from final zip
echo "🧹 Cleaning Mac metadata..."
xattr -c "dist/${ZIP_NAME}" 2>/dev/null || true

# Step 9: Cleanup
rm -rf dist/app dist/package

# Step 10: Final verification
echo ""
echo "🔍 Final verification..."
if [ -f "dist/${ZIP_NAME}" ]; then
  ZIP_SIZE=$(stat -f "%z" "dist/${ZIP_NAME}" 2>/dev/null || stat -c "%s" "dist/${ZIP_NAME}" 2>/dev/null || echo "unknown")
  echo "   Zip file: dist/${ZIP_NAME}"
  echo "   Size: ${ZIP_SIZE} bytes"
  echo "✅ Build complete!"
else
  echo "❌ ERROR: Build failed - zip file not created!"
  exit 1
fi

echo ""
ls -lh "dist/${ZIP_NAME}"
echo ""
echo "📱 To install on KaiOS device:"
echo "   IMPORTANT: Uninstall the old version first!"
echo "   1. On device: Settings → Apps → Compass → Uninstall"
echo "   2. Copy dist/${ZIP_NAME} to device (via USB/SD card)"
echo "   3. Open OmniSD on device"
echo "   4. Select and install ${ZIP_NAME}"
echo ""
echo "   If restore wallet still doesn't work:"
echo "   - Clear app data: Settings → Apps → Compass → Clear Data"
echo "   - Restart device"
echo "   - Reinstall the app"

