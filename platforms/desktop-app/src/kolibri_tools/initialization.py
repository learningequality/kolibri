import logging
import os
import sys

import pew.ui


def setup_env():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    root_dir = os.path.abspath(os.path.join(script_dir, '..'))
    logging.info("service script root_dir = {}".format(root_dir))

    sys.path.append(root_dir)
    sys.path.append(os.path.join(root_dir, "kolibri", "dist"))

    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_tools.django_app_settings"

    if pew.ui.platform == "android":
        # initialize some system environment variables needed to run smoothly on Android
        from platforms.android.utils import get_timezone_name
        os.environ["TZ"] = get_timezone_name()
        os.environ["LC_ALL"] = "en_US.UTF-8"
        logging.info("set django timezone...")
