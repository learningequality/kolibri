"""
We follow semantic versioning 2.0.0 according to
`semver.org <http://semver.org/>`__ but for Python distributions and in the
internal string representation in Python, you will find a
`PEP-440 <https://www.python.org/dev/peps/pep-0440/>`__ flavor.

 * ``1.1.0`` (Semver)  = ``1.1.0`` (PEP-440).
 * ``1.0.0-alpha.1`` (Semver)  = ``1.0.0a1`` (PEP-440).

Here's how version numbers are generated:

 * ``kolibri.__version__`` is automatically set, runtime environments use it
   to decide the version of Kolibri as a string. This is especially something
   that PyPi and setuptools use.

 * ``kolibri.VERSION`` is a tuple containing version information, it's set in
   ``kolibri/__init__.py`` is automatically suffixed in pre-releases by a
   number of rules defined below. For a final release (not a pre-release),
   it will be used exactly as it appears.

 * ``kolibri/VERSION`` is a file containing the exact version of Kolibri for a
   distributed environment (pre-releases only!)

 * ``git describe --tags`` is a command run to fetch tag information from a git
   checkout with the Kolibri code. The information is used to validate the
   major components of ``kolibri.VERSION`` and to suffix the final version of
   prereleases. This information is stored permanently in ``kolibri/VERSION``
   before shipping a pre-release by calling ``make writeversion`` during
   ``make dist`` etc.


Confused? Here's a table:


+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| Release type | ``kolibri.VERSION`` | ``kolibri/VERSION`` | Git data                  | Examples                            |
+==============+=====================+=====================+===========================+=====================================+
| Final        | Canonical, only     | N/A                 | N/A                       | 0.1.0, 0.2.2,                       |
|              | information used    |                     |                           | 0.2.post1                           |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| dev release  | (1, 2, 3, 'alpha',  | Fallback            | timestamp of latest       | 0.4.0.dev020170605181124-f1234567   |
| (alpha0)     | 0), 0th alpha = a   |                     | commit + hash             |                                     |
|              | dev release! Never  |                     |                           |                                     |
|              | used as a canonical |                     |                           |                                     |
|              |                     |                     |                           |                                     |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| alpha1+      | (1, 2, 3, 'alpha',  | Fallback            | ``git describe --tags``   | Clean head:                         |
|              | 1)                  |                     |                           | 1.2.3a1,                            |
|              |                     |                     |                           | Changes                             |
|              |                     |                     |                           | since tag:                          |
|              |                     |                     |                           | 1.2.3a1.dev123-f1234567             |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| beta1+       | (1, 2, 3, 'alpha',  | Fallback            | ``git describe --tags``   | Clean head:                         |
|              | 1)                  |                     |                           | 1.2.3b1,                            |
|              |                     |                     |                           | Changes                             |
|              |                     |                     |                           | since tag:                          |
|              |                     |                     |                           | 1.2.3b1.dev123-f1234567             |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| rc1+         | (1, 2, 3, 'alpha',  | Fallback            | ``git describe --tags``   | Clean head:                         |
| (release     | 1)                  |                     |                           | 1.2.3rc1,                           |
| candidate)   |                     |                     |                           | Changes                             |
|              |                     |                     |                           | since tag:                          |
|              |                     |                     |                           | 1.2.3rc1.dev123-f1234567            |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+
| beta0, rc0,  | Not recommended,    | Fallback            | timestamp of latest       | 0.4.0b0.dev020170605181124-f1234567 |
| post0, x.y.0 | but if you use it,  |                     | commit + hash             |                                     |
|              | your release        |                     |                           |                                     |
|              | transforms into a   |                     |                           |                                     |
|              | X.Y.0b0.dev{suffix} |                     |                           |                                     |
|              | release, which in   |                     |                           |                                     |
|              | most cases should   |                     |                           |                                     |
|              | be assigned to the  |                     |                           |                                     |
|              | preceding release   |                     |                           |                                     |
|              | type.               |                     |                           |                                     |
|              |                     |                     |                           |                                     |
+--------------+---------------------+---------------------+---------------------------+-------------------------------------+


**Fallback**: ``kolibri/VERSION`` is auto-generated with ``make writeversion``
during the build process. The file is read as a fallback when there's no git
data available in a pre-release (which is the case in an installed
environment).


Release order example 1.2.3 release:

 * ``VERSION = (1, 2, 3, 'alpha', 0)`` throughout the development phase, this
   results in a lot of ``1.2.3.dev0YYYYMMDDHHMMSS-1234abcd`` with no need for
   git tags.
 * ``VERSION = (1, 2, 3, 'alpha', 1)`` for the first alpha release. When it's
   tagged and released,

.. warning::
    Do not import anything from the rest of Kolibri in this module, it's
    crucial that it can be loaded without the settings/configuration/django
    stack.

Do not import this file in other package's __init__, because installation with
setup.py should not depend on other packages. In case you were to have a
package foo that depended on kolibri, and kolibri is installed as a dependency
while foo is installing, then foo won't be able to access kolibri before after
setuptools has completed installation of everything.


How to tag releases
-------------------

.. note::
    Current practice is to tag releases after bumping
    ``kolibri.VERSION``. You are allowed to have a newer version in
    ``kolibri.VERSION``, but you are not allowed to add the tag before actually
    bumping ``kolibri.VERSION``.

Always use ``-s`` to sign your tags. Remember to push tags to remote upstream
with ``git push <upstream> --tags``

1.2.3.dev{auto-suffix} - This is normally NOT tagged, but you may::

    tag -s v1.2.3-alpha0

1.2.3a1{auto-suffix}::

    tag -s v1.2.3-alpha1

1.2.3b1{auto-suffix}::

    tag -s v1.2.3-beta1

1.2.3rc1 - a release candidate::

    tag -s v1.2.3-final

1.2.3 - a final release::

    tag -s v1.2.3

1.2.3 - a final release fix (in case something went wrong with an attempt to
release a final version v1.2.3, should not contain code changes apart from
bumping kolibri.VERSION)::

    tag -s v1.2.3-post1

"""
from __future__ import absolute_import, division, print_function, unicode_literals

