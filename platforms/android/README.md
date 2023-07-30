# Kolibri Android Installer

Wraps Kolibri in an android-compatibility layer. Relies on Python-For-Android to build the APK and for compatibility on the Android platform.

## Build on Docker

This project was primarily developed on Docker, so this method is more rigorously tested.

1. Install [docker](https://www.docker.com/community-edition)

2. Build or download a Kolibri WHL file, and place in the `whl/` directory.

3. Run `make run_docker`.

4. The generated APK will end up in the `bin/` folder.

## Development Flow

1. Setup a Python virtual environment in which to do development. The Kolibri developer documentation has a [How To guide for doing this with pyenv](https://kolibri-dev.readthedocs.io/en/develop/howtos/pyenv_virtualenv.html) but any Python virtualenv should work.

2. Install the Android SDK and Android NDK.

N.B. if you would like these to be installed to a different location then you can set an environment variable, e.g.:
By default it is set to `export ANDROID_SDK_ROOT=./android_root`

Run `make setup`.

3. Install the Python dependencies:

`pip install -r requirements.txt`

4. Ensure you have all [necessary packages for Python for Android](https://python-for-android.readthedocs.io/en/latest/quickstart/#installing-dependencies).

5. Build or download a Kolibri WHL file, and place it in the `whl/` directory.

To download a Kolibri WHL file, you can use `make get-whl whl=<URL>` from the command line. It will download it and put it in the correct directory.

6. By default the APK/AAB will be built for most architectures supported by Python for Android. To build for a smaller set of architectures, set the `ARCHES` environment variable. Run `p4a archs` to see the available targets.

7. Run `make p4a_android_project` this will do all of the Python for Android setup up until the point of actually building an APK or AAB.

N.B. You will need to rerun this step any time you update the Kolibri WHL file you are using, or any time you update the Python code in this repository.

8. You can now run Android Studio and open the folder `python-for-android/dists/kolibri` as the project folder to work from. You should be able to make updates to Java code, resource files, etc. using Android Studio, and build and run the project using Android Studio, including launching into emulators and real physical devices.

N.B. When you rerun step 7, it will complain loudly and exit early if you have uncommitted changes in the python-for-android folder. Any changes should be committed (even if in a temporary commit) before rerunning this step, as we use git stash to undo any changes in the Android project caused by the Python for Android project bootstrapping process. Also, when rerunning step 5, the Android version will not have incremented, meaning that any emulator or physical device will need to have Kolibri explicitly uninstalled for any changes to Python code to be updated on install.

## Debugging the app

1. When running the app from Android Studio, if you are using an emulator, it is possible that there will be many warning messages due to GPU emulation. In the logcat tab, update the filter to this `package:mine & -tag:eglCodecCommon` to hide those errors from the logcat output.

## Building from the commandline

1. Run `make kolibri.apk.unsigned` to build the development apk. Watch for success at the end, or errors, which might indicate missing build dependencies or build errors. If successful, there should be an APK in the `dist/` directory.

## Installing the apk
1. Connect your Android device over USB, with USB Debugging enabled.

2. Ensure that `adb devices` brings up your device. Afterward, run `make install` to install onto the device.


## Running the apk from the terminal

1. Run `adb shell am start -n org.learningequality.Kolibri/org.kivy.android.PythonActivity`

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

## Getting a Python shell within the running app context

We implemented code for an SSH server that allows connecting into a running Kolibri Android app and running code in an interactive Python shell. You can use this for developing, testing, and debugging Python code running inside the Android and Kolibri environments, which is handy especially for testing out Pyjnius code, checking environment variables, etc. This will soon be implemented as an Android service that can be turned on over ADB, but in the meantime you can use it a bit like you might use `import ipdb; ipdb.set_trace()` to get an interactive shell at a particular context in your code, as follows:

- Drop `import remoteshell` at the spot you want to have the shell get dropped in, and build/run the app.
- Connect the device over ADB, e.g. via USB.
- Run `adb forward tcp:4242 tcp:4242` (needs to be re-run if you disconnect and reconnect the device)
- Run `ssh -p 4242 localhost`
- If the device isn’t provisioned, any username/password will be accepted. Otherwise, use the admin credentials.
- If you get an error about “ssh-rsa”, you can put the following SSH config in:
```
Host kolibri-android
    HostName localhost
    Port 4242
    PubkeyAcceptedAlgorithms +ssh-rsa
    HostkeyAlgorithms +ssh-rsa
```
Then, you should be able to just do “ssh kolibri-android”

## Updating Python for Android

We maintain a fork of Python for Android that includes various changes we have made to the source code to support our specific needs. As P4A make new releases, we make a branch from the latest release tag, and then replay the commits on top of this tag using an interactive rebase. Sometimes, this allows us to drop commits as new features are merged into P4A. Our naming convention for the branch on our fork is `from_upstream_<tag_name>`. Any time we push new commits to this branch, we must also update the pinned commit in `requirements.txt`, so that we are always building with a completely predictable version of Python for Android.

By default we stash any updates to our bootstrap coming from Python for Android, because mostly we have overwritten their bootstrap code to make the relevant changes for us. If there are upstream changes to code we have committed in this repo from the bootstraps, then if the diff is small, it is probably simplest to manually copy in these changes to our committed code. If the diff is larger, or the developer fancies exercising some git-fu, then the make command `make update_project_from_p4a` will update the bootstrap from Python for Android, and not stash any changes that introduces. Through judicious change reversion and diffing, the appropriate changes can then be applied. Here be dragons.
