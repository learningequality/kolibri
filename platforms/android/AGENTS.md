# Android Emulator Agent Guide

Instructions for Claude agents working autonomously with the Android emulator. Follow these sections in order when starting from scratch, or jump to the relevant section for ongoing work.

## 1. Emulator Setup and Launch

### Check if the emulator is already running
```bash
adb devices
```
If you see `emulator-5554 device`, the emulator is ready — skip to section 2.
If the list is empty or shows `offline`, you need to start the emulator.

### First-time setup (only needed once)
If no AVD has been created yet:
```bash
make setup
```
This downloads the Android SDK, system image, and creates the `kolibri-test` AVD.

### Start the emulator
```bash
make emulator
```
This launches the emulator in the background. Wait for it to finish booting:
```bash
adb wait-for-device
adb shell getprop sys.boot_completed
```
Poll `sys.boot_completed` until it returns `1`. The boot can take 30-60 seconds.

**If the emulator segfaults or crashes**, it's likely a GPU issue. Start with software rendering instead:
```bash
"${ANDROID_SDK_ROOT:-$HOME/Android/Sdk}/emulator/emulator" -avd kolibri-test -gpu guest -no-snapshot &
```

## 2. Build and Install the App

This project uses a Makefile as the primary build interface. Run `make help` to see all available targets.

### Build and install in one step
```bash
make install
```
This builds the debug APK via Gradle and installs it on the connected emulator. The first build takes several minutes; subsequent builds are faster.

Watch for:
- **BUILD SUCCESSFUL**: Proceed to install
- **Compilation errors**: Fix before continuing
- **Python errors**: Check Chaquopy output for syntax issues

Or just build without installing:
```bash
make kolibri.apk.unsigned
```

### Verify the app is installed
```bash
adb shell pm list packages | grep kolibri
```
Should output: `package:org.learningequality.Kolibri`

### Launch the app
```bash
adb shell am start -n org.learningequality.Kolibri/org.learningequality.Kolibri.WebViewActivity
```

### Force stop the app
```bash
adb shell am force-stop org.learningequality.Kolibri
```

### Clear app data (resets to fresh state)
```bash
adb shell pm clear org.learningequality.Kolibri
```
This is needed after Python code changes since Chaquopy caches bytecode.

### Uninstall and reinstall (for signing key mismatches)
```bash
make uninstall && make install
```

### Makefile reference

| Target | Description |
|--------|-------------|
| `make setup` | Complete SDK + emulator setup (first time) |
| `make emulator` | Start the emulator |
| `make kolibri.apk.unsigned` | Build debug APK to dist/ |
| `make install` | Build and install debug APK |
| `make uninstall` | Uninstall app from device |
| `make logcat` | View filtered Kolibri logs |
| `make clean` | Clean build artifacts |
| `make test` | Run unit tests |
| `make lint` | Run Android linter |

### Quick commands

Build + Install + Launch:
```bash
make install && adb shell am start -n org.learningequality.Kolibri/org.learningequality.Kolibri.WebViewActivity
```

Clear logs and monitor:
```bash
adb logcat -c && make logcat
```

## 3. Visual Inspect-Act Loop

This is the core workflow for autonomous UI interaction. Use `/project:screenshot` to run the full loop with instructions, or follow these steps:

### Capture the screen
```bash
mkdir -p /tmp/claude
adb exec-out screencap -p > /tmp/claude/screenshot.png
```
Read the screenshot image at `/tmp/claude/screenshot.png` to see the screen visually.

### Inspect: CDP vs uiautomator

Kolibri is a WebView app. **WebView content and native Android UI require different tools:**

| What you see | Tool | Why |
|---|---|---|
| Kolibri UI (buttons, forms, nav, text) | `python3 scripts/cdp_helper.py dump` | WebView DOM is invisible to uiautomator |
| Native Android dialogs (permissions, system prompts) | `adb shell uiautomator dump /sdcard/window_dump.xml && adb shell cat /sdcard/window_dump.xml` | System dialogs are invisible to CDP |

**Rule of thumb:** If a system dialog with rounded corners is overlaying the app, use uiautomator. For everything else, use CDP.

### Interact: CDP vs adb input

**WebView elements** — click by text via CDP (no coordinate math needed):
```bash
python3 scripts/cdp_helper.py click "CONTINUE"
python3 scripts/cdp_helper.py click "EXPLORE"
```

**Native elements** — tap by coordinates from uiautomator bounds:
```bash
# bounds="[137,1177][943,1331]" → center at (540, 1254)
adb shell input tap 540 1254
```

**Other interactions:**
```bash
adb shell input text "<text>"                    # Type text (encode spaces as %s)
adb shell input swipe 540 1500 540 500 300       # Scroll down
adb shell input swipe 540 500 540 1500 300       # Scroll up
adb shell input keyevent 4                       # Press BACK
adb shell input keyevent 66                      # Press ENTER
adb shell input keyevent 3                       # Press HOME
```