import datetime
import logging
import os
import pkgutil
import re
import subprocess

from .lru_cache import lru_cache

logger = logging.getLogger(__name__)


def get_major_version(version=None):
    """
    :returns: String w/ first digit part of version tuple x.y.z
    """
    version = get_complete_version(version)
    major = '.'.join(str(x) for x in version[:3])
    return major


def get_complete_version(version=None):
    """
    :returns: A tuple of the version. If version argument is non-empty, then
              checks for correctness of the tuple provided.
    """
    if version is None:
        from kolibri import VERSION as version
    else:
        assert len(version) == 5
        assert version[3] in ('alpha', 'beta', 'rc', 'final')

    return version


def get_docs_version(version=None):
    """
    :returns: Version string for use in Sphinx docs
    """
    version = get_complete_version(version)
    if version[3] != 'final':
        return 'dev'
    else:
        return '%d.%d' % version[:2]


def get_git_changeset():
    """
    Returns a numeric identifier of the latest git changeset.

    The result is the UTC timestamp of the changeset in YYYYMMDDHHMMSS format.
    This value isn't guaranteed to be unique, but collisions are very unlikely,
    so it's sufficient for generating the development version numbers.

    If there is no git data or git installed, it will gracefully return a
    timestamp based on datetime.now()
    """
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        git_log = subprocess.Popen(
            'git log --pretty=format:%ct --quiet -1 HEAD',
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True
        )
        # This does not fail if git is not available or current dir isn't a git
        # repo - it's safe.
        timestamp = git_log.communicate()[0]
        timestamp = datetime.datetime.utcfromtimestamp(int(timestamp))
        return "{}-git".format(timestamp.strftime('%Y%m%d%H%M%S'))
    except (EnvironmentError, ValueError):
        try:
            # Check to see if we have a version file, if so, get the version from there.
            # Do this by returning None, and then the get_prerelease_version code will read the VERSION file.
            get_version_file()
        except IOError:
            return "{}-export".format(
                datetime.datetime.now().strftime('%Y%m%d%H%M%S')
            )


def get_git_describe():
    """
    :returns: None if no git tag available (no git, no tags, or not in a repo)
    """
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    try:
        p = subprocess.Popen(
            "git describe --tags --match 'v[0-9]*'",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True
        )
        # This does not fail if git is not available or current dir isn't a git
        # repo - it's safe.
        version_string = p.communicate()[0].rstrip()
        return version_string
    except EnvironmentError:
        return None

