"""
Do not import anything from the rest of Kolibri in this module, it's crucial
that it can be loaded without the settings/configuration/django stack!
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import os
import pkgutil
import re
import subprocess
import tempfile
from collections import namedtuple

_BaseVersion = namedtuple(
    "_BaseVersion", [
        "major_version", "minor_version", "patch_version", "release_number",
        "build_number", "build_hash"
    ]
)


class Version(_BaseVersion):

    def __str__(self):
        version = "{major}.{minor}.{patch}".format(
            major=self.major_version,
            minor=self.minor_version,
            patch=self.patch_version
        )

        if self.release_number:
            version = "{version}{release}".format(
                version=version, release=self.release_number
            )

        if self.build_number:
            version = "{version}.dev{build}".format(
                version=version, build=self.build_number
            )

        return version

    def fullversion(self):
        """Return both the main version, and the git hash if available."""

        mainver = str(self)

        if self.build_hash:
            mainver = "{mainver}-{build_hash}".format(
                mainver=mainver, build_hash=self.build_hash
            )

        return mainver

class ChDir(object):
    """
    Step into a directory temporarily.
    Taken from:
    https://pythonadventures.wordpress.com/2013/12/15/chdir-a-context-manager-for-switching-working-directories/
    """
    def __init__(self, path):
        self.old_dir = os.getcwd()
        self.new_dir = path

    def __enter__(self):
        os.chdir(self.new_dir)

    def __exit__(self, *args):
        os.chdir(self.old_dir)


def derive_version_from_git_tag(directory):
    version_string = None

    with ChDir(directory):

        try:
            with tempfile.TemporaryFile() as discarded_stderr_f:
                git_describe_string = (
                    subprocess.check_output(['git', 'describe', '--tags'],
                                            stderr=discarded_stderr_f
                                            ).rstrip().decode('utf-8')
                )  # cast from a byte to a string
        except (
            subprocess.CalledProcessError,  # not a git repo
            OSError  # git executable doesn't exist
        ):
            pass
        else:
            version_string = parse_git_tag_version_string(git_describe_string)

        return version_string


def derive_version_from_version_file(package):
    string = pkgutil.get_data(package, 'VERSION').decode('utf-8')
    return parse_git_tag_version_string(string)


def parse_git_tag_version_string(version_string):
    git_tag_validity_check = re.compile('v\d+\.\d+\.\d+.*')
    if not git_tag_validity_check.match(version_string):
        return None  # Maybe raising an error is better?

    # distutils doesn't like any leading v's too.
    version_string = version_string.lstrip('v')
    version_split = version_string.split('-', 3)

    major = minor = patch = release = build = build_hash = None

    if len(version_split) >= 1:  # has the base version numbers we need.
        major, minor, patch = version_split[0].split('.')

    if len(version_split) >= 2:  # includes a release number (rc, beta, etc.)
        release = version_split[1]

    if len(version_split) == 3:  # is a full release, includes no release number.
        # A full release only has '<version_number>-<build_number>-<build_hash>'
        # rather than '<version_number>-<release_number>-<build_number>-<build_hash>'
        release = None
        build = version_split[1]
        build_hash = version_split[2]

    if len(version_split) >= 4:  # includes a build number and hash
        build = version_split[2]
        build_hash = version_split[3]

    return Version(
        major_version=major,
        minor_version=minor,
        patch_version=patch,
        release_number=release,
        build_number=build,
        build_hash=build_hash,
    )


def get_version(package, calling_file, version_fallback=None):
    '''
    '''
    calling_dir = os.path.dirname(calling_file)
    return (
        derive_version_from_git_tag(calling_dir) or derive_version_from_version_file(package) or
        version_fallback
    )
