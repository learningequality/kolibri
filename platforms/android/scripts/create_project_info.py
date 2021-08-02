import os
import re
import subprocess
from datetime import datetime
from string import Template


def kolibri_version():
    """
    Returns the major.minor version of Kolibri if it exists
    """
    with open('./src/kolibri/VERSION', 'r') as version_file:
        # p4a only likes digits and decimals
        return version_file.read().strip()

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
        universal_newlines=True
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
        universal_newlines=True
    )
    return p.communicate()[0].rstrip()

def build_type():
    key_alias = os.getenv('P4A_RELEASE_KEYALIAS', 'unknown')
    if key_alias == 'LE_DEV_KEY':
        return 'dev'
    if key_alias == 'LE_RELEASE_KEY':
        return 'official'
    return key_alias

def apk_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri version]-[android installer version or githash]-[build signature type]
    """
    android_version_indicator = git_tag() or commit_hash()
    return '{}-{}-{}'.format(kolibri_version(), android_version_indicator, build_type())

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

    buildkite_build_number = os.getenv('BUILDKITE_BUILD_NUMBER')
    increment_for_64bit = 1 if os.getenv('ARCH', '') == '64bit' else 0
    
    print('--- Assigning Build Number')

    if buildkite_build_number is not None:
        build_number = build_base_number + 2 * int(buildkite_build_number) + increment_for_64bit
        print(build_number)
        return str(build_number)

    print('Buildkite build # not found, using dev alternative')
    alt_build_number = datetime.now().strftime('%y%m%d%H%M')
    print(alt_build_number)
    return alt_build_number

def create_project_info():
    """
    Generates project_info.json based on project_info.template
    """
    with open('project_info.template', 'r') as pi_template_file, open('./project_info.json', 'w') as pi_file:
        pi_template = Template(pi_template_file.read())
        pi = pi_template.substitute(apk_version=apk_version(), build_number=build_number())
        pi_file.write(pi)

create_project_info()
