import os
import pew.ui
import re
import sys

from jnius import autoclass
from android_utils import get_activity

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))
sys.path.append(os.path.join(script_dir, "extra-packages"))

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app_settings"
Secure = autoclass('android.provider.Settings$Secure')

node_id = Secure.getString(
    get_activity().getContentResolver(),
    Secure.ANDROID_ID
)

# Don't set this if the retrieved id is falsy, too short, or a specific
# id that is known to be hardcoded in many devices.
if node_id and len(node_id) >= 16 and node_id != "9774d56d682e549c":
    os.environ["MORANGO_NODE_ID"] = node_id

if pew.ui.platform == "android":
    # initialize some system environment variables needed to run smoothly on Android

    from android_utils import get_timezone_name, get_signature_key_issuing_organization

    signing_org = get_signature_key_issuing_organization()
    if signing_org == "Learning Equality":
        runmode = "android-testing"
    elif signing_org == "Android":
        runmode = "android-debug"
    elif signing_org == "Google Inc.":
        runmode = ""  # Play Store!
    else:
        runmode = "android-" + re.sub(r"[^a-z ]", "", signing_org.lower()).replace(" ", "-")
    os.environ["KOLIBRI_RUN_MODE"] = runmode

    os.environ["TZ"] = get_timezone_name()
    os.environ["LC_ALL"] = "en_US.UTF-8"
