# Kolibri Android App

We use [Buildozer](https://github.com/kivy/buildozer) to automate the process of building the Kolibri Android App.

## Building the apk

There are two ways of building the apk. Locally or using Docker.

### Docker build

1. Install [docker](https://www.docker.com/community-edition)

2. Build or download a Kolibri WHL file, and place it in the `src/` directory.

3. Run `make rundocker`.

4. The generated APK will end up in the `bin/` folder.

### Local build

Using docker to build the apk has disadvantages, as any changes to the config file will trigger a complete rebuild of Python etc, and you won't have direct access to some of Kivy's "buildozer" commands, and so forth. Hence, if you're developing and updating the project, setting up the basic dependencies and running it in your host environment will be nicer.


1. Install [buildozer](https://github.com/kivy/buildozer) and its build dependencies (for building Python). For Ubuntu, you can find the list of dependencies in the [Dockerfile](./Dockerfile).

2. Build or download a Kolibri WHL file, and place it in the `src/` directory.

3. Run `make buildapklocally` to set up the build environment (downloads depenedencies and sets up project template), and build the apk. Watch for success at the end, or errors, which might indicate missing build dependencies or build errors. If successful, there should be an APK in the `bin/` directory.

## Installing the apk
1. Connect your Android device over USB, with USB Debugging enabled.

2. Run `make installapk` to install onto the device.


## Running the apk

1. To launch the app, run `make runapk`. You will be able to monitor the output in the terminal. The app should show a black screen and then a loading screen.

#### Helpful commands

* Run `make buildapklocally; make installapk; make runapk` to combine all these steps into a one-liner for convenience.
* Run `make uninstall` to uninstall the Kolibri Android app from the device.
