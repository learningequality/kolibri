import json
import os
from datetime import datetime

kolibri_dir = os.path.abspath(os.path.join('src', 'kolibri'))


def kolibri_version():
    """
    Returns the major.minor version of Kolibri if it exists
    """
    with open(os.path.join(kolibri_dir, 'VERSION'), 'r') as version_file:
        # p4a only likes digits and decimals
        return version_file.read().strip()


def build_number():
    """
    Returns the build number for the apk. This is the mechanism used to understand whether one
    build is newer than another. Uses buildkite build number with time as local dev backup
    """
    return os.getenv('BUILDKITE_BUILD_NUMBER', datetime.now().strftime('%y%m%d%H%M'))


def get_env_with_version_set(args):
    env = os.environ.copy()

    build_num = build_number()

    env['KOLIBRI_VERSION'] = kolibri_version()
    env['APP_BUILD_NUMBER'] = build_num

    # set version information, Android appends more info to the version string
    # TODO: Determine if there's a better place to store the app version info.
    # Maybe it makes sense to have a kolibri_app module with everything except
    # the main.py code in it?
    info_json = json.load(open(os.path.join(os.getcwd(), 'project_info.json')))
    env['FULL_VERSION'] = info_json['app_version']
    return env
