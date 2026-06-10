# Kolibri Android

Android application for Kolibri Learning Platform using Chaquopy for Python integration.

## Overview

This project packages [Kolibri](https://learningequality.org/kolibri/) as an Android application using:
- **Chaquopy** - Runs Python code directly on Android
- **HTTP Server + Service Worker** - Python runs an HTTP server, WebView loads content, Service Worker handles caching
- **WorkManager** - Handles background tasks in a separate process
- **Modern Android Architecture** - Clean package structure, lifecycle-aware components

## Quick Start

```bash
# 1. Ensure JDK 21 is installed
java -version

# 2. Setup Python environment (recommended)
uv sync --extra build
uv pip install -r requirements.txt
source .venv/bin/activate

# 3. Setup Android SDK and emulator
make setup

# 4. Download Kolibri tar file
make get-tar tar=https://github.com/learningequality/kolibri/releases/download/v0.17.0/kolibri-0.17.0.tar.gz

# 5. Build!
make kolibri.apk.unsigned
```

Output: `dist/kolibri-*.apk`

## Development Setup

### Prerequisites

- **Java Development Kit (JDK) 21**
  - Fedora/RHEL: `sudo dnf install java-21-openjdk-devel`
  - Ubuntu/Debian: `sudo apt install openjdk-21-jdk`
  - macOS / atomic Fedora (Silverblue, Kinoite): `brew install openjdk@21`

- **Python 3.10+** - For build scripts and Chaquopy

### Initial Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/learningequality/kolibri-installer-android.git
   cd kolibri-installer-android
   ```

2. **Set up Python virtual environment**
   ```bash
   uv venv
   source .venv/bin/activate
   uv pip install ".[build]" -r requirements.txt
   ```

3. **Set up Android SDK** (automatically downloads SDK, NDK, emulator)
   ```bash
   make setup
   ```

4. **Get Kolibri tar file**
   ```bash
   make get-tar tar=<URL_TO_KOLIBRI_TAR>
   ```

5. **Build the APK**
   ```bash
   make kolibri.apk.unsigned
   ```

## Architecture

The app runs Kolibri as an HTTP server in Python, with a WebView displaying the UI:

```
┌─────────────────────────────────────────────────────────────┐
│                     Main Process                             │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │ WebViewActivity│         │ KolibriServer    │            │
│  │                │         │ Service          │            │
│  │  ┌──────────┐  │         │  ┌────────────┐  │            │
│  │  │ WebView  │──┼─ HTTP ──┼─▶│  Python    │  │            │
│  │  │          │  │         │  │  HTTP      │  │            │
│  │  │ Service  │  │         │  │  Server    │  │            │
│  │  │ Worker   │  │         │  │  (Kolibri) │  │            │
│  │  └──────────┘  │         │  └────────────┘  │            │
│  └────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                   :task_worker Process                       │
│  ┌────────────────┐         ┌──────────────────┐            │
│  │ WorkController │────────▶│   WorkManager    │            │
│  │ Service        │         │   Workers        │            │
│  └────────────────┘         └──────────────────┘            │
└─────────────────────────────────────────────────────────────┘
```

### Key Components

- **KolibriServerService** - Starts Python HTTP server in background
- **WebViewActivity** - Displays Kolibri UI, requests notification permission
- **WorkManager** - Runs background tasks (imports, syncs) in separate process
- **Task Reconciler** - Syncs WorkManager state with Kolibri's job database

## Project Structure

```
app/src/main/
├── java/org/learningequality/Kolibri/
│   ├── App.java                      # Application entry point
│   ├── WebViewActivity.java          # Main activity with WebView
│   ├── KolibriServerService.java     # HTTP server service
│   ├── KolibriServerViewModel.java   # Server state management
│   ├── KolibriEnvironmentManager.java     # Environment init coordination
│   ├── KolibriEnvironmentInitializer.java # Environment configuration
│   ├── WorkController.java           # Task scheduling
│   ├── WorkControllerService.java    # Worker process IPC
│   ├── notification/                 # Notification system
│   ├── task/                         # Task worker interfaces
│   │   ├── Task.java                 # WorkManager wrapper
│   │   └── TaskWorkerImpl.java       # Observer pattern for progress
│   ├── workers/                      # WorkManager workers
│   │   ├── BaseTaskWorker.java       # Base class with notifications
│   │   ├── ForegroundWorker.java     # Long-running tasks
│   │   └── BackgroundWorker.java     # Short tasks
│   └── util/                         # Utility classes
└── python/
    ├── main.py                       # HTTP server entry point
    ├── android_utils.py              # Android-specific utilities
    ├── taskworker.py                 # Task execution
    ├── task_reconciler.py            # Task state reconciliation
    ├── task_status.py                # Task status updates
    └── android_app_plugin/           # Kolibri plugin for Android
        └── kolibri_plugin.py         # StorageHook for task scheduling
```

## Building

### Debug Build

```bash
make kolibri.apk.unsigned
```

Output: `dist/kolibri-*.apk`

### Release Build

```bash
export RELEASE_KEYSTORE=/path/to/keystore.jks
export RELEASE_KEYALIAS=key-alias
export RELEASE_KEYSTORE_PASSWD=keystore-password
export RELEASE_KEYALIAS_PASSWD=key-password
make kolibri.apk
```

### All Make Targets

```bash
make help                  # Show all available targets
make setup                 # Setup SDK, NDK, and emulator
make kolibri.apk.unsigned  # Build debug APK
make kolibri.apk           # Build release APK (requires signing keys)
make kolibri.aab           # Build release AAB for Play Store
make install               # Install to connected device/emulator
make test                  # Run unit tests
make lint                  # Run Android linter
make emulator              # Start the emulator
make logcat                # View Kolibri-specific logs
make clean                 # Clean build artifacts
```

## Testing

```bash
# Run unit tests
make test

# Start emulator and install
make emulator
make install

# View logs
make logcat
```

## Debugging

```bash
# Kolibri logs
adb logcat -s Kolibri*:V

# Python logs
adb logcat -v brief python:D *:F

# Task worker process
adb logcat --pid=$(adb shell pidof -s org.learningequality.Kolibri:task_worker)

# WebView debugging: Chrome → chrome://inspect
```

## Common Issues

**Build fails**: Run `make setup` to ensure SDK is configured correctly
```bash
make clean && make setup
```

**No notifications**: Grant notification permission in Android settings (required on Android 13+)

**Tasks not running**: Check WorkManager state
```bash
adb logcat -s BaseTaskWorker:V WorkController:V
```

**Emulator won't start**: Check available AVDs and recreate if needed
```bash
make list-avds
make avd  # Recreate AVD
```

## Contributing

1. Create feature branch
2. Make changes
3. Run linting: `prek run --all-files`
4. Run tests: `make test`
5. Submit pull request

## License

See [LICENSE](LICENSE) file.

## Support

- **Issues**: https://github.com/learningequality/kolibri-installer-android/issues
- **Kolibri Docs**: https://kolibri.readthedocs.io/
- **Chaquopy Docs**: https://chaquo.com/chaquopy/doc/current/
