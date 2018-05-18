"""

We have three Kolibri release types:
 * tagged final releases
 * tagged pre-releases
 * untagged pre-releases

Tagged final releases are parameterized by three values: the major, minor, and
patch version numbers. These three numbers are the "base" release version,
for example version `v1.2.3`. This is called a "final" release, and is set by
a tag in the git repo on a release branch.

Tagged pre-releases are alphas (tagged on the develop branch) and betas (tagged
on a release branch). Alphas and betas are parameterized by an incrementing
integer - for example `v1.2.3-beta.4` or `v1.2.3-alpha.5`.

Untagged releases can be generated at any time. These might correspond to a
build from a pull request, a feature branch, or any other point in the git tree.
These releases are parameterized by the short git commit hash. For example,
`v1.2.3-dev.62580c06d` or `v1.2.3-dev.62580c06d.local` if there were uncommitted
changes in the local working copy.

In many cases we need to build a tagged release, but `git` and the `.git` repo
are not available to supply the tagged information. Therefore, we cache the
full version information into a `VERSION` file, and use this as a backup source.


----


NOTES ON MODIFYING THIS FILE

Do not import anything from the rest of Kolibri in this module, it's
crucial that it can be loaded without the settings/configuration/django
stack.

Do not import this file in other package's __init__, because installation with
setup.py should not depend on other packages. In case you were to have a
package foo that depended on kolibri, and kolibri is installed as a dependency
while foo is installing, then foo won't be able to access kolibri before after
setuptools has completed installation of everything.

"""



from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import datetime
import logging
import os
import pkgutil
import re
import subprocess

from .lru_cache import lru_cache
from .KolibriVersion import KolibriVersion, KolibriVersionError

logger = logging.getLogger(__name__)



def _run(command):
    repo_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    p = subprocess.Popen(
        command,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        shell=True,
        cwd=repo_dir,
        universal_newlines=True
    )
    return p.communicate()[0].rstrip()


def _version_info_from_git(base_version_tuple):
    """
    Try to extract version info from git.
    Return a KolibriVersion object if possible, or None otherwise.
    """

    version_info = KolibriVersion(base_version_tuple)

    try:
        # if we're on a tag, extract that information
        tag_str = _run('git describe --exact-match --tags HEAD')
        if tag_str:
            try:
                version_info.set_from_semver_str(tag_str)
                return version_info
            except KolibriVersionError as e:
                logger.error("Ignoring git tag due to error: {}".format(str(e)))

        # otherwise grab commit info
        commit_str = _run('git rev-parse --short HEAD')
        is_dirty = 'dirty' in _run('git describe --dirty')
        version_info.set_dev(commit_str, is_dirty)
        return version_info

    except EnvironmentError:
        return None


def _version_info_from_file(base_version_tuple):
    """
    Look for a 'VERSION' file in the package data.
    Return a KolibriVersion object if possible, or None otherwise.
    """

    data = pkgutil.get_data('kolibri', 'VERSION')
    if not data:
        return None

    pep440_str = data.decode('utf-8').strip()
    if not pep440_str:
        return None

    version_info = KolibriVersion(base_version_tuple)
    version_info.set_from_pep440_str(pep440_str)
    return version_info


@lru_cache()
def get_kolibri_version(base_version_tuple):
    """
    Returns a `KolibriVersion` object, which includes pre-release information.
    This pre-release info is derived either from git directly (when possible),
    or from a cache of the version info (when building distributions).
    """

    # Get git information if it's available and consistent with base
    git_version_info = _version_info_from_git(base_version_tuple)

    # Get cached information if it's available and consistent with base
    file_version_info = _version_info_from_file(base_version_tuple)

    # check for additional inconsistency
    if git_version_info and file_version_info and git_version_info != file_version_info:
        raise KolibriVersionError("git ({}) and file ({}) versions do not match".format(
                git_version_info.pep_440_str,
                file_version_info.pep_440_str,
            ))

    # when available and consistent, return the full version info
    if git_version_info or file_version_info:
        return git_version_info if git_version_info else file_version_info

    # no version info was found
    unknown_version_info = KolibriVersion(base_version_tuple)
    unknown_version_info.set_dev('unknown', True)
    return unknown_version_info

