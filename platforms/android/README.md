# Kolibri Android

Android application for Kolibri Learning Platform using Chaquopy for Python integration.

## Overview

This project packages [Kolibri](https://learningequality.org/kolibri/) as an Android application using:
- **Chaquopy** - Runs Python code directly on Android
- **HTTP Server + Service Worker** - Python runs an HTTP server, WebView loads content, Service Worker handles caching
- **WorkManager** - Handles background tasks in a separate process
- **Modern Android Architecture** - Clean package structure, lifecycle-aware components

## Monorepo & Android Studio

This project lives in the Kolibri monorepo at `platforms/android/` as a `uv`
workspace member. Open **`platforms/android/`** (not the monorepo root) as the
Android Studio project — Android Studio maps the enclosing monorepo as the VCS
root above it, so history and `git blame` still work.

The build consumes the shared workspace rather than a standalone checkout:

- **Python / `buildPython`:** resolves to the shared root `.venv`, no activation
  needed. Create it with `uv sync --group dev --all-packages` from anywhere in
  the workspace.
- **Chaquopy runtime:** the embedded runtime (`requirements.txt`) stays
  Chaquopy-resolved and out of the workspace lock — install it into the shared
  `.venv` with `uv pip install -r requirements.txt`.
- **Kolibri tar:** `make stage-workspace-tar` builds it from the monorepo into `tar/`.

The nested `AGENTS.md` / `CLAUDE.md` in this directory remain the
Android-specific developer docs.

## Quick Start

```bash
# 1. Ensure JDK 21 is installed
java -version

# 2. Set up the shared workspace Python environment
uv sync --group dev --all-packages
uv pip install -r requirements.txt

# 3. Setup Android SDK and emulator
make setup

# 4. Build & stage the workspace Kolibri tar
make stage-workspace-tar

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

For the Python environment and Kolibri tar, see
[Monorepo & Android Studio](#monorepo--android-studio) above.

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
make stage-workspace-tar   # Build & stage the workspace Kolibri tar into tar/ (no download)
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
