import getpass
import pwd
from threading import Thread

from magicbus.plugins import SimplePlugin

from kolibri.core.device.login_tokens import login_tokens
from kolibri.core.device.login_tokens import OSUserInfo
from kolibri_app.kolibri_process import KolibriProcess
from kolibri_app.logger import logging


def current_os_user():
    user_name = getpass.getuser()
    try:
        # gecos fields are comma-separated; adduser writes "Jane Doe,,,"
        full_name = pwd.getpwnam(user_name).pw_gecos.split(",", 1)[0]
    except KeyError:
        full_name = ""
    return OSUserInfo(user_name, user_name, full_name, True)


class AppPlugin(SimplePlugin):
    """
    MagicBus plugin for POSIX platforms that handles the SERVING event.

    This plugin subscribes to the Kolibri server's SERVING event and invokes
    a callback when the server is ready, allowing the UI to load Kolibri.
    """

    def __init__(self, bus, callback):
        super().__init__(bus)
        self.callback = callback
        # Subscribe to SERVING event (not part of plugin.subscribe())
        self.bus.subscribe("SERVING", self.SERVING)

    def SERVING(self, port):
        """Handle the SERVING event by invoking the callback with port info."""
        self.callback(port, root_url=None)


class PosixKolibriProcess(KolibriProcess):
    """
    POSIX-specific Kolibri process that runs in a daemon thread.

    This class inherits from KolibriProcess and adds the AppPlugin for
    direct callback communication with the main application. It manages
    its own threading to run the server in a separate thread within the
    same process.
    """

    def __init__(self, app):
        super().__init__()

        # Per-launch shared secret. The token round-trips through
        # InitializeAppView (URL query) -> APP_AUTH_TOKEN_COOKIE -> provisioning
        # validator -> GetOSUserHook, which returns the OS user the token was
        # issued to.
        try:
            self.auth_token = login_tokens.generate_for_user(current_os_user())
        except OSError:
            self.auth_token = None

        self.app_plugin = AppPlugin(self, app.load_kolibri)
        self.app_plugin.subscribe()

        self.server_thread = None

    def start(self):
        """
        Start the Kolibri server in a daemon thread.

        This method spawns a background thread that runs the server's
        event loop, allowing the main thread to continue managing the UI.
        """
        if self.server_thread:
            return

        logging.info("Preparing to start Kolibri server thread")
        self.server_thread = Thread(target=self.run)
        self.server_thread.daemon = True
        self.server_thread.start()

    def shutdown(self):
        """Shutdown the Kolibri server by transitioning to EXITED state."""
        self.transition("EXITED")
