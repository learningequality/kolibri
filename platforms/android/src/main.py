import initialization  # keep this first, to ensure we're set up for other imports

import logging

from config import KOLIBRI_PORT
from jnius import autoclass

from android_utils import start_service

# we need to initialize Kolibri to allow us to access the app key
from kolibri.utils.cli import initialize
from kolibri.plugins.app.utils import interface
from kolibri.utils.server import wait_for_status
from kolibri.utils.server import STATUS_RUNNING


PythonActivity = autoclass('org.kivy.android.PythonActivity')

logging.info("Initializing Kolibri and running any upgrade routines")
initialize()

# start kolibri server
logging.info("Starting kolibri server via Android service...")
start_service("server")
start_service("remoteshell")

# Tie up this thread until the server is running
while not wait_for_status(STATUS_RUNNING):
    logging.info("Kolibri server not yet started")

start_url = "http://127.0.0.1:{port}".format(port=KOLIBRI_PORT) + interface.get_initialize_url()
PythonActivity.mWebView.loadUrl(start_url)
