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
        return re.search(r'(\d+\.\d+)', version_file.read()).group(1)

def num_commits():
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


def current_time():
    """
    Returns the current timestamp.
    """
    return datetime.now().strftime('%y%m%d%H%M')


def apk_version():
    """
    Returns the version to be used for the Kolibri Android app.
    Schema: [kolibri major minor version].[kolibri android repo # commits].[timestamp]
    """
    return '{}.{}.{}'.format(kolibri_version(), num_commits(), current_time())

def create_project_info(version=None, dir='.'):
    """
    Generates project_info.json based on project_info.template
    """
    if version is None:
        version = apk_version()

    with open('project_info.template', 'r') as pi_template_file, open(dir+'/project_info.json', 'w') as pi_file:
        pi_template = Template(pi_template_file.read())
        pi = pi_template.substitute(apk_version=version)
        pi_file.write(pi)
