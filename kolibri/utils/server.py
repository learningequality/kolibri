import logging
import os
import signal
import socket
import sys
import threading
import time
import traceback as _traceback
from functools import partial
from subprocess import CalledProcessError
from subprocess import check_output

import ifaddr
import requests
from cheroot.wsgi import Server as BaseServer
from django.conf import settings
from django.core.management import call_command
from magicbus import ProcessBus
from magicbus.plugins import SimplePlugin
from magicbus.plugins.servers import ServerPlugin as BaseServerPlugin
from magicbus.plugins.servers import wait_for_free_port
from magicbus.plugins.servers import wait_for_occupied_port
from magicbus.plugins.signalhandler import SignalHandler as BaseSignalHandler
from magicbus.plugins.tasks import Autoreloader
from magicbus.plugins.tasks import Monitor
from zeroconf import get_all_addresses
from zeroconf import InterfaceChoice

import kolibri
from .constants import installation_types
from .system import become_daemon
from .system import pid_exists
from kolibri.utils import conf
from kolibri.utils.android import on_android

try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError

logger = logging.getLogger(__name__)

# Status codes for kolibri
STATUS_RUNNING = 0
STATUS_STOPPED = 1
STATUS_STARTING_UP = 4
STATUS_NOT_RESPONDING = 5
STATUS_FAILED_TO_START = 6
STATUS_UNCLEAN_SHUTDOWN = 7
STATUS_UNKNOWN_INSTANCE = 8
STATUS_SERVER_CONFIGURATION_ERROR = 9
STATUS_SHUTTING_DOWN = 10
STATUS_PID_FILE_READ_ERROR = 99
STATUS_PID_FILE_INVALID = 100
STATUS_UNKNOWN = 101


PORT_AVAILABILITY_CHECK_TIMEOUT = 0.1

# Used to store PID and port number (both in foreground and daemon mode)
PID_FILE = os.path.join(conf.KOLIBRI_HOME, "server.pid")

# File used to activate profiling middleware and get profiler PID
PROFILE_LOCK = os.path.join(conf.KOLIBRI_HOME, "server_profile.lock")

# File used to send a state transition command to the server process
PROCESS_CONTROL_FLAG = os.path.join(conf.KOLIBRI_HOME, "process_control.flag")

# This is a special file with daemon activity. It logs ALL stderr output, some
# might not have made it to the log file!
DAEMON_LOG = os.path.join(conf.LOG_ROOT, "daemon.txt")

status_messages = {
    STATUS_RUNNING: "OK, running",
    STATUS_STOPPED: "Stopped",
    STATUS_STARTING_UP: "Starting up",
    STATUS_NOT_RESPONDING: "Not responding",
    STATUS_FAILED_TO_START: "Failed to start (check log file: {0})".format(DAEMON_LOG),
    STATUS_UNCLEAN_SHUTDOWN: "Unclean shutdown",
    STATUS_UNKNOWN_INSTANCE: "Unknown Kolibri running on port",
    STATUS_SERVER_CONFIGURATION_ERROR: "Kolibri server configuration error",
    STATUS_PID_FILE_READ_ERROR: "Could not read PID file",
    STATUS_PID_FILE_INVALID: "Invalid PID file",
    STATUS_UNKNOWN: "Could not determine status",
}


RESTART = "restart"
STOP = "stop"
UPDATE_ZEROCONF = "update_zeroconf"


class NotRunning(Exception):
    """
    Raised when server was expected to run, but didn't. Contains a status
    code explaining why.
    """

    def __init__(self, status_code):
        self.status_code = status_code
        super(NotRunning, self).__init__()


class PortOccupied(OSError):
    pass


class RunningException(PortOccupied):
    """
    Raised when server already appears to be running
    """

    pass


class Server(BaseServer):
    def error_log(self, msg="", level=20, traceback=False):
        if traceback:
            if traceback is True:
                exc_info = sys.exc_info()
            else:
                exc_info = traceback
            msg += "\n" + "".join(_traceback.format_exception(*exc_info))
        return logger.log(level, msg)


def port_is_available_on_host(host, port):
    """
    Make sure the port is available for the server to start.
    """
    # Also bypass when the port is 0, as that will choose a port
    if port:
        try:
            wait_for_free_port(host, port, timeout=PORT_AVAILABILITY_CHECK_TIMEOUT)
        except OSError:
            return False
    return True


