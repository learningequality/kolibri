import os
import re
import subprocess
import datetime


def get_kolibri_major_minor_version():
    """
    Returns the major.minor version of Kolibri.
    """
    full_version = open('./src/kolibri/VERSION', 'r').read()
    major_minor_version = re.search(r'(\d+\.\d+)', full_version).group(1)
    return major_minor_version


def get_kolibri_android_commit_count():
    """
    Returns the number of commits of the Kolibri Android repo. Returns 0 if something fails.
    """
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        p = subprocess.Popen(
            "git rev-list --count HEAD",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True
        )
        commit_count = p.communicate()[0].rstrip()
        if not commit_count:
            return 0
        return commit_count
    except OSError:
        return 0


def get_current_time():
    """
    Returns the current timestamp.
    """
    return datetime.datetime.now().strftime('%y%m%d%H%M')


def get_kolibri_android_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri major minor version].[kolibri android repo # commits].[timestamp]
    """
    kolibri_major_minor_version = str(get_kolibri_major_minor_version())
    kolibri_kivy_commit_count = str(get_kolibri_android_commit_count())

    return '.'.join([kolibri_major_minor_version, kolibri_kivy_commit_count, get_current_time()])


def create_kolibri_android_version_file():
    """
    Prints the Kolibri Android app version to a file ANDROID_VERSION.
    """
    version_file = open('ANDROID_VERSION', 'w')
    version_file.write(get_kolibri_android_version())
    version_file.close()


create_kolibri_android_version_file()
