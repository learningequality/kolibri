import logging

import initialization  # noqa: F401 keep this first, to ensure we're set up for other imports
from android_utils import share_by_intent
from android_utils import start_service
from jnius import autoclass
from kolibri.main import enable_plugin
from kolibri.plugins.app.utils import interface
from kolibri.utils.cli import initialize
from kolibri.utils.server import BaseKolibriProcessBus
from kolibri.utils.server import KolibriServerPlugin
from kolibri.utils.server import ZeroConfPlugin
from kolibri.utils.server import ZipContentServerPlugin
from magicbus.plugins import SimplePlugin
from runnable import Runnable


PythonActivity = autoclass("org.kivy.android.PythonActivity")

loadUrl = Runnable(PythonActivity.mWebView.loadUrl)


class AppPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        start_url = (
            "http://127.0.0.1:{port}".format(port=port) + interface.get_initialize_url()
        )
        loadUrl(start_url)


logging.info("Initializing Kolibri and running any upgrade routines")

loadUrl("file:///android_asset/_load.html")

# activate app mode
enable_plugin("kolibri.plugins.app")

# we need to initialize Kolibri to allow us to access the app key
initialize()

interface.register(share_file=share_by_intent)

# start kolibri server
logging.info("Starting kolibri server.")

kolibri_server = BaseKolibriProcessBus()
# Setup zeroconf plugin
zeroconf_plugin = ZeroConfPlugin(kolibri_server, kolibri_server.port)
zeroconf_plugin.subscribe()
kolibri_server = KolibriServerPlugin(
    kolibri_server,
    kolibri_server.port,
)

alt_port_server = ZipContentServerPlugin(
    kolibri_server,
    kolibri_server.zip_port,
)
# Subscribe these servers
kolibri_server.subscribe()
alt_port_server.subscribe()
app_plugin = AppPlugin(kolibri_server)
app_plugin.subscribe()
start_service("workers")
kolibri_server.run()
