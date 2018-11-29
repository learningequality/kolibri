.PHONY: clean dummy_project_info

# Clear out apks
clean:
	# Make bin directory, where APK is held. Empty if it exists.
	mkdir -p bin
	rm -f bin/*.apk 2> /dev/null
	rm -rf ./src/kolibri 2> /dev/null
	rm -rf dummy
	rm -f project_info.json

# Replace the default loading page, so that it will be replaced with our own version
replaceloadingpage:
	rm -f .buildozer/android/platform/build/dists/kolibri/webview_includes/_load.html
	cp ./assets/_load.html .buildozer/android/platform/build/dists/kolibri/webview_includes/
	cp ./assets/loading-spinner.gif .buildozer/android/platform/build/dists/kolibri/webview_includes/

# Extract the whl file
src/kolibri:
	unzip -q "src/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/

# Generate the project info file
project_info.json: project_info.template src/kolibri
	python ./scripts/create_project_info.py

# Generate the dummy project info file, no unpack required
dummy_project_info: project_info.template clean
	python ./scripts/create_dummy_project_info.py

# Buld the debug version of the apk
dist/android/kolibri*.apk: project_info.json
	pew build android

# DOCKER BUILD

builddocker: project_info.json
	docker build -t kolibrikivy .

# Run the docker image.
# TODO Would be better to just specify the file here?
rundocker: clean builddocker
	./scripts/rundocker.sh

# NON DOCKER BUILD

# Deploys the apk on a device
installapk:
	buildozer android deploy

# Run apk on device
runapk:
	buildozer android run
	buildozer android adb -- logcat | grep -i python

uninstallapk:
	adb uninstall org.le.kolibri
