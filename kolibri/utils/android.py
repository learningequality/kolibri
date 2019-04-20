from os import environ


# Android is based on the Linux kernel, but due to security issues, we cannot
# run the /proc command there, so we need a way to distinguish between the two.
# Python for Android always sets some Android environment variables, so we check
# for one of them to differentiate. This is how Kivy detects Android as well.
def on_android():
    return "ANDROID_ARGUMENT" in environ
