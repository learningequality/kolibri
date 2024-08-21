#!/usr/bin/env python3
import atexit
import logging
import os

from magicbus.plugins import SimplePlugin

from kolibri.main import disable_plugin
from kolibri.main import enable_plugin
from kolibri.plugins.app.utils import interface
from kolibri.utils.cli import initialize
from kolibri.utils.server import KolibriProcessBus


logger = logging.getLogger(__name__)


class AppPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        self.port = port

    def RUN(self):
        start_url = "http://127.0.0.1:{port}".format(
            port=self.port
        ) + interface.get_initialize_url(auth_token="1234")
        logger.info("Kolibri running at: {start_url}".format(start_url=start_url))


logger.info("Initializing Kolibri and running any upgrade routines")

# activate app mode
enable_plugin("kolibri.plugins.app")
atexit.register(disable_plugin, "kolibri.plugins.app")

# Add a task update hook
os.environ["KOLIBRI_UPDATE_HOOKS"] = "kolibri.core.tasks.job.log_status"

# we need to initialize Kolibri to allow us to access the app key
initialize()

# start kolibri server
logger.info("Starting kolibri server.")


def os_user(auth_token):
    return ("os_user", True)


def check_is_metered():
    # Set this to the value that suits your needs for testing if on a metered connection
    return True


interface.register(get_os_user=os_user)
interface.register(check_is_metered=check_is_metered)


kolibri_bus = KolibriProcessBus(port=8000)
app_plugin = AppPlugin(kolibri_bus)
app_plugin.subscribe()
kolibri_bus.run()