def get_version_from_git(get_git_describe_string):
    """
    Fetches the latest git tag (NB! broken behavior!)

    :returns: A validated tuple, same format as kolibri.VERSION, but with extra
    data suffixed. Example: (1, 2, 3, 'alpha', '1-123-f12345')
    """
    git_tag_validity_check = re.compile(
        r'v(?P<version>\d+\.\d+(\.\d+)?)'
        r'(-(?P<release>alpha|beta|rc|post)(?P<release_number>\d+))?'
        r'(?P<suffix>'
        r'(-(?P<build>\d+))?'
        r'(-(?P<hash>.+))?'
        r')'
    )
    m = git_tag_validity_check.match(get_git_describe_string)
    if not m:
        raise AssertionError("Unparsable git describe info: {}".format(get_git_describe_string))

    version = m.group('version')
    version_split = version.split(".")
    if len(version_split) == 2:
        major, minor = version_split
        patch = 0
    else:
        major, minor, patch = version_split

    suffix = m.group('suffix')
    suffix = ".dev" + suffix if suffix else ""

    return get_complete_version((
        int(major),
        int(minor),
        int(patch),
        m.group('release') or "final",
        int(m.group('release_number') or 0)
    )), suffix


def assert_git_version(version, git_version):
    """
    This is the policy that expresses what git version is allowed together with
    the current VERSION tuple

    :version: current VERSION tuple
    :git_version: the git version derived from git describe
    """
    if not (
        version[0] == git_version[0] and
        version[1] == git_version[1] and
        version[2] == git_version[2] and
        (
            version[3] > git_version[3] or
            version[3] == git_version[3] and
            version[4] >= git_version[4]
        )
    ):
        raise AssertionError(
            "Inconsistent git tagging: {} <= {}".format(version, git_version)
        )


def get_version_file():
    """
    Looks for a file VERSION in the package data and returns the contents in
    this. Does not check consistency.
    """
    return pkgutil.get_data('kolibri', 'VERSION').decode('utf-8')


def get_prerelease_version(version):
    """
    Called when kolibri.VERSION is set to a non-final version:

    if version ==
    *, *, *, "alpha", 0: Maps to latest commit timestamp
    *, *, *, "alpha", >0: Uses latest git tag, asserting that there is such.
    """

    major = get_major_version(version)

    mapping = {'alpha': 'a', 'beta': 'b', 'rc': 'rc'}
    suffix = ''

    # Support item assignment instead of tuple
    version = list(version)

    tag_describe = get_git_describe()

    # If it's the 0th alpha, load suffix info from git changeset
    if version[4] == 0 and version[3] == 'alpha':
        mapping['alpha'] = '.dev'
        suffix = get_git_changeset()

    major_and_release = major + mapping[version[3]] + str(version[4])

    # Calculate suffix...

    # If a description from git is available and we haven't already
    # found a suffix
    if not suffix and tag_describe:
        git_version, git_suffix = get_version_from_git(tag_describe)

        # Fail in case the VERSION tuple and version derived from Git are
        # not tolerable.
        assert_git_version(version, git_version)

        # We allow a git version that specifies the same
        # (major, minor, patch, release) - for instance 1.2.3a2 - as
        # the current tag to be filled in with a suffix from git.
        if version[3] == git_version[3] and version[4] == git_version[4]:
            suffix = git_suffix

    # If no git info, *fallback* to VERSION file info
    elif not suffix:
        # No git data, will look for a VERSION file
        version_file = get_version_file()

        # Check that the version file is consistent
        if version_file:

            # Because \n may have been appended
            version_file = version_file.strip()

            # If there is a '.dev', we can remove it, otherwise we check it
            # for consistency and fail if inconsistent
            before_dev = version_file.split(".dev")[0]

            if not major_and_release.startswith(before_dev):
                raise AssertionError(
                    "VERSION file inconsistent with kolibri.__version__. "
                    "__version__ is: {}, File says: {}".format(
                        str(version),
                        version_file
                    )
                )
            else:
                return version_file

    return major_and_release + suffix


@lru_cache()
def get_version(version=None):
    """
    Returns a PEP 440-compliant version number from VERSION.
    Derives additional information from git repository if code is contained
    in such.

    This is important to read from PEP-404 (which this function is compliant
    with):

    Within a numeric release ( 1.0.0 , 2.7.3 ), the following suffixes are
    permitted and MUST be ordered as shown:

    .devN, aN, bN, rcN, <no suffix>, .postN
    """
    version = get_complete_version(version)

    # Prerelease versions are special, we parse git data and look for special
    # VERSION files in package data to fetch auto-generated data.
    if version[3] != 'final':
        return get_prerelease_version(version)

    major = get_major_version(version)

    sub = ''
    if version[4] > 0:
        sub = ".post{}".format(version[4])

    return str(major + sub)
