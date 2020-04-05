# Clear out apks
clean:
	- rm -rf dist/android/*.apk project_info.json ./src/kolibri

deepclean: clean
	rm -r ~/.local/share/python-for-android
	rm -r build
	yes y | docker system prune -a
	rm build_docker 2> /dev/null

# Extract the whl file
src/kolibri: clean
	unzip -qo "whl/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/

# Generate the project info file
project_info.json: project_info.template src/kolibri scripts/create_project_info.py
	python ./scripts/create_project_info.py

.PHONY: p4a_android_distro
p4a_android_distro: whitelist.txt project_info.json
	pew init android

ifdef P4A_RELEASE_KEYSTORE_PASSWD
pew_release_flag = --release
endif

.PHONY: kolibri.apk
# Buld the debug version of the apk
kolibri.apk: p4a_android_distro
	pew build android $(pew_release_flag)

# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
.PHONY: build_docker
build_docker: Dockerfile
	docker build -t android_kolibri .

create_premigrated_db:
	pip install whl/*.whl
	KOLIBRI_HOME=tmphome kolibri manage migrate
	cp tmphome/db.sqlite3 src/db.sqlite3.empty

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker
	./scripts/rundocker.sh

launch:
	pew build android $(pew_release_flag)
	adb uninstall org.learningequality.Kolibri || true 2> /dev/null
	rm dist/android/Kolibri-0-debug.apk || true 2> /dev/null
	adb install dist/android/*-debug.apk
	adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity
	adb logcat | grep -E "python|Python| server "