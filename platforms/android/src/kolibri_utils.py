import os
import pew.ui
import sys


script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app_settings"

# TODO: before shipping the app, make this contingent on debug vs production mode
os.environ["KOLIBRI_RUN_MODE"] = "pew-dev"


if pew.ui.platform == "android":
    # initialize some system environment variables needed to run smoothly on Android
    from android_utils import get_timezone_name
    os.environ["TZ"] = get_timezone_name()
    os.environ["LC_ALL"] = "en_US.UTF-8"


def start_kolibri_server():

    from kolibri.utils.cli import main

    print("Starting Kolibri server...")
    print("Port: {}".format(os.environ.get("KOLIBRI_HTTP_PORT", "(default)")))
    print("Home folder: {}".format(os.environ.get("KOLIBRI_HOME", "(default)")))
    print("Timezone: {}".format(os.environ.get("TZ", "(default)")))

    main(["start", "--foreground"])

