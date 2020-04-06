# Clear out apks
clean:
	- rm -rf dist/android/*.apk project_info.json ./src/kolibri

deepclean: clean
	rm -r $(HOME)/.local/share/python-for-android
	rm -r build
	yes y | docker system prune -a
	rm build_docker 2> /dev/null

# Extract the whl file
src/kolibri: clean
	rm -r src/kolibri 2> /dev/null || true
	unzip -qo "whl/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/
	./delete_kolibri_blacklist.sh

# Generate the project info file
project_info.json: project_info.template src/kolibri scripts/create_project_info.py
	python ./scripts/create_project_info.py

.PHONY: p4a_android_distro
p4a_android_distro: whitelist.txt project_info.json
	mkdir -p $(HOME)/.local/share/python-for-android/packages/openssl/
	wget https://www.openssl.org/source/old/1.0.2/openssl-1.0.2p.tar.gz -O $(HOME)/.local/share/python-for-android/packages/openssl/openssl-1.0.2p.tar.gz
	pew init android

ifdef P4A_RELEASE_KEYSTORE_PASSWD
pew_release_flag = --release
endif

.PHONY: kolibri.apk
# Build the debug version of the apk
kolibri.apk: p4a_android_distro preseeded_kolibri_home
	pew build android $(pew_release_flag)

# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
.PHONY: build_docker
build_docker: Dockerfile
	docker build -t android_kolibri .

preseeded_kolibri_home: export KOLIBRI_HOME := src/preseeded_kolibri_home
preseeded_kolibri_home: export PYTHONPATH := tmpenv
preseeded_kolibri_home:
	rm -r tmpenv 2> /dev/null || true
	rm -r src/preseeded_kolibri_home 2> /dev/null || true
	pip install --target tmpenv whl/*.whl
	tmpenv/bin/kolibri start --port=16294
	sleep 5
	tmpenv/bin/kolibri stop
	sleep 1
	yes yes | tmpenv/bin/kolibri manage deprovision
	rm -r src/preseeded_kolibri_home/logs 2> /dev/null || true
	rm -r src/preseeded_kolibri_home/sessions 2> /dev/null || true
	rm -r src/preseeded_kolibri_home/process_cache 2> /dev/null || true
	touch src/preseeded_kolibri_home/was_preseeded

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker
	./scripts/rundocker.sh

launch: project_info.json
	pew build android $(pew_release_flag)
	adb uninstall org.learningequality.Kolibri || true 2> /dev/null
	rm dist/android/Kolibri-0-debug.apk || true 2> /dev/null
	adb install dist/android/*-debug.apk
	adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity
	adb logcat | grep -E "python|Python|server|kolibri|Kolibri" | grep -E -v "BufferQueueProducer|WifiTrafficPoller|DexObserverFW|GCoreUlr"