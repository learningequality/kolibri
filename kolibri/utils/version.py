"""
Do not import anything from the rest of Kolibri in this module, it's crucial
that it can be loaded without the settings/configuration/django stack!
"""
from __future__ import absolute_import, division, print_function, unicode_literals

import pkgutil
import re
import subprocess
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


def derive_version_from_git_tag():
    try:
        git_describe_string = (
            subprocess.check_output(['git', 'describe', '--tags']
                                    ).rstrip()  # strip newlines
            .decode('utf-8')
        )  # cast from a byte to a string
    except (
        subprocess.CalledProcessError,  # not a git repo
        OSError  # git executable doesn't exist
    ):
        return None

    return parse_git_tag_version_string(git_describe_string)


def derive_version_from_version_file():
    string = pkgutil.get_data('kolibri', 'VERSION').decode('utf-8')
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

    if len(version_split) >= 3:  # includes a build number and hash
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


def get_version(version_fallback=None):
    '''
    '''
    return (
        derive_version_from_git_tag() or read_from_version_file() or
        version_fallback
    )
