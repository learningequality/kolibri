import logging
import os
import pew.ui
import shutil
import time

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
logging.basicConfig(level=logging.DEBUG)


logging.info("Entering android_service.py...")

from android_utils import get_service_args, make_service_foreground
from kolibri_utils import start_kolibri_server

# load the arguments passed into the service into environment variables
args = get_service_args()
for arg, val in args.items():
    print("setting envvar '{}' to '{}'".format(arg, val))
    os.environ[arg] = str(val)

# move in a templated Kolibri data directory, including pre-migrated DB, to speed up startup
HOME_TEMPLATE_PATH = "preseeded_kolibri_home"
HOME_PATH = os.environ["KOLIBRI_HOME"]
if not os.path.exists(HOME_PATH) and os.path.exists(HOME_TEMPLATE_PATH):
    shutil.move(HOME_TEMPLATE_PATH, HOME_PATH)

# ensure the service stays running by "foregrounding" it with a persistent notification
make_service_foreground("Kolibri is running...", "Click here to resume.")

# start the kolibri server as a thread
thread = pew.ui.PEWThread(target=start_kolibri_server)
thread.daemon = True
thread.start()

while True:
    time.sleep(1)