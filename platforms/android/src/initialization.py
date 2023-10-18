import os
import re
import sys

import kolibri  # noqa: F401  Import Kolibri here so we can import modules from dist folder
import monkey_patch_zeroconf  # noqa: F401 Import this to patch zeroconf
from android_utils import get_context
from android_utils import get_home_folder
from android_utils import get_signature_key_issuing_organization
from android_utils import get_timezone_name
from android_utils import get_version_name
from jnius import autoclass

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)

os.environ["KOLIBRI_HOME"] = get_home_folder()
os.environ["KOLIBRI_APK_VERSION_NAME"] = get_version_name()
os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app_settings"
# Disable restart hooks, as the default restart hook will crash the app.
os.environ["KOLIBRI_RESTART_HOOKS"] = ""
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


os.environ["KOLIBRI_CHERRYPY_THREAD_POOL"] = "2"


def set_node_id():
    Secure = autoclass("android.provider.Settings$Secure")
    node_id = Secure.getString(get_context().getContentResolver(), Secure.ANDROID_ID)

    # Don't set this if the retrieved id is falsy, too short, or a specific
    # id that is known to be hardcoded in many devices.
    if node_id and len(node_id) >= 16 and node_id != "9774d56d682e549c":
        os.environ["MORANGO_NODE_ID"] = node_id


set_node_id()
