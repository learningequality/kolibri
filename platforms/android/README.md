# Kolibri Android Installer (Note: this repo is deprecated, and the newer code is now integrated [here](https://github.com/learningequality/kolibri-app) )

Wraps Kolibri in an android-compatibility layer. Uses PyEverywhere to automate build, and relies on Python-For-Android for compatibility on the Android platform.

## Build on Docker

This project was primarily developed on Docker, so this method is more rigorously tested.

1. Install [docker](https://www.docker.com/community-edition)

2. Build or download a Kolibri WHL file, and place in the `whl/` directory.

3. Run `make run_docker`.

4. The generated APK will end up in the `bin/` folder.

## Build on Host

1. Install [PyEverywhere](https://github.com/kollivier/pyeverywhere) and its build dependencies (for building Python). For Ubuntu, you can find the list of dependencies in the [Dockerfile](./Dockerfile).

2. Build or download a Kolibri WHL file, and place it in the `whl/` directory.

3. Run `make Kolibri*.apk` to set up the build environment (downloads depenedencies and sets up project template) on first run, then build the apk. Watch for success at the end, or errors, which might indicate missing build dependencies or build errors. If successful, there should be an APK in the `bin/` directory.

## Installing the apk
1. Connect your Android device over USB, with USB Debugging enabled.

2. Ensure that `adb devices` brings up your device. Afterward, run `adb install bin/Kolibri-*-debug.apk` to install onto the device. (Assuming you built the apk in `debug` mode, the default.


## Running the apk from the terminal

### If you have `pew` installed

1. Run `pew run android`. You will be able to monitor the output in the terminal. The app should show a black screen and then a loading screen.

### If you only have `adb` installed

1. Run `adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity`

## Debugging the app

### Server Side
Run `adb logcat -v brief python:D *:F` to get all debug logs from the Kolibri server

### Client side
1. Start the Kolibri server via Android app
2. Open a browser and see debug logs
  - If your device doesn't aggressively kill the server, you can open Chrome and use remote debugging tools to see the logs on your desktop.
  - You can also leave the app open and port forward the Android device's Kolibri port using [adb](https://developer.android.com/studio/command-line/adb#forwardports):
  ```
  adb forward tcp:8080 tcp:8081
  ```
  then going into your desktop's browser and accessing `localhost:8081`. Note that you can map to any port on the host machine, the second argument.

Alternatively, you can debug the webview directly. Modern Android versions should let you do so from the developer settings.

You could also do so using [Weinre](https://people.apache.org/~pmuellr/weinre/docs/latest/Home.html). Visit the site to learn how to install and setup. You will have to build a custom Kolibri .whl file that contains the weinre script tag in the [base.html file](https://github.com/learningequality/kolibri/blob/develop/kolibri/core/templates/kolibri/base.html).


## Helpful commands
- [adb](https://developer.android.com/studio/command-line/adb) is pretty helpful. Here are some useful uses:
  - `adb logcat -b all -c` will clear out the device's log. ([Docs](https://developer.android.com/studio/command-line/logcat))
    - Logcat also has a large variety of filtering options. Check out the docs for those.
  - Uninstall from terminal using `adb shell pm uninstall org.learningequality.Kolibri`. ([Docs](https://developer.android.com/studio/command-line/adb#pm))
- Docker shouldn't be rebuilding very often, so it shouldn't be using that much storage. But if it does, you can run `docker system prune` to clear out all "dangling" images, containers, and layers. If you've been constantly rebuilding, it will likely get you several gigabytes of storage.

## Docker Implementation Notes
The image was optimized to limit rebuilding and to be run in a developer-centric way. `scripts/rundocker.sh` describes the options needed to get the build running properly.

Unless you need to make edits to the build method or are debugging one of the build dependencies and would like to continue using docker, you shouldn't need to modify that script.
