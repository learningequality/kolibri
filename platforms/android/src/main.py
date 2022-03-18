import initialization  # keep this first, to ensure we're set up for other imports

import logging
import time

from jnius import autoclass

from android_utils import start_service
from runnable import Runnable

# we need to initialize Kolibri to allow us to access the app key
from kolibri.utils.cli import initialize
from kolibri.plugins.app.utils import interface
from kolibri.utils.server import STATUS_RUNNING
from kolibri.utils.server import wait_for_status
from kolibri.utils.server import _read_pid_file
from kolibri.utils.server import PID_FILE


PythonActivity = autoclass('org.kivy.android.PythonActivity')

loadUrl = Runnable(PythonActivity.mWebView.loadUrl)

logging.info("Initializing Kolibri and running any upgrade routines")

loadUrl("file:///android_asset/_load.html")

initialize()

# start kolibri server
logging.info("Starting kolibri server via Android service...")
start_service("server")
start_service("remoteshell")

# Tie up this thread until the server is running
wait_for_status(STATUS_RUNNING, timeout=120)

_, port, _, _ = _read_pid_file(PID_FILE)

start_url = "http://127.0.0.1:{port}".format(port=port) + interface.get_initialize_url()
loadUrl(start_url)

while True:
    time.sleep(0.05)
