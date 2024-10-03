"""
We follow semantic versioning 2.0.0 according to
`semver.org <http://semver.org/>`__ but for Python distributions and in the
internal string representation in Python, you will find a
`PEP-440 <https://www.python.org/dev/peps/pep-0440/>`__ flavor.

 * ``1.1.0`` (Semver)  = ``1.1.0`` (PEP-440).
 * ``1.0.0-alpha1`` (Semver)  = ``1.0.0a1`` (PEP-440).

Here's how version numbers are generated:

 * ``kolibri.__version__`` is automatically set, runtime environments use it
   to decide the version of Kolibri as a string. This is especially something
   that PyPi and setuptools use.

 * ``kolibri.VERSION`` is a tuple containing major, minor, and patch version information,
   it's set in ``kolibri/__init__.py``

 * ``kolibri/VERSION`` is a file containing the exact version of Kolibri for a
   distributed environment - when it exists, as long as its major, minor, and patch
   versions are compatible with ``kolibri.VERSION`` then it is used as the version.
   If these versions do not match, an AssertionError will be thrown.

 * ``git describe --tags`` is a command run to fetch tag information from a git
   checkout with the Kolibri code. The information is used to validate the
   major components of ``kolibri.VERSION`` and to add a suffix (if needed).
   This information is stored permanently in ``kolibri/VERSION`` before shipping
   any built asset by calling ``make writeversion`` during ``make dist`` etc.


This table shows examples of kolibri.VERSION and git data used to generate a specific version:


+--------------+---------------------+---------------------------+-------------------------------------+
| Release type | ``kolibri.VERSION`` | Git data                  | Examples                            |
+==============+=====================+===========================+=====================================+
| Final        | (1, 2, 3)           | Final tag: e.g. v1.2.3    | 1.2.3                               |
+--------------+---------------------+---------------------------+-------------------------------------+
| dev release  | (1, 2, 3)           | timestamp of latest       | 1.2.3.dev0+git.123.f1234567         |
| (alpha0)     |                     | commit + hash             |                                     |
+--------------+---------------------+---------------------------+-------------------------------------+
| alpha1+      | (1, 2, 3)           | Alpha tag: e.g. v1.2.3a1  | Clean head:                         |
|              |                     |                           | 1.2.3a1,                            |
|              |                     |                           | 4 changes                           |
|              |                     |                           | since tag:                          |
|              |                     |                           | 1.2.3a1.dev0+git.4.f1234567         |
+--------------+---------------------+---------------------------+-------------------------------------+
| beta1+       | (1, 2, 3)           | Beta tag: e.g. v1.2.3b1   | Clean head:                         |
|              |                     |                           | 1.2.3b1,                            |
|              |                     |                           | 5 changes                           |
|              |                     |                           | since tag:                          |
|              |                     |                           | 1.2.3b1.dev0+git.5.f1234567         |
+--------------+---------------------+---------------------------+-------------------------------------+
| rc1+         | (1, 2, 3)           | RC tag: e.g. v1.2.3rc1    | Clean head:                         |
| (release     |                     |                           | 1.2.3rc1,                           |
| candidate)   |                     |                           | Changes                             |
|              |                     |                           | since tag:                          |
|              |                     |                           | 1.2.3rc1.dev0+git.f1234567          |
+--------------+---------------------+---------------------------+-------------------------------------+


**Built assets**: ``kolibri/VERSION`` is auto-generated with ``make writeversion``
during the build process. The file is read in preference to git
data in order to prioritize swift version resolution in an installed
environment.


Release order example 1.2.3 release:

 * ``VERSION = (1, 2, 3)`` throughout the development phase, this
   results in a lot of ``1.2.3.dev0+git1234abcd`` with no need for
   git tags.
 * ``VERSION = (1, 2, 3)`` for the first alpha release, a git tag v1.2.3a0 is made.

.. warning::
    Do not import anything from the rest of Kolibri in this module, it's
    crucial that it can be loaded without the settings/configuration/django
    stack.

If you wish to use ``version.py`` in another project, raw-copy the contents
of this file. You cannot import this module in other distributed package's
``__init__``, because ``setup.py`` cannot depend on the import of other
packages at install-time (which is when the version is generated and stored).
"""
import datetime
import logging
import os
import pkgutil
import re
import subprocess
import sys

from .lru_cache import lru_cache

logger = logging.getLogger(__name__)

