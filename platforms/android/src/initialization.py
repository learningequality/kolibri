import os
import pew.ui
import sys


script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))
sys.path.append(os.path.join(script_dir, "extra-packages"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app_settings"

# TODO: before shipping the app, make this contingent on debug vs production mode
os.environ["KOLIBRI_RUN_MODE"] = "pew-dev"


if pew.ui.platform == "android":
    # initialize some system environment variables needed to run smoothly on Android
    from android_utils import get_timezone_name
    os.environ["TZ"] = get_timezone_name()
    os.environ["LC_ALL"] = "en_US.UTF-8"