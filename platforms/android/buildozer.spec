[app]

# (str) Title of your application
title = Kolibri

# (str) Package name
package.name = kolibri

# (str) Package domain (needed for android/ios packaging)
package.domain = org.le

# (str) Source code where the main.py live
source.dir = ./code

# (str) Application version
version.regex = v(\d+\.\d+\.\d+)
version.filename = %(source.dir)s/kolibri/VERSION

# (list) Application requirements
requirements = sqlite3,cryptography,pyopenssl,openssl,python2,pyjnius

# (str) Icon of the application
icon.filename = ./resources/logo.png

# (str) Supported orientation (one of landscape, portrait or all)
orientation = all

#
# Android specific
#

# (bool) Indicate if the application should be fullscreen or not
fullscreen = 0

# (list) Permissions
android.permissions = INTERNET,VIBRATE,WRITE_EXTERNAL_STORAGE

# (int) Android API to use
android.api = 18

# (int) Minimum API required
# NOTE: uncommenting this and setting it to 13 fixed the "dying on rotation" issue
# See: https://github.com/kivy/python-for-android/issues/730
android.minapi = 13

# (int) Android SDK version to use
#android.sdk = 20

# (str) Android NDK version to use
#android.ndk = 9c

# (bool) Use --private data storage (True) or --dir public storage (False)
android.private_storage = True

# (list) Pattern to whitelist for the whole project
android.whitelist = sqlite3/*,lib-dynload/_sqlite3.so,unittest/*,wsgiref/*,lib-dynload/_csv.so,lib-dynload/_json.so

# (list) List of Java .jar files to add to the libs so that pyjnius can access
# their classes. Don't add jars that you do not need, since extra jars can slow
# down the build process. Allows wildcards matching, for example:
# OUYA-ODK/libs/*.jar
#android.add_jars = foo.jar,bar.jar,path/to/more/*.jar

# (list) List of Java files to add to the android project (can be java or a
# directory containing the files)
#android.add_src =

# (str) python-for-android branch to use, defaults to master
#p4a.branch = stable

# (list) Android application meta-data to set (key=value format)
#android.meta_data =

# (str) Android logcat filters to use
#android.logcat_filters = *:S python:D

# (str) The Android arch to build for, choices: armeabi-v7a, arm64-v8a, x86
# android.arch = armeabi-v7a
android.arch = armeabi-v7a

#
# Python for android (p4a) specific
#

# (str) Bootstrap to use for android builds
p4a.bootstrap = webview

[buildozer]

# (int) Log level (0 = error only, 1 = info, 2 = debug (with command output))
log_level = 2

# (int) Display warning if buildozer is run as root (0 = False, 1 = True)
warn_on_root = 1

#    -----------------------------------------------------------------------------
#    Profiles
#
#    You can extend section / key with a profile
#    For example, you want to deploy a demo version of your application without
#    HD content. You could first change the title to add "(demo)" in the name
#    and extend the excluded directories to remove the HD content.
#
#[app@demo]
#title = My Application (demo)
#
#[app:source.exclude_patterns@demo]
#images/hd/*
#
#    Then, invoke the command line with the "demo" profile:
#
#buildozer --profile demo android debug
