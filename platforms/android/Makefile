# Run with ARCHES="arch1 arch2" to build for a smaller set of
# architectures.
ARCHES ?= \
	armeabi-v7a \
	arm64-v8a \
	x86 \
	x86_64
export ARCHES

ARCH_OPTIONS := $(foreach arch,$(ARCHES),--arch=$(arch))

OSNAME := $(shell uname -s)

ifeq ($(OSNAME), Darwin)
	PLATFORM := macosx
else
	PLATFORM := linux
endif

ANDROID_API := 31
ANDROIDNDKVER := 25.2.9519653

ifdef ANDROID_SDK_ROOT
else
	ANDROID_SDK_ROOT := $(shell pwd)/android_root
endif

SDK := ${ANDROID_SDK_ROOT}

export ANDROID_HOME := $(SDK)
export ANDROIDSDK := $(SDK)
export ANDROIDNDK := $(SDK)/ndk-bundle

ADB := adb
DOCKER := docker
P4A := p4a
PYTHON_FOR_ANDROID := python-for-android

# This checks if an environment variable with a specific name
# exists. If it doesn't, it prints an error message and exits.
# For example to check for the presence of the ANDROIDSDK environment
# variable, you could use:
# make guard-ANDROIDSDK
guard-%:
	@ if [ "${${*}}" = "" ]; then \
		echo "Environment variable $* not set"; \
		exit 1; \
	fi

needs-android-dirs:
	$(MAKE) guard-ANDROID_SDK_ROOT

# Clear out apks
clean:
	- rm -rf dist/*.apk src/kolibri tmpenv
	- find ./src -name '*.pyc' -exec rm -f {} +

deepclean: clean
	$(PYTHON_FOR_ANDROID) clean_dists
	rm -r dist || true
	yes y | $(DOCKER) system prune -a || true
	rm build_docker 2> /dev/null

.PHONY: clean-tar
clean-tar:
	rm -rf tar
	mkdir tar

.PHONY: get-tar
get-tar: clean-tar
# The eval and shell commands here are evaluated when the recipe is parsed, so we put the cleanup
# into a prerequisite make step, in order to ensure they happen prior to the download.
	$(eval DLFILE = $(shell wget --content-disposition -P tar/ "${tar}" 2>&1 | grep "Saving to: " | sed 's/Saving to: ‘//' | sed 's/’//'))
	$(eval TARFILE = $(shell echo "${DLFILE}" | sed "s/\?.*//"))
	[ "${DLFILE}" = "${TARFILE}" ] || mv "${DLFILE}" "${TARFILE}"

