#!/usr/bin/env python3
import logging

from magicbus.plugins import SimplePlugin

from kolibri.main import enable_plugin
from kolibri.plugins.app.utils import interface
from kolibri.utils.cli import initialize
from kolibri.utils.server import KolibriProcessBus


class AppPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        self.port = port

    def RUN(self):
        start_url = (
            "http://127.0.0.1:{port}".format(port=self.port)
            + interface.get_initialize_url()
        )
        print("Kolibri running at: {start_url}".format(start_url=start_url))


logging.info("Initializing Kolibri and running any upgrade routines")

# activate app mode
enable_plugin("kolibri.plugins.app")

# we need to initialize Kolibri to allow us to access the app key
initialize()

# start kolibri server
logging.info("Starting kolibri server.")

kolibri_bus = KolibriProcessBus(port=8000)
app_plugin = AppPlugin(kolibri_bus)
app_plugin.subscribe()
kolibri_bus.run()
