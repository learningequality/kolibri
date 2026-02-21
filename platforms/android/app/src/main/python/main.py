"""
Kolibri Server Entry Point for Chaquopy

This module provides the AndroidKolibriProcessBus which can be started
from Java via KolibriServerService.
"""

import logging

from auth import get_os_user_auth_token
from magicbus.plugins import SimplePlugin
from org.learningequality.Kolibri import KolibriServerViewModel

import kolibri.utils.logger as kolibri_logger
from kolibri.core.device.utils import app_initialize_url
from kolibri.utils.server import BaseKolibriProcessBus
from kolibri.utils.server import KolibriServerPlugin
from kolibri.utils.server import ZeroConfPlugin
from kolibri.utils.server import ZipContentServerPlugin

logger = logging.getLogger(__name__)

# Module-level reference to the running server bus (for shutdown)
_server_bus = None


class AppPlugin(SimplePlugin):
    """
    Plugin that handles server state monitoring

    Signals Java via ViewModel when HTTP server is ready.
    """

    def __init__(self, bus):
        self.bus = bus
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        """Called when server reaches SERVING state"""
        logger.info("Kolibri server ready on port %s", port)
        KolibriServerViewModel.getInstance().setServerReady(True)


def get_initialize_url(next_url=None):
    """Build the full initialization URL with auth token.

    Called from Java when the WebView needs to load Kolibri.
    Uses the running server's port from the bus.
    """
    if _server_bus is None:
        raise RuntimeError("Server is not running")
    auth_token = get_os_user_auth_token()
    path = app_initialize_url(auth_token=auth_token, next_url=next_url)
    return "http://127.0.0.1:{port}".format(port=_server_bus.port) + path


class AndroidKolibriProcessBus(BaseKolibriProcessBus):
    """
    Kolibri process bus for Android with Chaquopy

    This bus manages the Kolibri HTTP server lifecycle.
    Server handles both local WebView and remote peer connections.
    """

    def __init__(self):
        super().__init__()
        self._setup_plugins()

    def _setup_plugins(self):
        """Setup all required server plugins"""
        # Setup zeroconf plugin
        zeroconf_plugin = ZeroConfPlugin(self, self.port)
        zeroconf_plugin.subscribe()

        # Setup main Kolibri server
        kolibri_server = KolibriServerPlugin(self, self.port)
        kolibri_server.subscribe()

        # Setup zip content server (for alternate port)
        alt_port_server = ZipContentServerPlugin(self, self.zip_port)
        alt_port_server.subscribe()

        # Setup app plugin for state monitoring
        app_plugin = AppPlugin(self)
        app_plugin.subscribe()

    def stop(self):
        """Stop the server"""
        self.transition("EXITED")


def start_server():
    """
    Start the Kolibri HTTP server
    Called from Java KolibriServerService

    Runs HTTP server for both local WebView (via Service Worker)
    and remote peer connections. Blocks until server stops.

    Note: Kolibri initialization is done in KolibriEnvironmentInitializer.java
    via kolibri.main.initialize() - do NOT call initialize() here again
    or it will fail with "Attempted to update plugins when registry is initialized"
    """
    global _server_bus

    logger.info("Starting Kolibri server")

    # Reset queue logging flag so the server can reinitialize logging on restart.
    # Kolibri's _replace_handlers_with_queue sets this flag to True and never resets
    # it, so a second start_server() call in the same process would fail.
    kolibri_logger._queue_logging_initialized_for_process = False

    # Create and run server bus
    logger.info("Creating Kolibri server bus")
    bus = AndroidKolibriProcessBus()
    _server_bus = bus

    try:
        logger.info("Starting Kolibri server")
        # Note: This blocks until server stops
        bus.run()
    finally:
        _server_bus = None
        # Reset server state in ViewModel
        KolibriServerViewModel.getInstance().resetServerState()


def stop_server():
    """
    Stop the Kolibri HTTP server
    Called from Java KolibriServerService.onDestroy()
    """
    global _server_bus

    if _server_bus is not None:
        logger.info("Stopping Kolibri server")
        try:
            _server_bus.stop()
        except Exception as e:
            logger.error(f"Error stopping server: {e}", exc_info=True)
    else:
        logger.warning("stop_server called but no server is running")
