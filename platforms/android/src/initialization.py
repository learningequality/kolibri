import os
import re
import sys

from android_utils import get_context
from android_utils import get_home_folder
from android_utils import get_signature_key_issuing_organization
from android_utils import get_timezone_name
from android_utils import get_version_name
from jnius import autoclass

script_dir = os.path.dirname(os.path.abspath(__file__))
sys.path.append(script_dir)
sys.path.append(os.path.join(script_dir, "kolibri", "dist"))
sys.path.append(os.path.join(script_dir, "extra-packages"))

os.environ["KOLIBRI_HOME"] = get_home_folder()
os.environ["KOLIBRI_APK_VERSION_NAME"] = get_version_name()
os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app_settings"
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
os.environ["KOLIBRI_SCHEDULE_HOOKS"] = "kolibri_tasks.queue_task"

Secure = autoclass("android.provider.Settings$Secure")

node_id = Secure.getString(get_context().getContentResolver(), Secure.ANDROID_ID)

# Don't set this if the retrieved id is falsy, too short, or a specific
# id that is known to be hardcoded in many devices.
if node_id and len(node_id) >= 16 and node_id != "9774d56d682e549c":
    os.environ["MORANGO_NODE_ID"] = node_id
