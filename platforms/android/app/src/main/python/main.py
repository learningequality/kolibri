"""
Kolibri Server Entry Point for Chaquopy

This module provides the AndroidKolibriProcessBus which can be started
from Java via KolibriServerService.
"""

import logging
import socket

from auth import get_os_user_auth_token
from magicbus.plugins import SimplePlugin
from org.learningequality.Kolibri import KolibriServerViewModel

import kolibri.utils.logger as kolibri_logger
from kolibri.core.device.utils import app_initialize_url
from kolibri.utils import conf
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


def _resolve_server_port(port):
    """Reuse the port the live page is on, when it is still bindable.

    Binds rather than using port_is_available_on_host, which only probes for a
    listener: a port since handed to another app's outbound connection reads as
    free there, and cheroot then dies on EADDRINUSE.
    """
    if not port:
        return 0
    port = int(port)
    host = conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"]
    # LISTEN_ADDRESS is validated as a dotted-quad, so the family is always AF_INET.
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        # Match cheroot, which binds with SO_REUSEADDR: without it a port left in
        # TIME_WAIT reads as taken when the server can still have it.
        sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        try:
            sock.bind((host, port))
        except OSError:
            logger.warning(
                "Port %s is no longer free, electing an ephemeral port", port
            )
            return 0
    return port


class AndroidKolibriProcessBus(BaseKolibriProcessBus):
    """
    Kolibri process bus for Android with Chaquopy

    This bus manages the Kolibri HTTP server lifecycle.
    Server handles both local WebView and remote peer connections.
    """

    def __init__(self, port=0):
        super().__init__(port=port)
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


def start_server(port=0):
    """
    Start the Kolibri HTTP server
    Called from Java KolibriServerService

    port is a port to try to reuse (the live page's); 0 elects an ephemeral one.

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

    # Resolve before constructing, not inside the bus: PIDPlugin writes bus.port to the
    # PID file during construction, and KolibriServerPlugin reads it back and raises
    # RunningException if that port is occupied.
    logger.info("Creating Kolibri server bus")
    bus = AndroidKolibriProcessBus(port=_resolve_server_port(port))
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
