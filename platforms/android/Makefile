# Kolibri Android Makefile
# Gradle-based build system (Chaquopy)
#
# This Makefile provides convenience wrappers around Gradle commands.
# Most targets simply call ./gradlew with appropriate arguments.

OSNAME := $(shell uname -s)

ifeq ($(OSNAME), Darwin)
	PLATFORM := macosx
else
	PLATFORM := linux
endif

# Android configuration
ANDROID_API := 35
ANDROIDNDKVER := 28.2.13676358
SDKMANAGER_VERSION := 13114758

# SDK location - default to the same place Android Studio puts the SDK,
# so the two don't end up with duplicate installations
ifdef ANDROID_SDK_ROOT
	SDK := ${ANDROID_SDK_ROOT}
else
	SDK := $(HOME)/Android/Sdk
endif

# Export for Gradle
export ANDROID_HOME := $(SDK)
export ANDROID_SDK_ROOT := $(SDK)
export ANDROIDSDK := $(SDK)
export ANDROIDNDK := $(SDK)/ndk-bundle

# Emulator configuration
AVD_NAME := kolibri-test
SYSTEM_IMAGE := system-images;android-$(ANDROID_API);default;x86_64

ADB := adb

# Environment variable check helper
guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

# Clean build artifacts
clean:
	./gradlew clean
	rm -rf dist/*.apk

.PHONY: clean-tar
clean-tar:
	rm -rf tar/extracted
	mkdir -p tar

.PHONY: get-tar
get-tar: clean-tar
# The eval and shell commands here are evaluated when the recipe is parsed, so we put the cleanup
# into a prerequisite make step, in order to ensure they happen prior to the download.
	$(eval DLFILE = $(shell wget --content-disposition -P tar/ "${tar}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval TARFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	[ "${DLFILE}" = "${TARFILE}" ] || mv "${DLFILE}" "${TARFILE}"

.PHONY: stage-workspace-tar
stage-workspace-tar: clean-tar
# Build the Kolibri tar from the monorepo workspace and stage it into tar/,
# replacing the manual `make get-tar tar=<URL>` download for local dev. The
# lookup runs after the build (in a single shell block, not make's parse-time
# eval) so it sees the freshly built tar; the freshest match is staged.
	$(MAKE) -C ../.. dist
	@WORKSPACE_TAR="$$(ls -t ../../dist/kolibri-*.tar.gz 2>/dev/null | head -1)"; \
	if [ -z "$$WORKSPACE_TAR" ]; then \
		echo "Monorepo 'make dist' produced no kolibri-*.tar.gz in ../../dist"; \
		exit 1; \
	fi; \
	rm -f tar/kolibri-*.tar.gz; \
	cp "$$WORKSPACE_TAR" tar/

# Build debug APK
.PHONY: kolibri.apk.unsigned
kolibri.apk.unsigned:
	@echo "Building debug APK..."
	./gradlew assembleDebug
	mkdir -p dist
	cp app/build/outputs/apk/debug/*.apk dist/

# Build release APK
.PHONY: kolibri.apk
kolibri.apk:
	$(MAKE) guard-RELEASE_KEYSTORE
	$(MAKE) guard-RELEASE_KEYALIAS
	$(MAKE) guard-RELEASE_KEYSTORE_PASSWD
	$(MAKE) guard-RELEASE_KEYALIAS_PASSWD
	@echo "Building release APK..."
	./gradlew assembleRelease
	mkdir -p dist
	cp app/build/outputs/apk/release/*.apk dist/

# Build release AAB (Android App Bundle) for Play Store
.PHONY: kolibri.aab
kolibri.aab:
	$(MAKE) guard-RELEASE_KEYSTORE
	$(MAKE) guard-RELEASE_KEYALIAS
	$(MAKE) guard-RELEASE_KEYSTORE_PASSWD
	$(MAKE) guard-RELEASE_KEYALIAS_PASSWD
	@echo "Building release AAB..."
	./gradlew bundleRelease
	mkdir -p dist
	cp app/build/outputs/bundle/release/*.aab dist/

# Upload the AAB to the Play Store
.PHONY: playstore-upload
playstore-upload:
	python3 scripts/play_store_api.py upload

# Install debug APK to connected device
.PHONY: install
install: kolibri.apk.unsigned
	$(ADB) install -r dist/*.apk

# Uninstall from connected device
.PHONY: uninstall
uninstall:
	$(ADB) uninstall org.learningequality.Kolibri || true

# Run tests
.PHONY: test
test:
	./gradlew test

# Run lint
.PHONY: lint
lint:
	./gradlew lint

# =============================================================================
# SDK and Emulator Setup
# =============================================================================

# Check that ANDROID_SDK_ROOT is set (for explicit override scenarios)
needs-android-dirs:
	@mkdir -p $(SDK)

# Download and install SDK command-line tools
$(SDK)/cmdline-tools/latest/bin/sdkmanager:
	@echo "Downloading Android SDK command line tools"
	wget https://dl.google.com/android/repository/commandlinetools-$(PLATFORM)-$(SDKMANAGER_VERSION)_latest.zip
	rm -rf cmdline-tools
	unzip commandlinetools-$(PLATFORM)-$(SDKMANAGER_VERSION)_latest.zip -d $(SDK)
	mv $(SDK)/cmdline-tools $(SDK)/latest
	mkdir -p $(SDK)/cmdline-tools
	mv $(SDK)/latest $(SDK)/cmdline-tools/latest
	rm commandlinetools-$(PLATFORM)-$(SDKMANAGER_VERSION)_latest.zip

# Install SDK components (platforms, build-tools, NDK, emulator)
.PHONY: sdk
sdk: $(SDK)/cmdline-tools/latest/bin/sdkmanager
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "platform-tools"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "platforms;android-$(ANDROID_API)"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "build-tools;35.0.0"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "ndk;$(ANDROIDNDKVER)"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "emulator"
	ln -sfT ndk/$(ANDROIDNDKVER) $(SDK)/ndk-bundle
	@echo "Accepting all licenses"
	yes | $(SDK)/cmdline-tools/latest/bin/sdkmanager --licenses

# Install system image for emulator
.PHONY: sdk-system-image
sdk-system-image: sdk
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "$(SYSTEM_IMAGE)"

# Create Android Virtual Device for testing
.PHONY: avd
avd: sdk-system-image
	@if $(SDK)/emulator/emulator -list-avds 2>/dev/null | grep -q "^$(AVD_NAME)$$"; then \
		echo "AVD '$(AVD_NAME)' already exists"; \
	else \
		echo "Creating AVD: $(AVD_NAME)"; \
		echo "no" | $(SDK)/cmdline-tools/latest/bin/avdmanager create avd \
			--name "$(AVD_NAME)" \
			--package "$(SYSTEM_IMAGE)" \
			--device "pixel_5"; \
		echo "AVD '$(AVD_NAME)' created"; \
	fi

# Complete setup: SDK + system image + AVD
.PHONY: setup
setup: needs-android-dirs avd
	@echo ""
	@echo "Setup complete! SDK location: $(SDK)"
	@echo "Run 'make emulator' to start the emulator"

# Start the emulator
.PHONY: emulator
emulator:
	@if ! $(SDK)/emulator/emulator -list-avds 2>/dev/null | grep -q "^$(AVD_NAME)$$"; then \
		echo "AVD '$(AVD_NAME)' not found. Run 'make setup' first."; \
		exit 1; \
	fi
	@echo "Starting emulator: $(AVD_NAME)"
	$(SDK)/emulator/emulator -avd $(AVD_NAME) &

# List available AVDs
.PHONY: list-avds
list-avds:
	@$(SDK)/emulator/emulator -list-avds 2>/dev/null || echo "No AVDs found. Run 'make setup' first."

# =============================================================================
# Maestro Smoke Testing
# =============================================================================

MAESTRO_VERSION := 2.6.0
MAESTRO_DIR := $(HOME)/.maestro
MAESTRO := $(MAESTRO_DIR)/bin/maestro

# Download the pinned Maestro release directly from GitHub. The official
# `curl https://get.maestro.mobile.dev | bash` installer would also work, but
# version-pinning it from a Makefile is fragile (the MAESTRO_VERSION env var
# has to reach `bash`, not `curl`), and the script's behavior can change.
$(MAESTRO):
	@echo "Installing Maestro $(MAESTRO_VERSION)..."
	@rm -rf $(MAESTRO_DIR)/tmp $(MAESTRO_DIR)/bin $(MAESTRO_DIR)/lib
	@mkdir -p $(MAESTRO_DIR)/tmp
	curl -fsSL -o $(MAESTRO_DIR)/tmp/maestro.zip \
		"https://github.com/mobile-dev-inc/maestro/releases/download/cli-$(MAESTRO_VERSION)/maestro.zip"
	unzip -qo $(MAESTRO_DIR)/tmp/maestro.zip -d $(MAESTRO_DIR)/tmp
	cp -rf $(MAESTRO_DIR)/tmp/maestro/. $(MAESTRO_DIR)/
	rm -rf $(MAESTRO_DIR)/tmp

.PHONY: maestro-install
maestro-install: $(MAESTRO)

.PHONY: smoke-test
smoke-test: maestro-install
	$(MAESTRO) test .maestro/

# Like smoke-test, but retries once after resetting app state. Catches transient
# WebView / cold-boot races on CI emulators without papering over real bugs (cap is
# 2 attempts, not infinite). Use this in CI; use smoke-test for local iteration.
.PHONY: smoke-test-with-retry
smoke-test-with-retry: maestro-install
	@attempt=0; \
	until $(MAKE) smoke-test; do \
		attempt=$$((attempt+1)); \
		if [ "$$attempt" -ge 2 ]; then \
			echo "Smoke test failed after $$attempt attempts"; \
			exit 1; \
		fi; \
		echo "Smoke test attempt $$attempt failed; resetting app state and retrying"; \
		$(ADB) shell am force-stop org.learningequality.Kolibri || true; \
		$(ADB) shell pm clear org.learningequality.Kolibri || true; \
		sleep 3; \
	done

# =============================================================================
# Logging
# =============================================================================

# View Kolibri-specific logs
.PHONY: logcat
logcat:
	$(ADB) logcat | grep -i -E "python|kolibr| `$(ADB) shell ps | grep ' org.learningequality.Kolibri$$' | tr -s [:space:] ' ' | cut -d' ' -f2` " | grep -E -v "WifiTrafficPoller|localhost:5000|NetworkManagementSocketTagger|No jobs to start"

# =============================================================================
# Help
# =============================================================================

.PHONY: help
help:
	@echo "Kolibri Android Build System (Chaquopy/Gradle)"
	@echo ""
	@echo "Quick Start:"
	@echo "  make setup              - Set up SDK and emulator (first time)"
	@echo "  make emulator           - Start the emulator"
	@echo "  make kolibri.apk.unsigned && make install - Build and install"
	@echo ""
	@echo "Build Targets:"
	@echo "  kolibri.apk.unsigned  - Build debug APK → dist/"
	@echo "  kolibri.apk           - Build release APK (requires signing keys) → dist/"
	@echo "  kolibri.aab           - Build release AAB (requires signing keys) → dist/"
	@echo "  playstore-upload      - Upload AAB to Play Store (requires SERVICE_ACCOUNT_JSON)"
	@echo ""
	@echo "Development Targets:"
	@echo "  install               - Install debug APK to connected device/emulator"
	@echo "  uninstall             - Uninstall app from device"
	@echo "  logcat                - View Kolibri-specific logs"
	@echo "  test                  - Run unit tests"
	@echo "  lint                  - Run Android linter"
	@echo "  clean                 - Clean build artifacts"
	@echo "  maestro-install       - Install Maestro CLI"
	@echo "  smoke-test            - Run Maestro smoke tests (requires running emulator + installed APK)"
	@echo ""
	@echo "SDK & Emulator Setup:"
	@echo "  setup                 - Complete setup (SDK + system image + AVD)"
	@echo "  sdk                   - Install SDK components only"
	@echo "  sdk-system-image      - Install emulator system image"
	@echo "  avd                   - Create Android Virtual Device"
	@echo "  emulator              - Start the emulator"
	@echo "  list-avds             - List available AVDs"
	@echo ""
	@echo "Kolibri Source:"
	@echo "  get-tar               - Download Kolibri tar (use: make get-tar tar=URL)"
	@echo "  stage-workspace-tar   - Build & stage the workspace Kolibri tar into tar/ (no download)"
	@echo "  clean-tar             - Remove extracted Kolibri directory"
	@echo ""
	@echo "Environment Variables:"
	@echo "  ANDROID_SDK_ROOT      - Android SDK location (default: ~/Android/Sdk)"
	@echo "                          (current: $(SDK))"
	@echo "  AVD_NAME              - Emulator name (default: kolibri-test)"
	@echo ""
	@echo "Release Build Variables (required for 'make kolibri.apk'):"
	@echo "  RELEASE_KEYSTORE      - Path to release keystore (.jks file)"
	@echo "  RELEASE_KEYALIAS      - Release key alias"
	@echo "  RELEASE_KEYSTORE_PASSWD - Keystore password"
	@echo "  RELEASE_KEYALIAS_PASSWD - Key password"
