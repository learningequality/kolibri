
# Clear out apks
clean:
	mkdir -p bin
	rm -f bin/*.apk 2> /dev/null

# Update build system (download NDK/SDK, build Python, etc)
updatedependencies:
	buildozer android update

# Remove the default loading page, so that it will be replaced with our own version
removeloadingpage:
	rm -f .buildozer/android/platform/build/dists/kolibri/webview_includes/_load.html

# Extract the whl file
extractkolibriwhl:
	rm -rf ./src/kolibri
	unzip -q "src/kolibri*.whl" "kolibri/*" -d src/

# Generate the andoid version
generateversion:
	python generateversion.py

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
rundocker: builddocker
	./rundocker.sh


# NON DOCKER BUILD

# Build non-docker local apk
buildapklocally: clean updatedependencies removeloadingpage extractkolibriwhl generateversion builddebugapk

# Deploys the apk on a device
installapk:
	buildozer android deploy

# Run apk on device
runapk:
	buildozer android run
	buildozer android adb -- logcat | grep -i python

uinstallapk:
	adb uninstall org.le.kolibri
