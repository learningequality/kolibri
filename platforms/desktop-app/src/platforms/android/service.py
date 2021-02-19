import logging
import os
import shutil

from platforms.android.utils import share_by_intent
from platforms.android.utils import get_service_args, make_service_foreground

# load the arguments passed into the service into environment variables
# it's important that we do this even before we setup logging, as this
# ensures logging will print to the Android console by default.
args = get_service_args()
for arg, val in args.items():
    print("setting envvar '{}' to '{}'".format(arg, val))
    os.environ[arg] = str(val)

# initialize logging before loading any third-party modules, as they may cause logging to get configured.
log_basename = "kolibri-service.txt"

files_dir = os.environ['KOLIBRI_HOME']
logs_dir = os.path.join(files_dir, 'logs')
os.makedirs(logs_dir, exist_ok=True)
log_filename = os.path.join(logs_dir, log_basename)

# jnius debug info is really verbose, so use info instead.
logging.basicConfig(level=logging.INFO, filename=log_filename, filemode='w')
logging.info("Starting android service...")

logging.info("logs_dir = {}".format(logs_dir))
logging.info("logs_dir exists = {}".format(os.path.exists(logs_dir)))

from kolibri_tools.initialization import setup_env  # keep this first, to ensure we're set up for other imports
from kolibri_tools.utils import get_content_file_path
from kolibri_tools.utils import start_kolibri_server
logging.info("Calling setup_env...")
setup_env()

logging.info("Service environ = {}".format(os.environ))

import flask
import pew.ui

from config import FLASK_PORT

logging.info("Flask port = {}".format(FLASK_PORT))

logging.info("Entering android_service.py...")

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

# start a parallel Flask server as a backchannel for triggering events
flaskapp = flask.Flask(__name__)

@flaskapp.route('/share_by_intent')
def do_share_by_intent():

    args = flask.request.args
    allowed_args = ["filename", "path", "msg", "app", "mimetype"]
    kwargs = {key: args[key] for key in args if key in allowed_args}

    if "filename" in kwargs:
        kwargs["path"] = get_content_file_path(kwargs.pop("filename"))

    logging.error("Sharing: {}".format(kwargs))

    share_by_intent(**kwargs)

    return "<html><body style='background: white;'>Success</body></html>"


if __name__ == "__main__":
    flaskapp.run(host="localhost", port=FLASK_PORT)
