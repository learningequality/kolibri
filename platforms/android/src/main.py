import logging
import time

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from android_utils import start_service
from jnius import autoclass
from kolibri.main import enable_plugin
from kolibri.plugins.app.utils import interface
from kolibri.utils.cli import initialize
from kolibri.utils.server import _read_pid_file
from kolibri.utils.server import PID_FILE
from kolibri.utils.server import STATUS_RUNNING
from kolibri.utils.server import wait_for_status
from runnable import Runnable

PythonActivity = autoclass("org.kivy.android.PythonActivity")

FullScreen = autoclass("org.learningequality.FullScreen")
configureWebview = Runnable(FullScreen.configureWebview)
configureWebview(PythonActivity.mActivity)

loadUrl = Runnable(PythonActivity.mWebView.loadUrl)

logging.info("Initializing Kolibri and running any upgrade routines")

loadUrl("file:///android_asset/_load.html")

# activate app mode
enable_plugin("kolibri.plugins.app")

# we need to initialize Kolibri to allow us to access the app key
initialize()

# start kolibri server
logging.info("Starting kolibri server via Android service...")
start_service("server")

# Tie up this thread until the server is running
wait_for_status(STATUS_RUNNING, timeout=120)

_, port, _, _ = _read_pid_file(PID_FILE)

start_url = "http://127.0.0.1:{port}".format(port=port) + interface.get_initialize_url()
loadUrl(start_url)

start_service("remoteshell")

while True:
    time.sleep(0.05)
