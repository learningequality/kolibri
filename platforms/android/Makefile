VPATH = ./dist/android/
.PHONY: clean dummy_project_info

# Clear out apks
clean:
	- rm -rf dist/android/*.apk project_info.json ./src/kolibri

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

# PHONY
# Generate the dummy project info file, no unpack required
dummy_project_info.json: project_info.template clean
	python ./scripts/create_dummy_project_info.py

# Buld the debug version of the apk
Kolibri*.apk: project_info.json
	pew build android

# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
build_docker: project_info.template
	docker build -t android_kolibri .
	touch build_docker

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker clean
	./scripts/rundocker.sh