.PHONY: install-tar
# Extract the tar file
install-tar: clean
	$(eval TARFILE = $(shell echo ""tar/kolibri*.tar.gz"" | sed "s/tar\///"))
	echo "Installing ${TARFILE}"
	rm -rf tar/patched
	mkdir -p tar/patched
	tar xvf "tar/${TARFILE}" --exclude="kolibri/dist/py2only*" --exclude="kolibri/dist/cext/*" --exclude="kolibri/dist/ifaddr*" --directory="tar/patched/" --strip-components=1
	# patch Django to allow migrations to be pyc files, as p4a compiles and deletes the originals
	sed -i 's/if name.endswith(".py"):/if name.endswith(".py") or name.endswith(".pyc"):/g' tar/patched/kolibri/dist/django/db/migrations/loader.py
	pip3 install --no-cache-dir --force-reinstall "tar/patched"
	# Proactively clean up any kolibri installs from the built dist
	rm -rf python-for-android/dists/kolibri/_python_bundle__*/_python_bundle/site-packages/kolibri* | true
	rm -rf python-for-android/build/python-installs/kolibri/*/kolibri* | true
	rm -rf python-for-android/build/other_builds/kolibri | true

.PHONY: create-strings
create-strings:
	python scripts/create_strings.py

# Checks to see if we have any uncommitted changes in the Android project
# use this to prevent losing uncommitted changes when updating or rebuilding the P4A project
.PHONY: check-android-clean
check-android-clean:
	@git diff --quiet --exit-code python-for-android || (echo "python-for-android directory has uncommitted changes in the working tree" && exit 1)

# Create the python-for-android project bootstrap from scratch
.PHONY: p4a_android_distro
p4a_android_distro: needs-android-dirs check-android-clean
	rm -rf python-for-android/dists/kolibri
	$(P4A) create $(ARCH_OPTIONS)
# Stash any changes to our python-for-android directory
	@git stash push --quiet --include-untracked -- python-for-android

# Update the python-for-android project bootstrap, discarding any changes that are made to committed files
# this should be the usually run command in normal workflows.
.PHONY: p4a_android_project
p4a_android_project: install-tar p4a_android_distro create-strings
	$(P4A) bootstrap $(ARCH_OPTIONS) --version="None" --numeric-version=1
# Stash any changes to our python-for-android directory
	@git stash push --quiet --include-untracked -- python-for-android
	$(MAKE) write-version

# Update the python-for-android project bootstrap, keeping any changes that are made to committed files
# this command should only be run when it is known there is an update from the upstream p4a bootstrap
# that is needed, although it will probably normally be easier to manually vendor the changes.
.PHONY: update_project_from_p4a
update_project_from_p4a: install-tar p4a_android_distro create-strings
	$(P4A) bootstrap $(ARCH_OPTIONS) --version="None" --numeric-version=1

.version-code:
	python3 scripts/version.py set_version_code

.PHONY: write-version
write-version: .version-code
	python3 scripts/version.py write_version_properties

.PHONY: kolibri.apk
# Build the signed version of the apk
kolibri.apk: p4a_android_project
	$(MAKE) guard-RELEASE_KEYSTORE
	$(MAKE) guard-RELEASE_KEYALIAS
	$(MAKE) guard-RELEASE_KEYSTORE_PASSWD
	$(MAKE) guard-RELEASE_KEYALIAS_PASSWD
	@echo "--- :android: Build APK"
	cd python-for-android/dists/kolibri && ./gradlew clean assembleRelease
	mkdir -p dist
	cp python-for-android/dists/kolibri/build/outputs/apk/release/*.apk dist/

.PHONY: kolibri.apk.unsigned
# Build the unsigned debug version of the apk
kolibri.apk.unsigned: p4a_android_project
	@echo "--- :android: Build APK (unsigned)"
	cd python-for-android/dists/kolibri && ./gradlew clean assembleDebug
	mkdir -p dist
	cp python-for-android/dists/kolibri/build/outputs/apk/debug/*.apk dist/

.PHONY: kolibri.aab
# Build the signed version of the aab
kolibri.aab: p4a_android_project
	$(MAKE) guard-RELEASE_KEYSTORE
	$(MAKE) guard-RELEASE_KEYALIAS
	$(MAKE) guard-RELEASE_KEYSTORE_PASSWD
	$(MAKE) guard-RELEASE_KEYALIAS_PASSWD
	@echo "--- :android: Build AAB"
	cd python-for-android/dists/kolibri && ./gradlew clean bundleRelease
	mkdir -p dist
	cp python-for-android/dists/kolibri/build/outputs/bundle/release/*.aab dist/

.PHONY: playstore-upload
# Upload the aab to the play store
playstore-upload:
	python3 scripts/play_store_api.py upload


# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
.PHONY: build_docker
build_docker: Dockerfile
	$(DOCKER) build -t android_kolibri .

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker
	env DOCKER="$(DOCKER)" ./scripts/rundocker.sh

install:
	$(ADB) uninstall org.learningequality.Kolibri || true 2> /dev/null
	$(ADB) install dist/*-debug-*.apk

logcat:
	$(ADB) logcat | grep -i -E "python|kolibr| `$(ADB) shell ps | grep ' org.learningequality.Kolibri$$' | tr -s [:space:] ' ' | cut -d' ' -f2` " | grep -E -v "WifiTrafficPoller|localhost:5000|NetworkManagementSocketTagger|No jobs to start"

$(SDK)/cmdline-tools/latest/bin/sdkmanager:
	@echo "Downloading Android SDK command line tools"
	wget https://dl.google.com/android/repository/commandlinetools-$(PLATFORM)-7583922_latest.zip
	rm -rf cmdline-tools
	unzip commandlinetools-$(PLATFORM)-7583922_latest.zip
# This is unfortunate since it will download the command line tools
# again, but after this it will be properly installed and updatable.
	yes y | ./cmdline-tools/bin/sdkmanager "cmdline-tools;latest" --sdk_root=$(SDK)
	rm -rf cmdline-tools
	rm commandlinetools-$(PLATFORM)-7583922_latest.zip

sdk: $(SDK)/cmdline-tools/latest/bin/sdkmanager
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "platform-tools"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "platforms;android-$(ANDROID_API)"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "system-images;android-$(ANDROID_API);default;x86_64"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "build-tools;30.0.3"
	yes y | $(SDK)/cmdline-tools/latest/bin/sdkmanager "ndk;$(ANDROIDNDKVER)"
	ln -sfT ndk/$(ANDROIDNDKVER) $(SDK)/ndk-bundle
	@echo "Accepting all licenses"
	yes | $(SDK)/cmdline-tools/latest/bin/sdkmanager --licenses

# All of these commands are non-destructive, so if the cmdline-tools are already installed, make will skip
# based on the directory existing.
# The SDK installations will take a little time, but will not attempt to redownload if already installed.
setup: needs-android-dirs
	$(MAKE) sdk

clean-tools:
	rm -rf ${ANDROID_SDK_ROOT}
