
# Clear out apks
clean:
	# Make bin directory, where APK is held. Empty if it exists.
	mkdir -p bin
	rm -f bin/*.apk 2> /dev/null
	rm -rf ./src/kolibri 2> /dev/null

# Update build system (download NDK/SDK, build Python, etc)
updatedependencies:
	buildozer android update

# Replace the default loading page, so that it will be replaced with our own version
replaceloadingpage:
	rm -f .buildozer/android/platform/build/dists/kolibri/webview_includes/_load.html
	cp ./assets/_load.html .buildozer/android/platform/build/dists/kolibri/webview_includes/
	cp ./assets/loading-spinner.gif .buildozer/android/platform/build/dists/kolibri/webview_includes/

# Extract the whl file
extractkolibriwhl:
	unzip -q "src/kolibri*.whl" "kolibri/*" -d src/

# Generate the andoid version
generateversion:
	python ./scripts/generateversion.py

# Buld the debug version of the apk
builddebugapk:
	buildozer android debug

# Buld the release version of the apk
buildreleaseapk:
	buildozer android release


# DOCKER BUILD

# Build the docker image
builddocker:
	docker build -t kolibrikivy .

# Run the docker image
rundocker: clean builddocker
	./scripts/rundocker.sh

# NON DOCKER BUILD

# Build non-docker local apk
buildapklocally: clean updatedependencies replaceloadingpage extractkolibriwhl generateversion builddebugapk

# Deploys the apk on a device
installapk:
	buildozer android deploy

# Run apk on device
runapk:
	buildozer android run
	buildozer android adb -- logcat | grep -i python

uninstallapk:
	adb uninstall org.le.kolibri
