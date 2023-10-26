import sys


# A constant to be used in place of Python's platform.system()
# when we know we are on an Android system.
ANDROID_PLATFORM_SYSTEM_VALUE = "Android"


# Android is based on the Linux kernel, but due to security issues, we cannot
# run the /proc command there, so we need a way to distinguish between the two.
# When Python is built against a specific version of the Android API, this method
# is defined. Otherwise it is not. Note that this cannot be used to distinguish
# between the current runtime versions of Android, as this value is set to the minimum
# API level that this Python version was compiled against.
def on_android():
    return hasattr(sys, "getandroidapilevel")
