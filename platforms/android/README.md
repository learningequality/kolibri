## Docker-based build instructions

1. Install [docker](https://www.docker.com/community-edition)
1. Clone this repo.
1. Build or download a Kolibri WHL file, and put it in the cloned project directory.
1. Run `./build.sh`
1. Generated APK will end up in the bin/ folder.

## Local dev environment

Running within docker has disadvantages, as any changes to the config file will trigger a complete rebuild
of Python etc, and you won't have direct access to some of Kivy's "buildozer" commands, and so forth. Hence,
if you're developing and updating the project, setting up the basic dependencies and running it in your host
environment will be nicer.

1. Have a look at the [buildozer](https://github.com/kivy/buildozer) project, which automates the process of
building, debugging, and deploying Kivy/python-for-android projects.
1. Install buildozer and its build dependencies (for building Python). For Ubuntu, you can find the list of
dependencies in the [Dockerfile](./Dockerfile).
1. Unzip a Kolibri WHL file into the `code` directory (include directories; it should end up under a `kolibri`
folder)
1. Run `buildozer android update` to set up the build environment (downloadd SDK/NDK, builds Python, and sets
up project template). Watch for success at the end, or errors, which might indicate missing build dependencies.

Now, the cycle for building and testing an APK is the following:
1. Build the debugging APK: `buildozer android debug` (watch for any errors). After, there should be an APK in
the ./bin/ directory.
1. Install the APK onto your phone (connected over USB, with USB Debugging enabled): `buildozer android deploy`
1. Launch the application: `buildozer android run` (will be triggered via `adb`)
1. Monitor the output of the app as it runs: `buildozer android adb -- logcat | grep -i python`
1. App should show a black screen, then a loading screen, and then the onboarding page.

You may wish to combine all these build/deploy steps into a one-liner for convenience:
`buildozer android debug && buildozer android deploy && buildozer android run && buildozer android adb -- logcat | grep -i python`
