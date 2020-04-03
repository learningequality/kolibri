VPATH = ./dist/android/

# Clear out apks
clean:
	- rm -rf dist/android/*.apk project_info.json ./src/kolibri

deepclean: clean
	rm -r ~/.local/share/python-for-android
	rm -r build
	yes y | docker system prune -a
	rm build_docker 2> /dev/null

# Extract the whl file
src/kolibri:
	unzip -qo "whl/kolibri*.whl" "kolibri/*" -x "kolibri/dist/cext*" -d src/

# Generate the project info file
project_info.json: project_info.template src/kolibri scripts/create_project_info.py
	python ./scripts/create_project_info.py


ifdef P4A_RELEASE_KEYSTORE_PASSWD
pew_release_flag = --release
endif

# Buld the debug version of the apk
Kolibri%.apk: project_info.json
	pew build android $(pew_release_flag)

# DOCKER BUILD

# Build the docker image. Should only ever need to be rebuilt if project requirements change.
# Makes dummy file
build_docker: project_info.template Dockerfile
	docker build -t android_kolibri .
	touch build_docker

# Run the docker image.
# TODO Would be better to just specify the file here?
run_docker: clean project_info.json build_docker
	./scripts/rundocker.sh

launch: Kolibri%.apk
	adb uninstall org.learningequality.Kolibri || true 2> /dev/null
	rm dist/android/Kolibri-0-debug.apk || true 2> /dev/null
	adb install dist/android/*-debug.apk
	adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity
	adb logcat | grep -E "python|Python| server "