ORDERED_VERSIONS = ("alpha", "beta", "rc", "final")
MAJOR_VERSION = "major"
MINOR_VERSION = "minor"
PATCH_VERSION = "patch"
PRERELEASE_VERSION = "prerelease"
BUILD_VERSION = "build"


def get_major_version(version):
    """
    :returns: String w/ first digit part of version tuple x.y.z
    """

    major = ".".join(str(x) for x in version[:3])
    return major


def get_git_changeset():
    """
    Returns a numeric identifier of the latest git changeset.

    The result is the UTC timestamp of the changeset in YYYYMMDDHHMMSS format.
    This value isn't guaranteed to be unique, but collisions are very unlikely,
    so it's sufficient for generating the development version numbers.

    If there is no git data or git installed, it will return None
    """
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        git_log = subprocess.Popen(
            "git log --pretty=format:%ct --quiet --abbrev=8 -1 HEAD",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True,
        )
        # This does not fail if git is not available or current dir isn't a git
        # repo - it's safe.
        timestamp = git_log.communicate()[0]
        timestamp = datetime.datetime.utcfromtimestamp(int(timestamp))
        # We have some issues because something normalizes separators to "."
        # From PEP440: With a local version, in addition to the use of . as a
        # separator of segments, the use of - and _ is also acceptable. The
        # normal form is using the . character. This allows versions such as
        # 1.0+ubuntu-1 to be normalized to 1.0+ubuntu.1.
        #
        # TODO: This might be more useful if it had a git commit has also
        return "+git.{}".format(timestamp.strftime("%Y%m%d%H%M%S"))
    except (EnvironmentError, ValueError):
        return None


def get_git_describe(version):
    """
    Detects a valid tag, 1.2.3-<alpha|beta|rc>(-123-sha123)
    :returns: None if no git tag available (no git, no tags, or not in a repo)
    """

    # Do not try to run git in app mode, as on Mac it will prompt the app user to install
    # developer tools. App packaging tools set sys.frozen to True, so we use that as our test.
    if hasattr(sys, "frozen"):
        return None

    valid_pattern = re.compile(r"^v[0-9-.]+(-(alpha|beta|rc)[0-9]+)?(-\d+-\w+)?$")
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        p = subprocess.Popen(
            # Match based on the current minor version, as all tags in the same
            # minor version series should share a commit history, and so the nearest
            # commit for this minor version should be in accordance to the current version.
            # This prevents cascade merges from patch releases in earlier versions necessitating
            # a new tag in the higher minor version branch.
            "git describe --tags --abbrev=8 --match 'v[[:digit:]]*.[[:digit:]]*.[[:digit:]]*'".format(
                *version
            ),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True,
        )
        # This does not fail if git is not available or current dir isn't a git
        # repo - it's safe.
        version_string = p.communicate()[0].rstrip()
        return version_string if valid_pattern.match(version_string) else None
    except EnvironmentError:
        return None


def get_version_from_git(get_git_describe_string):
    """
    Fetches the latest git tag (NB! broken behavior!)

    :returns: A validated tuple, same format as kolibri.VERSION, but with extra
        data suffixed. Example: (1, 2, 3, 'alpha', '1-123-f12345')

    """
    git_tag_validity_check = re.compile(
        r"v(?P<version>\d+\.\d+(\.\d+)?)"
        r"(-(?P<release>alpha|beta|rc|post)(?P<release_number>\d+))?"
        r"(?P<suffix>"
        r"(-(?P<build>\d+))?"
        r"(-(?P<hash>.+))?"
        r")"
    )
    m = git_tag_validity_check.match(get_git_describe_string)
    if not m:
        raise AssertionError(
            "Unparsable git describe info: {}".format(get_git_describe_string)
        )

    version = m.group("version")
    version_split = version.split(".")
    if len(version_split) == 2:
        major, minor = version_split
        patch = 0
    else:
        major, minor, patch = version_split

    # We need to replace "-" with ".". Namely, this is done automatically in
    # the naming of source dist .whl and .tar.gz files produced by setup.py.
    # See: https://www.python.org/dev/peps/pep-0440/#local-version-identifiers
    suffix = m.group("suffix").replace("-", ".")
    suffix = ".dev0+git" + suffix if suffix else ""

    return (
        (
            int(major),
            int(minor),
            int(patch),
            m.group("release") or "final",
            int(m.group("release_number") or 0),
        ),
        suffix,
    )


