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

def android_commit_hash():
    """
    Returns the number of commits of the Kolibri Android repo. Returns 0 if something fails.

    TODO hash, unless there's a tag. Use alias to annotate
    """
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        p = subprocess.Popen(
            "git rev-parse HEAD",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True
        )
        return p.communicate()[0].rstrip()
    except OSError:
        return 0

def android_git_tag():
    repo_dir = os.path.dirname(os.path.abspath(__file__))
    try:
        p = subprocess.Popen(
            "git tag --points-at {}".format(android_commit_hash()),
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            shell=True,
            cwd=repo_dir,
            universal_newlines=True
        )
        return p.communicate()[0].rstrip()
    except OSError:
        return 0

def build_type():
    key_alias = os.getenv('P4A_RELEASE_KEY', 'unknown')
    if key_alias == 'LE_DEV_KEY':
        return 'dev'
    if key_alias == 'LE_RELEASE_KEY':
        return 'official'
    return key_alias

def current_time():
    """
    Returns the current timestamp.
    """
    return datetime.now().strftime('%y%m%d%H%M')


def apk_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri version].[android installer version or githash]-[build signature type]
    """
    android_version_indicator = android_git_tag() or android_commit_hash()
    return '{}|{}-{}'.format(kolibri_version(), android_version_indicator, build_type())

def build_number():
    """
    Returns the build number for the apk. This is the mechanism used to understand whether one
    build is newer than another. Format: [Time of build].[apk version, stripped to digits]
    """
    raw_build = '{}.{}'.format(current_time(),apk_version()).strip()
    return re.sub('[^0-9]', '', raw_build)

def create_project_info(version=None, dir='.'):
    """
    Generates project_info.json based on project_info.template
    """

    if version is None:
        version = apk_version()
        build = build_number()
    else:
        build = re.sub('[^0-9]', '', version)

    with open('project_info.template', 'r') as pi_template_file, open(dir+'/project_info.json', 'w') as pi_file:
        pi_template = Template(pi_template_file.read())
        pi = pi_template.substitute(apk_version=version, build_number=build)
        pi_file.write(pi)
