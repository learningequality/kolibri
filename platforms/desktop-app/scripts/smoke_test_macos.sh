#!/bin/bash
set -e  # Exit on any error

DMG_PATH="${1:-dist/kolibri-*.dmg}"
MOUNT_POINT="/Volumes/Kolibri"
APP_PATH="/tmp/Kolibri.app"

echo "========================================"
echo "  macOS Installation Smoke Test"
echo "========================================"
echo "DMG: $DMG_PATH"
echo ""

# 1. Mount and verify DMG
echo "[1/6] Mounting and verifying DMG..."
hdiutil attach "$DMG_PATH" -mountpoint "$MOUNT_POINT"
sleep 2

if [ ! -d "$MOUNT_POINT/Kolibri.app" ]; then
    echo "ERROR: Kolibri.app not found in DMG"
    echo "DMG contents:"
    ls -la "$MOUNT_POINT" || true
    hdiutil detach "$MOUNT_POINT"
    exit 1
fi

# Find the versioned executable (e.g., Kolibri-0.19.0b2)
EXECUTABLE=$(find "$MOUNT_POINT/Kolibri.app/Contents/MacOS/" -maxdepth 1 -name "Kolibri-*" | head -1 | xargs basename)
if [ -z "$EXECUTABLE" ]; then
    echo "ERROR: Kolibri executable not found"
    ls -la "$MOUNT_POINT/Kolibri.app/Contents/MacOS" || true
    hdiutil detach "$MOUNT_POINT"
    exit 1
fi
echo "✓ DMG verified, found executable: $EXECUTABLE"

# 2. Copy app and unmount DMG
echo "[2/6] Copying app bundle..."
rm -rf "$APP_PATH"
cp -R "$MOUNT_POINT/Kolibri.app" "$APP_PATH"
hdiutil detach "$MOUNT_POINT"
echo "✓ App copied and DMG unmounted"

# 3. Launch and verify process
echo "[3/6] Launching Kolibri..."
open "$APP_PATH"
sleep 30

if ! pgrep -f "Kolibri.app" > /dev/null; then
    echo "ERROR: Kolibri process not running"
    ps aux | grep -i kolibri || true
    exit 1
fi
APP_PID=$(pgrep -f "Kolibri.app" | head -1)
echo "✓ Process running (PID: $APP_PID)"

# 4. Parse logs for port
echo "[4/6] Parsing logs for port..."
KOLIBRI_LOG="${HOME}/.kolibri/logs/kolibri-app.txt"

# Wait for log file
TIMEOUT=10
ELAPSED=0
while [ ! -f "$KOLIBRI_LOG" ]; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "ERROR: Log file not found at $KOLIBRI_LOG after ${TIMEOUT}s"
        find "$HOME" -name "kolibri-app.txt" 2>/dev/null || true
        pkill -f "Kolibri.app" || true
        exit 1
    fi
done

sleep 2
PORT=$(grep -oE "localhost:[0-9]+" "$KOLIBRI_LOG" | head -1 | cut -d: -f2)
if [ -z "$PORT" ]; then
    # Try alternative pattern
    PORT=$(grep -oE "port [0-9]+" "$KOLIBRI_LOG" | head -1 | awk '{print $2}')
fi
if [ -z "$PORT" ]; then
    echo "ERROR: Could not detect port from logs"
    echo "=== Log contents ==="
    cat "$KOLIBRI_LOG"
    pkill -f "Kolibri.app" || true
    exit 1
fi
echo "✓ Detected port: $PORT"

# 5. Check API endpoint
echo "[5/6] Checking API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/public/info/" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "ERROR: API endpoint returned HTTP $HTTP_CODE (expected 200)"
    echo "=== Log contents ==="
    cat "$KOLIBRI_LOG"
    pkill -f "Kolibri.app" || true
    exit 1
fi

API_RESPONSE=$(curl -s "http://localhost:$PORT/api/public/info/" || echo "{}")
if ! echo "$API_RESPONSE" | grep -q "kolibri_version"; then
    echo "ERROR: API response missing kolibri_version"
    echo "Response: $API_RESPONSE"
    pkill -f "Kolibri.app" || true
    exit 1
fi
echo "✓ API responding correctly (HTTP $HTTP_CODE)"
echo "API Response: $API_RESPONSE" | head -c 200
echo ""

# 6. Check for errors in logs
echo "[6/6] Checking for errors in logs..."
ERROR_COUNT=$(grep -i "error" "$KOLIBRI_LOG" | grep -v "DEBUG" | wc -l | tr -d ' ')
if [ "$ERROR_COUNT" -gt 0 ]; then
    echo "WARNING: Found $ERROR_COUNT error messages in logs"
    echo "=== Error lines (first 10) ==="
    grep -i "error" "$KOLIBRI_LOG" | grep -v "DEBUG" | head -10
else
    echo "✓ No errors found in logs"
fi

echo ""
echo "========================================"
echo "  ✓ All smoke tests passed!"
echo "========================================"