class ServerPlugin(BaseServerPlugin):
    def __init__(self, bus, port):
        # The server is initialized without a bind address before it is passed into the plugin.
        # Because of the property setter below for `bind_addr` the setting of `self.bind_addr`
        # in the super invocation here, results in the httpserver's `bind_addr` property being set.
        address = (conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"], port)

        super(ServerPlugin, self).__init__(
            bus,
            httpserver=Server(None, self.application, **self.server_config),
            bind_addr=address,
        )
        self._default_bind_addr = self.bind_addr

    @property
    def application(self):
        raise NotImplementedError("ServerPlugin subclasses must implement application")

    @property
    def server_config(self):
        return {
            "numthreads": conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"],
            "request_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
            "timeout": conf.OPTIONS["Server"]["CHERRYPY_SOCKET_TIMEOUT"],
            "accepted_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
            "accepted_queue_timeout": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_TIMEOUT"],
        }

    @property
    def bind_addr(self):
        # Instead of using our own copy of bind_addr, mirror httpserver.
        # This is necessary because methods in BaseServerPlugin expect
        # bind_addr to match the bind address the server is using, such as
        # when binding to port 0.
        return self.httpserver.bind_addr

    @bind_addr.setter
    def bind_addr(self, value):
        self.httpserver.bind_addr = value

    def START(self):
        # Reset httpserver bind_addr. This value changes if httpserver has
        # been started before.
        self.httpserver.bind_addr = self._default_bind_addr
        super(ServerPlugin, self).START()

    @property
    def interface(self):
        if self.httpserver.bind_addr is None:
            return "unknown interface (dynamic?)"
        if isinstance(self.httpserver.bind_addr, tuple):
            host, port = self.httpserver.bind_addr
            return "%s:%s" % (host, port)
        return "socket file: %s" % self.httpserver.bind_addr


class KolibriServerPlugin(ServerPlugin):
    def __init__(self, bus, port):
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        pid, port, _, status = _read_pid_file(bus.pid_file)
        if (
            status in IS_RUNNING
            and pid_exists(pid)
            and not port_is_available_on_host(
                conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"], port
            )
        ):
            logger.error(
                "There is another Kolibri server running. "
                "Please use `kolibri stop` and try again."
            )
            raise RunningException("There is another Kolibri server running.")
        super(KolibriServerPlugin, self).__init__(bus, port)

    @property
    def application(self):
        from kolibri.deployment.default.wsgi import application

        return application

    def ENTER(self):
        super(KolibriServerPlugin, self).ENTER()
        # Clear old sessions up
        call_command("clearsessions")

    def START(self):
        super(KolibriServerPlugin, self).START()
        _, bind_port = self.httpserver.bind_addr
        self.bus.publish("SERVING", bind_port)
        __, urls = get_urls(listen_port=bind_port)
        for url in urls:
            self.bus.publish("log", "Kolibri running on: {}".format(url), 20)

    START.priority = 75


class ZipContentServerPlugin(ServerPlugin):
    @property
    def application(self):
        from kolibri.deployment.default.alt_wsgi import alt_application

        return alt_application

    def START(self):
        super(ZipContentServerPlugin, self).START()
        _, bind_port = self.httpserver.bind_addr
        self.bus.publish("ZIP_SERVING", bind_port)

    START.priority = 75


class DefaultScheduledTasksPlugin(SimplePlugin):
    def START(self):
        from kolibri.core.analytics.tasks import schedule_ping
        from kolibri.core.deviceadmin.tasks import schedule_vacuum
        from kolibri.core.deviceadmin.tasks import schedule_streamed_cache_cleanup

        # schedule the pingback job if not already scheduled
        schedule_ping()

        # schedule the vacuum job if not already scheduled
        schedule_vacuum()

        # schedule the streamed cache cleanup job if not already scheduled
        schedule_streamed_cache_cleanup()


class ServicesPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus
        self.worker = None

    def START(self):
        from kolibri.core.tasks.main import initialize_workers

        # Initialize the iceqube engine to handle queued tasks
        self.worker = initialize_workers()

    def STOP(self):
        if self.worker is not None:
            self.worker.shutdown(wait=True)


class ZeroConfPlugin(Monitor):
    def __init__(self, bus, port):
        self.port = port
        if conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"] == "0.0.0.0":
            # Only bother doing dynamic updates of the zeroconf service if we're bound
            # to all available IP addresses.
            Monitor.__init__(self, bus, self.run, frequency=5)
        else:
            # Otherwise do a dummy initialization
            # A frequency of less than 0 will prevent the monitor from running
            Monitor.__init__(self, bus, None, frequency=-1)
        self.bus.subscribe("SERVING", self.SERVING)
        self.bus.subscribe("UPDATE_ZEROCONF", self.UPDATE_ZEROCONF)
        self.broadcast = None

    @property
    def interfaces(self):
        return (
            InterfaceChoice.All
            if conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"] == "0.0.0.0"
            else [conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"]]
        )

    @property
    def addresses_changed(self):
        # if we're bound to a specific addresses, then we don't need to do dynamic updates
        if conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"] != "0.0.0.0":
            return False

        current_addresses = set(get_all_addresses())
        return (
            self.broadcast is not None
            and self.broadcast.is_broadcasting
            and self.broadcast.addresses != current_addresses
        )

    def SERVING(self, port):
        self.port = port or self.port

    def RUN(self):
        # Register the Kolibri zeroconf service so it will be discoverable on the network
        from kolibri.core.discovery.utils.network.broadcast import (
            build_broadcast_instance,
            KolibriBroadcast,
        )
        from kolibri.core.discovery.utils.network.search import NetworkLocationListener

        instance = build_broadcast_instance(self.port)

        if self.broadcast is None:
            self.broadcast = KolibriBroadcast(instance, interfaces=self.interfaces)
            self.broadcast.add_listener(NetworkLocationListener)
            self.broadcast.start_broadcast()
        else:
            # `interfaces` should only be passed to update when there is a change to the interfaces,
            # like the detection in self.run()
            interfaces = self.interfaces if self.addresses_changed else None
            self.broadcast.update_broadcast(instance=instance, interfaces=interfaces)

    def UPDATE_ZEROCONF(self):
        self.RUN()

    def STOP(self):
        super(ZeroConfPlugin, self).STOP()

        if self.broadcast is not None:
            self.broadcast.stop_broadcast()
            self.broadcast = None

    def run(self):
        # If set of addresses that were present at the last time zeroconf updated its broadcast list
        # don't match the current set of all addresses for this device, then we should reinitialize
        # zeroconf, the listener, and the broadcast kolibri service.
        if self.addresses_changed:
            logger.info(
                "List of local addresses has changed since zeroconf was last initialized, updating now"
            )
            self.broadcast.update_broadcast(interfaces=self.interfaces)


status_map = {
    "ENTER": STATUS_STARTING_UP,
    "START": STATUS_STARTING_UP,
    "START_ERROR": STATUS_FAILED_TO_START,
    "RUN": STATUS_RUNNING,
    "STOP": STATUS_SHUTTING_DOWN,
    "STOP_ERROR": STATUS_UNCLEAN_SHUTDOWN,
    "IDLE": STATUS_STARTING_UP,
    "EXIT": STATUS_STOPPED,
    "EXIT_ERROR": STATUS_UNCLEAN_SHUTDOWN,
}

IS_RUNNING = set([STATUS_RUNNING, STATUS_STARTING_UP, STATUS_SHUTTING_DOWN])


class PIDPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus

        # Do this during initialization to set a startup lock
        self.set_pid_file(STATUS_STARTING_UP)
        self.bus.subscribe("SERVING", self.SERVING)
        self.bus.subscribe("ZIP_SERVING", self.ZIP_SERVING)
        for bus_status, status in status_map.items():
            handler = partial(self.set_pid_file, status)
            handler.priority = 10
            self.bus.subscribe(bus_status, handler)

    def set_pid_file(self, status, *args):
        """
        Writes a PID file in the format Kolibri parses

        :param: status: status of the process
        """
        if status is None:
            _, _, _, status = _read_pid_file(self.bus.pid_file)
        with open(self.bus.pid_file, "w") as f:
            f.write(
                "{}\n{}\n{}\n{}\n".format(
                    os.getpid(), self.bus.port, self.bus.zip_port, status
                )
            )

    def SERVING(self, port):
        self.bus.port = port or self.bus.port
        self.set_pid_file(STATUS_RUNNING)

    def ZIP_SERVING(self, zip_port):
        self.bus.zip_port = zip_port or self.bus.zip_port
        self.set_pid_file(None)

    def EXIT(self):
        try:
            os.unlink(self.bus.pid_file)
        except OSError:
            pass


class SystemdNotifyPlugin(SimplePlugin):
    """
    A plugin to notify systemd of the process' state when it's starting up and
    shutting down.

    This allows systemd to wait before starting dependent processes until all
    Kolibri process plugins have started successfully. In particular, zeroconf
    registration can take a few seconds.

    You must check to see if systemd is supported before instantiating this
    plugin, by calling ```SystemdNotifyPlugin.is_supported()```.
    """

    def __init__(self, bus):
        self.bus = bus

        if not self.is_supported():
            raise RuntimeError(
                "Attempted to use SystemdNotifyPlugin when NOTIFY_SOCKET environment variable is not set"
            )

        self.notify_socket_path = os.environ["NOTIFY_SOCKET"]

        self.bus.subscribe("RUN", self.send_ready, priority=999)
        self.bus.subscribe("STOP", self.send_stopping, priority=1)
        self.bus.subscribe("EXIT", self.send_stopping, priority=1)

    @classmethod
    def is_supported(cls):
        return os.environ.get("NOTIFY_SOCKET", "") != ""

    def sd_notify(self, state):
        """
        Sends a state notification to systemd

        See man page sd_notify(3)

        :param: state: new service state
        """
        try:
            with socket.socket(socket.AF_UNIX, socket.SOCK_DGRAM) as s:
                logger.info("Sending sd-notify state {}".format(state))
                s.connect(self.notify_socket_path)
                s.send(state.encode())
        except OSError as e:
            logger.warning("Failed to send sd-notify state {}: {}".format(state, e))

    def send_ready(self):
        self.sd_notify("READY=1")

    def send_stopping(self):
        self.sd_notify("STOPPING=1")


def _port_check(port):
    # In case that something other than Kolibri occupies the port,
    # check the port's availability.
    # Bypass check when socket activation is used
    # https://manpages.debian.org/testing/libsystemd-dev/sd_listen_fds.3.en.html#ENVIRONMENT
    # Also bypass when the port is 0, as that will choose a port
    if (
        not os.environ.get("LISTEN_PID", None)
        and port
        and not port_is_available_on_host(
            conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"], int(port)
        )
    ):
        # Port is occupied
        logger.error(
            "Port {} is occupied.\n"
            "Please check that you do not have other processes "
            "running on this port and try again.\n".format(port)
        )
        raise PortOccupied("Port {} is occupied.".format(port))


class DaemonizePlugin(SimplePlugin):
    def __init__(self, bus, check_ports):
        self.check_ports = check_ports
        super(DaemonizePlugin, self).__init__(bus)

    def ENTER(self):
        self.bus.publish("log", "Running Kolibri as background process", 20)
        if self.check_ports:
            _port_check(self.bus.port)
            _port_check(self.bus.zip_port)
            if self.bus.port:
                __, urls = get_urls(listen_port=self.bus.port)
                for url in urls:
                    logger.info("Kolibri running on: {}".format(url))
            else:
                logger.info(
                    "No port specified, for information about accessing the server, run kolibri status"
                )
        # Daemonize at this point, no more user output is needed

        kolibri_log = settings.LOGGING["handlers"]["file"]["filename"]
        self.bus.publish(
            "log", "Going to background mode, logging to {0}".format(kolibri_log), 20
        )

        kwargs = {}
        # Truncate the file
        if os.path.isfile(DAEMON_LOG):
            open(DAEMON_LOG, "w").truncate()
        kwargs["out_log"] = DAEMON_LOG
        kwargs["err_log"] = DAEMON_LOG

        become_daemon(**kwargs)

    # Set this to priority 0 so that it gets executed before any other ENTER handlers.
    ENTER.priority = 0


class LogPlugin(SimplePlugin):
    def log(self, msg, level):
        logger.log(level, msg)


class SignalHandler(BaseSignalHandler):
    def __init__(self, bus):
        super(SignalHandler, self).__init__(bus)
        self.process_pid = None

        self.handlers.update(
            {
                "SIGINT": self.handle_SIGINT,
                "CTRL_C_EVENT": self.handle_SIGINT,
                "CTRL_BREAK_EVENT": self.handle_SIGINT,
            }
        )

    def _handle_signal(self, signum=None, frame=None):
        if self.process_pid is None:
            return super(SignalHandler, self)._handle_signal(signum, frame)
        if os.getpid() == self.process_pid:
            return super(SignalHandler, self)._handle_signal(signum, frame)

    def subscribe(self):
        super(SignalHandler, self).subscribe()
        self.bus.subscribe("ENTER", self.ENTER)

    def ENTER(self):
        self.process_pid = os.getpid()

    def handle_SIGINT(self):
        """Transition to the EXITED state."""
        self.bus.log("Keyboard interrupt caught. Exiting.")
        self.bus.transition("EXITED")


class ProcessControlPlugin(Monitor):
    def __init__(self, bus):
        self.mtime = self.get_mtime()
        Monitor.__init__(self, bus, self.run, 1)

    def get_mtime(self):
        try:
            return os.stat(PROCESS_CONTROL_FLAG).st_mtime
        except OSError:
            return 0

    def run(self):
        mtime = self.get_mtime()
        if mtime > self.mtime:
            # The file has been deleted or modified.
            with open(PROCESS_CONTROL_FLAG, "r") as f:
                try:
                    command = f.read().strip()
                except (IOError, OSError):
                    # If the file does not exist, or there is
                    # an error when reading the file, we just carry on.
                    command = ""
            if command == RESTART:
                self.bus.log("Restarting server.")
                self.thread.cancel()
                if installation_types.WINDOWS in installation_type().lower():
                    # On Windows, we need to restart the server with the same executable
                    # magicbus gets messed up trying to find a python script to run
                    sys.executable = sys.argv[0]
                    sys.argv = sys.argv[1:]
                self.bus.restart()
            elif command == STOP:
                self.bus.log("Stopping server.")
                self.thread.cancel()
                self.bus.transition("EXITED")
            elif command == UPDATE_ZEROCONF:
                self.bus.publish("UPDATE_ZEROCONF")
                # since publish doesn't modify the bus state like `transition` does, we would keep
                # triggering this if we didn't set modified time, so setting it means we'll wait
                # for a new change
                self.mtime = mtime
            else:
                self.mtime = mtime


class ThreadWait(SimplePlugin):
    """
    Vendored from magicbus for Python 3.9 compatibility.
    The current released version of magicbus is still using isAlive
    instead of is_alive which is no longer used in Python 3.9.
    """

    def EXIT(self):
        # Waiting for ALL child threads to finish is necessary on OS X.
        # See http://www.cherrypy.org/ticket/581.
        # It's also good to let them all shut down before allowing
        # the main thread to call atexit handlers.
        # See http://www.cherrypy.org/ticket/751.
        self.bus.log("Waiting for child threads to terminate...")
        for t in threading.enumerate():
            if t == threading.current_thread() or not t.is_alive():
                continue

            # Note that any dummy (external) threads are always daemonic.
            if t.daemon or isinstance(t, threading._MainThread):
                continue

            self.bus.log("Waiting for thread %s." % t.getName())
            t.join()

    EXIT.priority = 100


def wait_for_status(target, timeout=10):
    starttime = time.time()
    while time.time() - starttime <= timeout:
        _, _, _, status = _read_pid_file(PID_FILE)
        if status != target:
            time.sleep(0.1)
        else:
            return True
    return False


# The SIGKILL signal does not exist on windows
# We use CTRL_C_EVENT instead, as it is intended
# to be passed to the os.kill command.
if sys.platform == "win32":
    SIGKILL = signal.CTRL_C_EVENT
else:
    SIGKILL = signal.SIGKILL


def stop():
    """
    Stops the kolibri server
    :raises: NotRunning
    """
    pid, __, __, status = _read_pid_file(PID_FILE)

    if not pid:
        return status

    with open(PROCESS_CONTROL_FLAG, "w") as f:
        f.write(STOP)
    wait_for_status(STATUS_STOPPED, timeout=10)
    if pid_exists(pid):
        logger.debug("Process wth pid %s still exists; attempting a SIGKILL." % pid)
        try:
            os.kill(pid, SIGKILL)
        except SystemError as e:
            logger.debug(
                "Received an error while trying to kill the Kolibri process: %s" % e
            )
    starttime = time.time()
    while time.time() - starttime <= 10:
        if pid_exists(pid):
            time.sleep(0.1)
        else:
            break
    if pid_exists(pid):
        logging.error("Kolibri process has failed to shutdown")
        return STATUS_UNCLEAN_SHUTDOWN
    return STATUS_STOPPED


class BaseKolibriProcessBus(ProcessBus):
    def __init__(
        self,
        port=0,
        zip_port=0,
        pid_file=PID_FILE,
    ):
        self.pid_file = pid_file
        self.port = int(port)
        self.zip_port = int(zip_port)

        super(BaseKolibriProcessBus, self).__init__()
        # This can be removed when a new version of magicbus is released that
        # includes their fix for Python 3.9 compatibility.
        self.thread_wait.unsubscribe()
        self.thread_wait = ThreadWait(self)
        self.thread_wait.subscribe()
        # Setup plugin for handling PID file cleanup
        # Do this first to obtain a PID file lock as soon as
        # possible and reduce the risk of competing servers
        pid_plugin = PIDPlugin(self)
        pid_plugin.subscribe()

        if SystemdNotifyPlugin.is_supported():
            systemd_plugin = SystemdNotifyPlugin(self)
            systemd_plugin.subscribe()

        logger.info("Starting Kolibri {version}".format(version=kolibri.__version__))

        log_plugin = LogPlugin(self)
        log_plugin.subscribe()

        signal_handler = SignalHandler(self)

        signal_handler.subscribe()

        if getattr(settings, "DEVELOPER_MODE", False):
            autoreloader = Autoreloader(self)
            plugins = os.path.join(conf.KOLIBRI_HOME, "plugins.json")
            options = os.path.join(conf.KOLIBRI_HOME, "options.ini")
            autoreloader.files.add(plugins)
            autoreloader.files.add(options)
            autoreloader.subscribe()

        reload_plugin = ProcessControlPlugin(self)
        reload_plugin.subscribe()

        default_scheduled_tasks_plugin = DefaultScheduledTasksPlugin(self)
        default_scheduled_tasks_plugin.subscribe()

    def run(self):
        self.graceful()
        self.block()


class KolibriServicesProcessBus(BaseKolibriProcessBus):
    def __init__(self, *args, **kwargs):
        super(KolibriServicesProcessBus, self).__init__(*args, **kwargs)

        # Setup plugin for services
        service_plugin = ServicesPlugin(self)
        service_plugin.subscribe()

        if conf.OPTIONS["Deployment"]["ZEROCONF_ENABLED"]:
            # Setup zeroconf plugin
            zeroconf_plugin = ZeroConfPlugin(self, self.port)
            zeroconf_plugin.subscribe()

    def run(self):
        self.graceful()
        self.publish("SERVING", self.port)

        self.block()


class KolibriProcessBus(KolibriServicesProcessBus):
    """
    This class is the state machine that manages the starting, restarting, and shutdown of
    a running Kolibri instance. It is responsible for starting any WSGI servers that respond
    to HTTP requests in the Kolibri lifecycle, and also other ancillary services like
    a ZeroConf server, task runner work pool, etc.

    The primary use case for this process bus is for running Kolibri in a consumer server or
    application context - although it can still be used to run the background services in
    other contexts. One possible example for the extensibility of this class is if it is used
    in conjunction with uwsgi, the 'restart' method of this class can be updated in a subclass
    to run the specific `uwsgi.restart()` function that would otherwise not get invoked.
    """

    def __init__(self, *args, **kwargs):
        super(KolibriProcessBus, self).__init__(*args, **kwargs)

        kolibri_server = KolibriServerPlugin(
            self,
            self.port,
        )

        alt_port_server = ZipContentServerPlugin(
            self,
            self.zip_port,
        )
        # Subscribe these servers
        kolibri_server.subscribe()
        alt_port_server.subscribe()

    def run(self):
        self.graceful()
        self.block()


def start(port=0, zip_port=0, serve_http=True, background=False):
    """
    Starts the server.

    :param: port: Port number (default: 0) - assigned by free port
    """
    if serve_http:
        bus = KolibriProcessBus(
            port=port,
            zip_port=zip_port,
        )
    else:
        bus = KolibriServicesProcessBus(
            port=port,
            zip_port=zip_port,
        )

    # On Mac, Python crashes when forking the process, so prevent daemonization until we can figure out
    # a better fix. See https://github.com/learningequality/kolibri/issues/4821
    if background and sys.platform != "darwin":
        daemonize_plugin = DaemonizePlugin(bus, serve_http)
        daemonize_plugin.subscribe()

    bus.run()


def signal_restart():
    try:
        with open(PROCESS_CONTROL_FLAG, "w") as f:
            f.write(RESTART)
    except (IOError, OSError):
        return False
    return True


def restart():
    """
    Restarts the server.
    """
    if not conf.OPTIONS["Deployment"]["RESTART_HOOKS"]:
        logging.warning("No registered RESTART_HOOKS, restarting is not possible")
        return False
    result = True
    for hook in conf.OPTIONS["Deployment"]["RESTART_HOOKS"]:
        try:
            result = result and hook()
        except Exception as e:
            logging.warning("Error running restart hook %s: %s" % (hook, e))
            result = False
    return result


def restart_and_wait():
    if not restart():
        return False
    if not wait_for_status(STATUS_STOPPED):
        return False
    return wait_for_status(STATUS_RUNNING)


def update_zeroconf_broadcast():
    """
    Updates the instance registered on the Zeroconf network
    """
    with open(PROCESS_CONTROL_FLAG, "w") as f:
        f.write(UPDATE_ZEROCONF)


def _read_pid_file(filename):
    """
    Reads a pid file and returns the contents. PID files have 1 or 2 lines;
     - first line is always the pid
     - second line is the port the server is listening on.
     - third line is the port the alternate origin server is listening on
     - fourth line is the status of the server process

    :param filename: Path of PID to read
    :return: (pid, port, zip_port, status): with the PID in the file, the port numbers
                          if they exist. If the port number doesn't exist, then
                          port is None. Lastly, the status code is returned.
    """
    if not os.path.isfile(filename):
        return None, None, None, STATUS_STOPPED

    try:
        with open(filename, "r") as f:
            pid_file_lines = f.readlines()
        pid, port, zip_port, status = pid_file_lines
        pid = int(pid.strip())
        port = int(port.strip()) if port.strip() else None
        zip_port = int(zip_port.strip()) if zip_port.strip() else None
        status = int(status.strip())
        return pid, port, zip_port, status
    except (TypeError, ValueError, IOError, OSError):
        pass
    return None, None, None, STATUS_PID_FILE_INVALID


def get_status_from_pid_file():
    """
    Returns the status of the server process from the PID file.
    """
    _, _, _, status = _read_pid_file(PID_FILE)
    return status


def get_zip_port():
    _, _, zip_port, _ = _read_pid_file(PID_FILE)
    return zip_port


def get_status():  # noqa: max-complexity=16
    """
    Tries to get the PID of a running server.

    The behavior is also quite redundant given that `kolibri start` should
    always create a PID file, and if its been started directly with the
    runserver command, then its up to the developer to know what's happening.

    :returns: (PID, address, port), where address is not currently detected in
        a valid way because it's not configurable, and we might be
        listening on several IPs.
    :raises: NotRunning
    """
    # PID file exists and startup has finished, check if it is running
    pid, port, _, status = _read_pid_file(PID_FILE)

    if status not in IS_RUNNING:
        raise NotRunning(status)

    if status == STATUS_STARTING_UP:
        try:
            wait_for_occupied_port(conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"], port)
        except OSError:
            raise NotRunning(STATUS_FAILED_TO_START)

    if status == STATUS_SHUTTING_DOWN:
        try:
            wait_for_free_port(conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"], port)
        except OSError:
            raise NotRunning(STATUS_UNCLEAN_SHUTDOWN)
        raise NotRunning(STATUS_STOPPED)

    # PID file exists, but process is dead
    if pid is None or not pid_exists(pid):
        raise NotRunning(STATUS_UNCLEAN_SHUTDOWN)  # Unclean shutdown

    listen_port = port

    prefix = (
        conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"]
        if conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"] == "/"
        else "/" + conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"]
    )

    check_url = "http://{}:{}{}status/".format("127.0.0.1", listen_port, prefix)

    if conf.OPTIONS["Server"]["CHERRYPY_START"]:

        try:
            # Timeout is 3 seconds, we don't want the status command to be slow
            # TODO: Using 127.0.0.1 is a hardcode default from Kolibri, it could
            # be configurable
            # TODO: HTTP might not be the protocol if server has SSL
            response = requests.get(check_url, timeout=3)
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
            raise NotRunning(STATUS_NOT_RESPONDING)
        except (requests.exceptions.RequestException):
            raise NotRunning(STATUS_UNCLEAN_SHUTDOWN)

        if response.status_code == 404:
            raise NotRunning(STATUS_UNKNOWN_INSTANCE)  # Unknown HTTP server

        if response.status_code != 200:
            # Probably a mis-configured kolibri
            sys.stderr.write("---Debug information---\n")
            sys.stderr.write(response.text)
            sys.stderr.write("\n-----------------------\n")
            raise NotRunning(STATUS_SERVER_CONFIGURATION_ERROR)

    else:
        try:
            requests.get(check_url, timeout=3)
        except (requests.exceptions.ReadTimeout, requests.exceptions.ConnectionError):
            raise NotRunning(STATUS_NOT_RESPONDING)
        except (requests.exceptions.RequestException):
            return pid, "", ""

    return (
        pid,
        conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"],
        listen_port,
    )  # Correct PID !
    # We don't detect this at present:
    # Could be detected because we fetch the PID directly via HTTP, but this
    # is dumb because kolibri could be running in a worker pool with different
    # PID from the PID file..
    # raise NotRunning(STATUS_UNKNOWN_INSTANCE)
    # This would be the fallback when we know it's not running, but we can't
    # give a proper reason...
    # raise NotRunning(STATUS_UNKNOW)


def _get_local_ips():
    """
    Don't rely on the zeroconf get_all_addresses here as it's possible that it could have been modified to only detect
    interfaces that support multicasting. This is a fallback to get all the local IP addresses of the machine, whether they
    are multicast or not.

    However, we still exclude known dummy Windows 169.254.*.* addresses as these are not useful for the user to see.
    :return: a list of IP addresses
    """
    return list(
        set(
            addr.ip
            for iface in ifaddr.get_adapters()
            for addr in iface.ips
            if addr.is_IPv4 and not addr.ip.startswith("169.254")
        )
    )


def get_urls(listen_port=None):
    """
    :param listen_port: if set, will not try to determine the listen port from
                        other running instances.
    """
    try:
        if listen_port:
            port = listen_port
        else:
            __, __, port = get_status()
        urls = []
        if port:
            try:
                all_addresses = (
                    _get_local_ips()
                    if conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"] == "0.0.0.0"
                    else [conf.OPTIONS["Deployment"]["LISTEN_ADDRESS"]]
                )
                for ip in all_addresses:
                    urls.append("http://{}:{}/".format(ip, port))
            except RuntimeError:
                logger.error("Error retrieving network interface list!")
        return STATUS_RUNNING, urls
    except NotRunning as e:
        return e.status_code, []


def get_installer_version(installer_type):  # noqa: C901
    def get_debian_pkg_version(package):
        """
        In case we want to distinguish between dpkg and apt installations
        we can use apt-cache show madison and compare versions with dpkg
        if dpkg > madison, it's dpkg otherwise it's apt
        """
        try:
            output = check_output(["dpkg", "-s", package])
            if hasattr(output, "decode"):  # needed in python 2.x
                output = output.decode("utf-8")
            package_info = output.split("\n")
            version_info = [line for line in package_info if "Version" in line]
            if version_info:
                version = version_info[0].split(":")[1].strip()
                return version
        except CalledProcessError:  # package not installed!
            pass  # will return None
        return None

    def get_deb_kolibriserver_version():
        return get_debian_pkg_version("kolibri-server")

    def get_deb_version():
        return get_debian_pkg_version("kolibri")

    def get_apk_version():
        return os.environ.get("KOLIBRI_APK_VERSION_NAME")

    installer_version = os.environ.get("KOLIBRI_INSTALLER_VERSION")
    if installer_version:
        return installer_version

    version_funcs = {
        installation_types.DEB: get_deb_version,
        installation_types.KOLIBRI_SERVER: get_deb_kolibriserver_version,
        installation_types.APK: get_apk_version,
    }

    if installer_type in version_funcs:
        return version_funcs[installer_type]()
    else:
        return None


def installation_type(cmd_line=None):  # noqa:C901
    """
    Tries to guess how the running kolibri server was installed

    :returns: install_type is the type of detected installation
    """

    install_type = os.environ.get("KOLIBRI_INSTALLATION_TYPE", "Unknown")

    if cmd_line is None:
        cmd_line = sys.argv

    def is_debian_package():
        # find out if this is from the debian package
        install_type = installation_types.DEB
        try:
            check_output(["dpkg", "-s", "kolibri"])
        except (
            CalledProcessError,
            FileNotFoundError,
        ):  # kolibri package not installed!
            if sys.path[-1] != "/usr/lib/python3/dist-packages":
                install_type = installation_types.WHL
        return install_type

    def is_kolibri_server():
        # running under uwsgi, finding out if we are using kolibri-server
        install_type = "Unknown"
        try:
            check_output(["dpkg", "-s", "kolibri-server"])
            install_type = installation_types.KOLIBRI_SERVER
        except CalledProcessError:  # kolibri-server package not installed!
            install_type = installation_types.WHL
        return install_type

    # in case the KOLIBRI_INSTALLATION_TYPE is not set, let's use the old method:
    if install_type == "Unknown":
        if on_android():
            install_type = installation_types.APK
        elif os.environ.get("KOLIBRI_DEVELOPER_MODE", False):
            install_type = "devserver"
        elif len(cmd_line) > 1 or "uwsgi" in cmd_line:
            launcher = cmd_line[0]
            if launcher.endswith(".pex"):
                install_type = installation_types.PEX
            elif launcher == "/usr/bin/kolibri":
                install_type = is_debian_package()
            elif launcher == "uwsgi":
                package = is_debian_package()
                if package != "whl":
                    install_type = is_kolibri_server()
            elif "\\Scripts\\kolibri" in launcher:
                paths = sys.path
                for path in paths:
                    if "kolibri.exe" in path:
                        install_type = installation_types.WINDOWS
                        break
            elif "start" in cmd_line:
                install_type = installation_types.WHL

    if install_type in installation_types.install_type_map:
        version = get_installer_version(install_type)
        if version:
            return installation_types.install_type_map[install_type].format(version)
        else:
            return installation_types.install_type_map[install_type].split(" - ")[0]

    return install_type
