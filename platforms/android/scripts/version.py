import os
import subprocess
import sys
from datetime import datetime


def kolibri_version():
    """
    Returns the major.minor version of Kolibri if it exists
    """
    import kolibri

    return kolibri.__version__


def commit_hash():
    """
    Returns the number of commits of the Kolibri Android repo. Returns 0 if something fails.
    TODO hash, unless there's a tag. Use alias to annotate
    """
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    p = subprocess.Popen(
        "git rev-parse --short HEAD",
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        cwd=repo_dir,
        universal_newlines=True,
    )
    return p.communicate()[0].rstrip()


def git_tag():
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    p = subprocess.Popen(
        "git tag --points-at {}".format(commit_hash()),
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        cwd=repo_dir,
        universal_newlines=True,
    )
    return p.communicate()[0].rstrip()


def build_type():
    key_alias = os.getenv("P4A_RELEASE_KEYALIAS", "unknown")
    if key_alias == "LE_DEV_KEY":
        return "dev"
    if key_alias == "LE_RELEASE_KEY":
        return "official"
    return key_alias


def apk_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri version]-[android installer version or githash]-[build signature type]
    """
    android_version_indicator = git_tag() or commit_hash()
    return "{}-{}-{}".format(kolibri_version(), android_version_indicator, build_type())


def build_number():
    """
    Returns the build number for the apk. This is the mechanism used to understand whether one
    build is newer than another. Uses buildkite build number with time as local dev backup
    """

    # Patch, due to a build error.
    # Envar was not being passed into the container this runs in, and the
    # build submitted to the play store ended up using the dev build number.
    # We can't go backwards. So we're adding to the one submitted at first.
    build_base_number = 2008998000

    buildkite_build_number = os.getenv("BUILDKITE_BUILD_NUMBER")

    if buildkite_build_number is not None:
        build_number = build_base_number + 2 * int(buildkite_build_number)
        return str(build_number)

    alt_build_number = (
        int(datetime.now().strftime("%y%m%d%H%M")) - build_base_number
    ) * 2
    return alt_build_number


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
    if sys.argv[1] == "apk_version":
        print(apk_version())
    elif sys.argv[1] == "build_number":
        print(build_number())
    elif sys.argv[1] == "write_version":
        fileoutput()