def get_version_file():
    """
    Looks for a file VERSION in the package data and returns the contents in
    this. Does not check consistency.
    """
    try:
        return pkgutil.get_data("kolibri", "VERSION").decode("utf-8")
    except IOError:
        return None


def get_prerelease_version(version):
    """
    Called when kolibri.VERSION is set to a non-final version:

    if version ==
    \\*, \\*, \\*, "alpha", 0: Maps to latest commit timestamp
    \\*, \\*, \\*, "alpha", >0: Uses latest git tag, asserting that there is such.
    """
    mapping = {"alpha": "a", "beta": "b", "rc": "rc"}
    major = get_major_version(version)

    # Calculate suffix...
    tag_describe = get_git_describe(version)

    # If the detected git describe data is not valid, then either respect

    if tag_describe:

        git_version, suffix = get_version_from_git(tag_describe)
        # We will check if the git_tag and version strings are the same length,
        # and compare it the first three characters of each string to see if they matches.
        # if not, we then raise an AssertionError.
        if not suffix:
            if not git_version[:3] == version[:3]:
                raise AssertionError(
                    (
                        "Version detected from git describe --tags, but it's "
                        "inconsistent with kolibri.__version__."
                        "__version__ is: {}, tag says: {}."
                    ).format(str(version), git_version)
                )
        # checks if the version number in git_version is greater than the version number in version.
        # If it is, the code raises an AssertionError
        if git_version[:3] > version[:3]:
            raise AssertionError(
                (
                    "Version detected from git describe --tags, but it's "
                    "inconsistent with kolibri.__version__."
                    "__version__ is: {}, tag says: {}."
                ).format(str(version), git_version)
            )
        # checks if the tag in git_version is the same to the final version number in version.
        # If it is, we return the major version number.
        # And If the tag was of a final version, we will use it.

        if git_version[:3] == version[:3]:
            if git_version[3] == "final":
                if not suffix:
                    return major
                else:
                    # If there's a suffix, we're post the final tag for the release
                    # so set it to an alpha to give a more meaningful version number
                    # although it is slighly incorrect as we have already released.
                    git_version = (
                        git_version[0],
                        git_version[1],
                        git_version[2],
                        "alpha",
                        git_version[4],
                    )

            return (
                get_major_version(git_version)
                + mapping[git_version[3]]
                + str(git_version[4])
                + suffix
            )

    return major + ".dev0" + (get_git_changeset() or "")


def get_version_from_file(version):
    # No git data, will look for a VERSION file
    version_file = get_version_file()

    # Check that the version file is consistent
    if version_file:
        # Because \n may have been appended
        version_file = version_file.strip()
        version_major_minor_patch = truncate_version(version_file)
        split_version = version_major_minor_patch.split(".")
        major = int(split_version[0])
        minor = int(split_version[1])
        patch = int(split_version[2])
        # If the major, minor, and patch of the parsed version number
        # We will raise an error
        if (major, minor, patch) != version[:3]:
            raise AssertionError(
                (
                    "Version detected from VERSION file, but it's "
                    "inconsistent with kolibri.__version__."
                    "__version__ is: {}, VERSION file says: {}."
                ).format(str(version), version_file)
            )

        return version_file


@lru_cache()
def get_version(version):
    version_str = get_version_from_file(version)
    if version_str:
        return version_str

    return get_prerelease_version(version)


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
    version = normalize_version_to_semver(version)

    # check whether the version is in the range
    return semver.match(version, operator + range_version)


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

    # position final releases between alphas, betas, and further dev
    if not dev:
        after = (after + ".c").strip(".")

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

    v = semver.parse_version_info(
        normalize_version_to_semver(version).replace(".dev", "+dev")
    )

    if truncation_level == MAJOR_VERSION:
        return semver.format_version(v.major, 0, 0)
    if truncation_level == MINOR_VERSION:
        return semver.format_version(v.major, v.minor, 0)
    if truncation_level == PATCH_VERSION:
        return semver.format_version(v.major, v.minor, v.patch)
    if truncation_level == PRERELEASE_VERSION:
        truncated_version = semver.format_version(
            v.major, v.minor, v.patch, prerelease=v.prerelease
        )
        # ensure prerelease formatting matches our convention
        truncated_version, prerelease_version = truncated_version.split("-")
        return "{}{}".format(truncated_version, prerelease_version.replace(".", ""))
    return version
