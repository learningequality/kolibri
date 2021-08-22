App Architecture
----------------

#### App / PyEverywhere Design Principles

One of the main issues when developing cross-platform software
is caused by incomplete or buggy "bridge" layers that try
to abstract away the differences between platforms. In theory, this
should make life easier. In reality, abstracting platform differences
is a very difficult and thorny problem, so the bridge layer often
gives you insufficient control and leaves you either settling for lowest
common denominator functionality or having to write plugins and/or learn 
a domain specific language, simply to make a small change. You end up
sacrificing user experience in exchange for a simpler (but more limited)
development experience.

Due to this, `pyeverywhere` and our app architecture focuses on enabling
our Python code to call native functionality directly from the app. Python
almost always has ways of accessing the native platform's APIs, and this
gives us the flexibilty of devising one-off or platform-specific solutions
as needed, and only writing abstractions when they benefit us. It also
allows us to choose whether or not the abstraction should go in the app
itself, or in `pyeverywhere`, depending on how generally applicable the
functionality is.

Generally, the more practical experience you have with certain functionality,
the better the abstraction layer you can devise for it. So it makes sense to defer
abstraction until it is truly needed, to ensure the abstraction layer is the
best possible fit, even if it seems more work in the short term.

So to summarize, the design principles for the app are:

- Start with rapid prototyping and iteration, design an abstraction later (if needed)
- Embrace native functionality whenever possible for the best user experience
- If a majority of web apps would need this feature (e.g. menu bars), consider putting 
  it in `pyeverywhere`

#### App Architecture

Reflecting these principles, the app codebase is divided into four main parts:

`src/main.py`

The entry point to the GUI, where the common code (and some platform-specific code) lives.

`src/kolibri_app`

Module for functionality specific to Kolibri, such as starting and stopping the
server, initializing the app plugin, or exposing app-specific functionality.

`src/platforms`

Module for platform-specific functionality. This is where, for example, the Android
share button or service-starting functionality should live. If all platforms implement
a function, such as `start_service`, consider adding a helper function in
 `src/platforms/__init__.py` that chooses the appropriate platform implementation to use.

`kapew.py` & `build_tools`

These are the tools used during the build and packaging process for the Kolibri App.
Examples might be the code to create a proceeded Kolibri home directory, or to codesign builds.
`kapew.py` is the code for the CLI for using the functions in `build_tools`.

### Platform-Specific Information

When developing the app, it can be helpful to have an understanding of how the build works on
each platform. This section details the decisions made on each platform and their rationale.

#### Android

[python-for-android](https://github.com/kivy/python-for-android) is used to cross-compile Python
on Android and build the apk that embeds it and runs the code.

The Android build process has the most platform-specific considerations. Here are a couple things
specific to the Android build process:

_Cross-compilation of Python modules_

One big difference with Android is that, due to the fact that Python itself doesn't fully support
Android, most Python C extensions do not have Android binaries in `pypi`, and many require modifications
to even build. Even some pure-Python modules may need patched to support running on Android, due
to platform differences from other implementations.

To address this, `python-for-android` created a `recipes` system, which takes Python code and
patches them so that they will run on Android. This is used even for Python itself. However, unlike
most Python app-packaging tools, `python-for-android` (p4a) is not able to scan your code and determine
what recipes are needed. So a unique step for Android is specifying a list of `recipes` the app will
require. You can see this list in the `requirements` section in `project_info.json`. A full list of
recipes can be found in the [recipes directory of the Github repo](https://github.com/kollivier/python-for-android/tree/pew_webview/pythonforandroid/recipes).

_App Initialization_

Another unique wrinkle for Android is the app initialization process. Historically, due to technical
limitations, the Android app needed to bundle all the app code into a zip (called `private.mp3` due
apparently to `zip` files causing errors during packaging), and then it extracts this zip to the
app's user data folder upon first launch. For larger apps, this can take some time, so it is something
to be aware of if you see long initial load times for Kolibri. It is possible this may no longer be
needed, but p4a would need patched to attempt a non-zip build.

_Bootstraps_

`p4a` allows you to use a couple different app shells, depending on your purpose. The most commonly
used one is the `sdl2` bootstrap, which loads `sdl2` and uses it for rendering. This is the boostrap
used for Kivy apps. We use a different bootstrap, called the `webview` bootstrap. By default, this
bootstrap expects for the Python code to start a service on a particular port, and then loads the
page ones it gets a 200 response.

_PyEverywhere / Kolibri app modifications_

One limitation of p4a's `webview` bootstrap is that it doesn't give you the ability to configure
the `webview` from Python code, or to do things like specify the initial URL to load into the browser.
To overcome these limitations, `pyeverywhere` uses a fork of `python-for-android` that allows you
to access and modify the bootstrap's WebView from Python code. You can find the branch with these
modifications [here](https://github.com/kollivier/python-for-android/tree/pew_webview).

This may need periodic maintenance and merging with `p4a` changes as time goes on.

#### Desktop platforms

Thankfully, the build processes for desktop platforms are much more uniform and follow standard
Python conventions more often. On Windows and Mac, the general process is to bundle the app into
the native binary format, a `.app` file for macOS or a `.exe` file for Windows. This is done to
ensure the user does not need to install a working Python installation to run the app.

For Linux, many distros do have built-in Python distributions, so it may be possible to simply
create a package of the Python code rather than build a binary of it. However, `pyeverywhere`
doesn't directly support packaging on Linux yet, so that would have to be solved in an app-specific
manner for now. (Patches welcome!)

#### Windows

`pyeverywhere` supports both `py2exe` and `PyInstaller` for `exe` packaging on Windows. Due to
`py2exe` issues with support for Python versions 3.6 and above, we currently use `PyInstaller`
for packaging.

Note that we currently use IE 11 as the browser, since it is the only embeddable browser on the
platform that will play MP4 videos without having to license distribution of the MP4 codecs. If
we switch to `webm` video, or have setups where we can license the codecs, we could switch to
using a Chromium build, but this would have to be a custom build as the default build does not
include the codecs. Might be worth consulting with the cefpython maintainer if we decide to go
this route to determine the best approach.

#### Mac

`py2app` is the standard packager for Mac, and is used to build the Mac app bundles.

As with Windows, we embed Apple's WebView (i.e. Safari) on Mac since it is capable of playing
MP4 files out-of-the-box without any licensing considerations.
