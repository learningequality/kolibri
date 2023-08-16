import os
import sys
from datetime import datetime

from play_store_api import get_latest_version_code


android_installer_version = "0.1.0"


BUILD_TYPE_DEBUG = "debug"
BUILD_TYPE_DEV = "dev"
BUILD_TYPE_OFFICIAL = "official"


VERSION_CODE_FILE = os.path.join(os.path.dirname(__file__), "../.version-code")


def kolibri_version():
    """
    Returns the major.minor version of Kolibri if it exists
    """
    import kolibri

    return kolibri.__version__


def build_type():
    key_alias = os.getenv("RELEASE_KEYALIAS", "")
    if key_alias == "LE_DEV_KEY":
        return BUILD_TYPE_DEV
    if key_alias == "LE_RELEASE_KEY":
        return BUILD_TYPE_OFFICIAL
    return BUILD_TYPE_DEBUG


def apk_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri version]-[android installer version or githash]-[build signature type]
    """
    return "{}-{}-{}".format(kolibri_version(), android_installer_version, build_type())


def _generate_build_number():
    """
    Generates the build number - this should not be called more than once per build.
    """
    if build_type() == BUILD_TYPE_OFFICIAL:
        return get_latest_version_code() + 1
    # build_base_number is no longer strictly needed, but keeping here to remind us
    # why our versionCodes are so high - also, we use this base build number to
    # make sure the time based build number is not higher than the maximum value
    # of 2100000000, so it still serves a purpose!
    # It also has the additional advantage of ensuring that the build number
    # for the dev build is always lower than the build number for the official build.
    # Meaning we shouldn't accidentally release a development build.
    # Patch, due to a build error.
    # Envar was not being passed into the container this runs in, and the
    # build submitted to the play store ended up using the dev build number.
    # We can't go backwards. So we're adding to the one submitted at first.
    build_base_number = 2008998000
    return int(datetime.now().strftime("%y%m%d%H%M")) - build_base_number


def write_build_number():
    """
    Writes the build number to a file.
    """
    with open(VERSION_CODE_FILE, "w") as f:
        f.write(str(_generate_build_number()))


def build_number():
    """
    Returns the build number for the apk. See the functions above for how the file this is
    read from is generated.
    """
    try:
        with open(VERSION_CODE_FILE, "r") as f:
            return int(f.read())
    except Exception as e:
        print("Improper version code file, have you generated a version code?")
        raise e


def fileoutput():
    """
    Writes the version to a version.properties file
    in the kolibri android project.
    """
    with open(
        os.path.join(
            os.path.dirname(__file__),
            "../python-for-android/dists/kolibri",
            "version.properties",
        ),
        "w",
    ) as f:
        f.write("VERSION_NAME:{}\n".format(apk_version()))
        f.write("VERSION_CODE:{}\n".format(build_number()))


if __name__ == "__main__":
    if sys.argv[1] == "set_version_code":
        write_build_number()
    elif sys.argv[1] == "write_version_properties":
        fileoutput()
    else:
        raise RuntimeError("Unknown command {}".format(sys.argv[1]))
