#!/bin/bash
set -e  # Exit on any error

INSTALLER_PATH="${1:-dist-installer/kolibri-setup-*-unsigned.exe}"
INSTALL_DIR="C:/Program Files/Kolibri"
LOG_FILE="smoke_test_install.log"

echo "========================================"
echo "  Windows Installation Smoke Test"
echo "========================================"
echo "Installer: $INSTALLER_PATH"
echo ""

# 1. Install
echo "[1/6] Installing Kolibri..."
"$INSTALLER_PATH" //VERYSILENT //SUPPRESSMSGBOXES //LOG="$LOG_FILE" || {
    echo "ERROR: Installer exited with code $?"
    head -100 "$LOG_FILE" 2>/dev/null || echo "Log file not found"
    exit 1
}

# Wait for installation to complete (up to 2 minutes)
echo "Waiting for installation to complete..."
TIMEOUT=120
ELAPSED=0
while [ ! -f "$INSTALL_DIR/unins000.exe" ]; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "ERROR: Installation timed out after ${TIMEOUT}s"
        echo "=== Install log (first 100 lines) ==="
        head -100 "$LOG_FILE" 2>/dev/null || echo "Log file not found"
        exit 1
    fi
done
echo "✓ Installation completed in ${ELAPSED}s"

# 2. Verify installation
echo "[2/6] Verifying installation files..."
if [ ! -f "$INSTALL_DIR/KolibriApp.exe" ]; then
    echo "ERROR: KolibriApp.exe not found at $INSTALL_DIR/KolibriApp.exe"
    echo "Install directory contents:"
    ls -la "$INSTALL_DIR" || echo "Install directory not found"
    exit 1
fi
if [ ! -d "$INSTALL_DIR/nssm" ]; then
    echo "ERROR: nssm directory not found at $INSTALL_DIR/nssm"
    exit 1
fi
echo "✓ Installation files verified"

# 3. Wait for Kolibri service to be running (installer starts it automatically)
echo "[3/6] Waiting for Kolibri service to start..."
TIMEOUT=60
ELAPSED=0
while ! sc query Kolibri | grep -q "RUNNING"; do
    sleep 2
    ELAPSED=$((ELAPSED + 2))
    if [ $ELAPSED -ge $TIMEOUT ]; then
        echo "ERROR: Kolibri service did not start within ${TIMEOUT}s"
        sc query Kolibri || true
        exit 1
    fi
done
echo "✓ Kolibri service is running"

# 4. Wait for the service to create logs
echo "[4/6] Waiting for service logs..."
KOLIBRI_LOG="/c/ProgramData/kolibri/logs/kolibri-app.txt"
sleep 10

if [ ! -f "$KOLIBRI_LOG" ]; then
    echo "ERROR: Log file not found at $KOLIBRI_LOG"
    echo "Looking for log file in alternative locations..."
    find /c/ProgramData -name "kolibri-app.txt" 2>/dev/null || true
    exit 1
fi

# Parse port from log (look for "localhost:PORT" or "port 8080")
PORT=$(grep -oE "localhost:[0-9]+" "$KOLIBRI_LOG" | head -1 | cut -d: -f2)
if [ -z "$PORT" ]; then
    # Try alternative pattern: "port 8080"
    PORT=$(grep -oE "port [0-9]+" "$KOLIBRI_LOG" | head -1 | awk '{print $2}')
fi
if [ -z "$PORT" ]; then
    echo "ERROR: Could not detect port from logs"
    echo "=== Log contents (first 100 lines) ==="
    head -100 "$KOLIBRI_LOG"
    exit 1
fi
echo "✓ Detected port: $PORT"

# 5. Check API endpoint
echo "[5/6] Checking API endpoint..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://localhost:$PORT/api/public/info/" || echo "000")
if [ "$HTTP_CODE" != "200" ]; then
    echo "ERROR: API endpoint returned HTTP $HTTP_CODE (expected 200)"
    echo "=== Log contents (first 100 lines) ==="
    head -100 "$KOLIBRI_LOG"
    exit 1
fi

API_RESPONSE=$(curl -s "http://localhost:$PORT/api/public/info/" || echo "{}")
if ! echo "$API_RESPONSE" | grep -q "kolibri_version"; then
    echo "ERROR: API response missing kolibri_version"
    echo "Response: $API_RESPONSE"
    exit 1
fi
echo "✓ API responding correctly (HTTP $HTTP_CODE)"
echo "API Response: $API_RESPONSE" | head -c 200
echo ""

# 6. Check for errors in logs
echo "[6/6] Checking for errors in logs..."
ERROR_COUNT=$(grep -i "error" "$KOLIBRI_LOG" | grep -v "DEBUG" | wc -l || echo "0")
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