### Verify
Take another screenshot after every interaction. Confirm the UI changed as expected before proceeding.

### CDP helper reference

The CDP helper (`scripts/cdp_helper.py`) uses Chrome DevTools Protocol over ADB to access the WebView DOM. Requires `websockets` (`uv pip install websockets`).

```bash
python3 scripts/cdp_helper.py dump              # List visible DOM elements as JSON
python3 scripts/cdp_helper.py click "Button"    # Click element by exact text match
python3 scripts/cdp_helper.py js "expr"         # Evaluate arbitrary JavaScript
```

### Key event codes
| Code | Key | Code | Key |
|------|-----|------|-----|
| 3 | HOME | 4 | BACK |
| 19 | DPAD_UP | 20 | DPAD_DOWN |
| 21 | DPAD_LEFT | 22 | DPAD_RIGHT |
| 61 | TAB | 66 | ENTER |
| 67 | DEL | 111 | ESCAPE |

## 4. Maestro Flow Development

Maestro flows live in `.maestro/`. Use them for repeatable UI test sequences.

### Develop a new flow
1. **Discover UI elements** using the CDP helper: `python3 scripts/cdp_helper.py dump`. Note the `text` content — Maestro matches WebView elements by text when `androidWebViewHierarchy: devtools` is set.
2. **Write the flow** as a YAML file in `.maestro/`:
   ```yaml
   appId: org.learningequality.Kolibri
   androidWebViewHierarchy: devtools
   ---
   - launchApp
   - tapOn: "CONTINUE"
   ```
3. **Run the flow**:
   ```bash
   ~/.maestro/bin/maestro test .maestro/your-flow.yaml
   ```
4. **Iterate**: If the flow fails, screenshot to see the actual state, adjust selectors or add waits, re-run.

### Install Maestro (if not present)
```bash
make maestro-install
```

### Common Maestro commands
- `launchApp` / `clearState` / `clearKeychain`
- `tapOn: "text"` / `tapOn: { id: "resource-id" }`
- `inputText: "value"`
- `assertVisible: "text"` / `assertNotVisible: "text"`
- `extendedWaitUntil: { visible: "text", timeout: 30000 }`
- `scroll` / `swipe`
- `back` / `hideKeyboard`

## 5. Log Inspection

### Kolibri-filtered logs (streaming)
```bash
make logcat
```

### Python stdout/stderr
```bash
adb logcat -s python.stdout:V python.stderr:V
```

### Specific component tags
```bash
adb logcat -s KolibriWebView:V KolibriServer:V TaskWorkerImpl:V BaseTaskWorker:V
```

### Crash logs
```bash
adb logcat -s AndroidRuntime:E
```

### Recent log snapshot (non-streaming)
```bash
adb logcat -d -t 50
```

### Clear log buffer
```bash
adb logcat -c
```

## 6. Troubleshooting

### App crashes on startup
1. Check crash logs: `adb logcat -s AndroidRuntime:E`
2. Look for Python import errors: `adb logcat -s python.stderr:V`

### Python changes not appearing
Chaquopy caches Python bytecode. Clear app data:
```bash
adb shell pm clear org.learningequality.Kolibri
```

Or uninstall and reinstall:
```bash
make uninstall && make install
```

### INSTALL_FAILED_UPDATE_INCOMPATIBLE
Signing key mismatch. Uninstall first:
```bash
make uninstall && make install
```

### Service Worker issues
1. Open Chrome DevTools: `chrome://inspect`
2. Find the Kolibri WebView and inspect
3. Check Application > Service Workers

### WorkManager tasks not running
Check task logs:
```bash
adb logcat -s TaskWorkerImpl:V BaseTaskWorker:V WM-WorkerWrapper:V
```

### Emulator not found
```bash
make setup   # Creates SDK + AVD
make emulator
```

## 7. Iterating

1. Make code changes
2. `make install`
3. Launch app and test
4. `make logcat` in another terminal
5. Repeat

For Python-only changes, builds are fast since Java doesn't need recompilation.

## Key Facts

| Fact | Value |
|------|-------|
| Package name | `org.learningequality.Kolibri` |
| Main activity | `org.learningequality.Kolibri.WebViewActivity` |
| AVD name | `kolibri-test` |
| JDK | Compilation pinned to 21 via `app/build.gradle` toolchain; daemon JVM pinned via `gradle/gradle-daemon-jvm.properties`. Set `JAVA_HOME` to a JDK 21 if Gradle can't auto-discover one. |
| GPU workaround | Use `-gpu guest` if default GPU segfaults |
| Python caching | Clear app data after Python changes (Chaquopy caches bytecode) |
| Build system | Gradle via Makefile wrappers — use `make` targets |
| CDP helper | `python3 scripts/cdp_helper.py` — requires `websockets` package |
