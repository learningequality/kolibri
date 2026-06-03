"""
Version utility functions for comparing and manipulating version strings.
"""

import logging
import re

logger = logging.getLogger(__name__)

MAJOR_VERSION = "major"
MINOR_VERSION = "minor"
PATCH_VERSION = "patch"
PRERELEASE_VERSION = "prerelease"
BUILD_VERSION = "build"


def get_version_and_operator_from_range(version_range):
    # extract and normalize version strings
    match = re.match(r"([<>=!]*)(\d.*)", version_range)
    if match is not None:
        operator, range_version = match.groups()
        return operator, normalize_version_to_semver(range_version)
    raise TypeError("Invalid semver value or range value")


#  Copied from https://github.com/learningequality/nutritionfacts/commit/b33e19400ae639cbcf2b2e9b312d37493eb1e566#diff-5b7513e7bc7d64d348fd8d3f2222b573
#  TODO: move to le-utils package
def version_matches_range(version, version_range):
    # Import semver here to allow other functions in the module to be imported in a lower
    # dependency environment.
    import semver

    # if no version range is provided, assume we don't have opinions about the version
    if not version_range or version_range == "*":
        return True

    # support having multiple comma-delimited version criteria
    if "," in version_range:
        return all(
            version_matches_range(version, vrange)
            for vrange in version_range.split(",")
        )

    # extract and normalize version strings
    operator, range_version = get_version_and_operator_from_range(version_range)
    version = semver.VersionInfo.parse(normalize_version_to_semver(version))

    # check whether the version is in the range
    return version.match(operator + range_version)


def normalize_version_to_semver(version):
    # dev = re.match(r"(.*?)(\.dev.*)?$", version).group()
    dev_match = re.match(r"(.*?)(\.dev.*)?$", version)

    dev = dev_match.group(2)

    # extract the numeric semver component and the stuff that comes after

    numeric, after = re.match(
        r"(^\d+\.\d+[0-9]*\.?[0-9]*)([a-z0-9.+]*)", version
    ).groups()

    # clean up the different variations of the post-numeric component to ease checking
    after = (after or "").strip("-").strip("+").strip(".").split("+")[0]

    # split up the alpha/beta letters from the numbers, to sort numerically not alphabetically
    after_pieces = re.match(r"([a-z]{1,2})(\d+)", after)
    if after_pieces:
        after = ".".join([piece for piece in after_pieces.group() if piece])

    # make sure dev versions are sorted nicely relative to one another
    dev = (dev or "").replace("+", ".").replace("-", ".")

    return "{}-{}{}".format(numeric, after, dev).strip("-")


def truncate_version(version, truncation_level=PATCH_VERSION):
    """
    Truncates a version string to a specific level

    >>> truncate_version("0.15.0a5.dev0+git.682.g0be46de2")
    '0.15.0'
    >>> truncate_version("0.14.7", truncation_level=MINOR_VERSION)
    '0.14.0'

    :param version: The version str to truncate
    :param truncation_level: The level beyond which to truncate the version
    :return: A truncated version string
    """
    import semver

    v = semver.VersionInfo.parse(
        normalize_version_to_semver(version).replace(".dev", "+dev")
    )

    if truncation_level == MAJOR_VERSION:
        return str(semver.VersionInfo(major=v.major, minor=0, patch=0))
    if truncation_level == MINOR_VERSION:
        return str(semver.VersionInfo(major=v.major, minor=v.minor, patch=0))
    if truncation_level == PATCH_VERSION:
        return str(semver.VersionInfo(major=v.major, minor=v.minor, patch=v.patch))
    if truncation_level == PRERELEASE_VERSION:
        truncated_version = str(
            semver.VersionInfo(
                major=v.major, minor=v.minor, patch=v.patch, prerelease=v.prerelease
            )
        )
        # ensure prerelease formatting matches our convention
        truncated_version, prerelease_version = truncated_version.split("-")
        return "{}{}".format(truncated_version, prerelease_version.replace(".", ""))
    return version
