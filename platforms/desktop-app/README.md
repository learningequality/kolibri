# Kolibri Native App Shell
Cross-platform Kolibri app sources

### Requirements

- Python 3.6 (use 32-bit builds on Windows)

### Supported Platforms

- Android
- macOS
- Windows

## Getting Started

**IMPORTANT:** On Windows, there is a bug with PyInstaller and the latest virtualenv.
If you're using virtualenv, please downgrade your virtualenv to version 16.1.0 until
the bug is fixed.

Run pip to download and install dependencies for the platform you want to target:
 
`pip install -r requirements-<platform>.txt`

Note that cross-builds are only supported for Android. Any other builds must be run
natively on the platform you're targeting.

### The kapew command line tool

`kapew` stands for Kolibri App using PyEveryWhere. It contains some commands for doing
app builds, and overrides some `pew` commands to perform pre- and post-build steps
specific to the Kolibri application.

To make the `kapew` command accessible in your shell, run the following command from the project
root:

`pip install -e .`

Run `kapew --help` to see a list of commands. You can also run commands in kapew by running
`python kapew.py [args]` instead if you don't want to register the `kapew` command.

### Downloading a Kolibri build

Before you can build and run the Kolibri app, you will need to download and unpack a Kolibri
release. `kapew` contains a special command that helps with this called `prep-kolibri-dist`.

By default, it grabs the latest Kolibri release (including weekly or pre-releases)
and generates a stock preseeded Kolibri home folder to speed up the initial load process.

It can be controlled with a few options.

`--exclude-prereleases`: this makes the script download the latest official release.

`--kolibri-version {version}`: specifies a specific version of Kolibri to download

`--custom-whl`: uses a Kolibri whl file placed in the `whl` subdir of the project root

`--skip-preseed`: skip the preseed process, only download and unpack the Kolibri release

### Building and running the app

Once you have a `src/kolibri` folder after running `prep-kolibri-dist`, you can
now run the app from source or build and package the app.

#### Running the app from source

`kapew run`

#### Creating a native app for testing

`kapew build`

Outputs appear in the `dist/[platform]` folder. On *nix platforms, you can build
for android by running `kapew build android`. Add `--docker` to build using Docker.

#### Creating a signed build

`kapew codesign`

You will need to set the proper credentials for signing via environment variables. 
The script will explain what environment variables you need to set if they aren't set.

On Mac, after this process, you need to wait for an email from Apple explaining that
the build was successfully verified. Then, run the following command, which adds Apple's
verification to the app so that it can be recognized when run offline:

`xcrun stapler staple dist/osx/Kolibri.app`

Make sure these steps are performed before packaging the build.

#### Creating an app installer package

`kapew package`

Outputs appear in the `package/[platform]` subdirectory. 

