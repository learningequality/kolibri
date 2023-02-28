from os import environ


# A constant to be used in place of Python's platform.system()
# when we know we are on an Android system.
ANDROID_PLATFORM_SYSTEM_VALUE = "Android"


# Android is based on the Linux kernel, but due to security issues, we cannot
# run the /proc command there, so we need a way to distinguish between the two.
# Python for Android always sets some Android environment variables, so we check
# for one of them to differentiate. This is how Kivy detects Android as well.
def on_android():
    return "ANDROID_ARGUMENT" in environ
