# run with envvar `ARCH=64bit` to build for v8a

ifeq (${ARCH}, 64bit)
  ARM_VER=v8a
else
  ARM_VER=v7a
endif

# Clear out apks
clean:
	- rm -rf dist/android/*.apk ./src/kolibri

deepclean: clean
	python-for-android clean_dists
	rm -r build || true
	rm -r dist || true
	yes y | docker system prune -a || true
	rm build_docker 2> /dev/null

.PHONY: p4a_android_distro
p4a_android_distro:
	python kapew.py prep-kolibri-dist --custom-whl
	# Source kolibri folder extraction from whl
	# Preseeds kolibri home. Extracts whl, run kolibri server locally.
	# Gives a special kolibri home folder, and puts the generated files in the app
	python kapew.py init android ${ARCH}

ifdef P4A_RELEASE_KEYSTORE_PASSWD
pew_release_flag = --release
endif

.PHONY: kolibri.apk
# Build the debug version of the apk
kolibri.apk: p4a_android_distro
	python kapew.py build $(pew_release_flag) android ${ARCH}


# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
.PHONY: build_docker
build_docker: Dockerfile
	docker build -t android_kolibri .

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: build_docker
	./docker/android/rundocker.sh

softbuild: project_info.json
	python kapew.py build $(pew_release_flag) android ${ARCH}

install:
	adb uninstall org.learningequality.Kolibri || true 2> /dev/null
	adb install dist/android/*$(ARM_VER)-debug-*.apk

run: install
	adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity
	sleep 1
	adb logcat | grep -i -E "python|kolibr| `adb shell ps | grep ' org.learningequality.Kolibri$$' | tr -s [:space:] ' ' | cut -d' ' -f2` " | grep -E -v "WifiTrafficPoller|localhost:5000|NetworkManagementSocketTagger|No jobs to start"

launch: softbuild run