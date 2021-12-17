import logging
import os
import signal
import sys
import threading
import time
import traceback as _traceback
from functools import partial
from subprocess import CalledProcessError
from subprocess import check_output

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

# File used to store previously available ports
PORT_CACHE = os.path.join(conf.KOLIBRI_HOME, "port_cache")

# File used to send a state transition command to the server process
PROCESS_CONTROL_FLAG = os.path.join(conf.KOLIBRI_HOME, "process_control.flag")

# This is a special file with daemon activity. It logs ALL stderr output, some
# might not have made it to the log file!
DAEMON_LOG = os.path.join(conf.LOG_ROOT, "daemon.txt")

# Currently non-configurable until we know how to properly handle this
LISTEN_ADDRESS = "0.0.0.0"

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


class PortCache:
    def __init__(self):
        self.values = {}
        self.occupied_ports = set()
        self.load()

    def lock_port(self, port):
        if port:
            self.occupied_ports.add(port)

    def register_port(self, port):
        self.values[port] = True
        self.save()

    def get_port(self, host):
        if self.values:
            try:
                port = next(
                    p
                    for p in self.values
                    if not self.values[p] and p not in self.occupied_ports
                )
                if port:
                    if port_is_available_on_host(host, port):
                        self.values[port] = True
                        return port
            except StopIteration:
                pass
        return None

    def save(self):
        with open(PORT_CACHE, "w") as f:
            f.write("\n".join(str(p) for p in self.values))

    def load(self):
        try:
            with open(PORT_CACHE, "r") as f:
                for port in f.readlines():
                    self.values[int(port)] = False
        except IOError:
            pass


port_cache = PortCache()


class ServerPlugin(BaseServerPlugin):
    def subscribe(self):
        super(ServerPlugin, self).subscribe()
        self.bus.subscribe("ENTER", self.ENTER)

    def unsubscribe(self):
        super(ServerPlugin, self).unsubscribe()
        self.bus.unsubscribe("ENTER", self.ENTER)

    def ENTER(self):
        host, bind_port = self.bind_addr
        if bind_port == 0:
            port = port_cache.get_port(host)
            if port:
                self.bind_addr = (host, port)
                self.httpserver.bind_addr = (host, port)

    def START(self):
        super(ServerPlugin, self).START()
        _, port = self.httpserver.bind_addr
        port_cache.register_port(port)

    @property
    def interface(self):
        if self.httpserver.bind_addr is None:
            return "unknown interface (dynamic?)"
        if isinstance(self.httpserver.bind_addr, tuple):
            host, port = self.httpserver.bind_addr
            return "%s:%s" % (host, port)
        return "socket file: %s" % self.httpserver.bind_addr


class KolibriServerPlugin(ServerPlugin):
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
    def START(self):
        super(ZipContentServerPlugin, self).START()
        _, bind_port = self.httpserver.bind_addr
        self.bus.publish("ZIP_SERVING", bind_port)

    START.priority = 75


class ServicesPlugin(SimplePlugin):
    def __init__(self, bus):
        self.bus = bus
        self.workers = None

    def START(self):
        from kolibri.core.tasks.main import initialize_workers
        from kolibri.core.tasks.main import scheduler
        from kolibri.core.analytics.utils import DEFAULT_PING_JOB_ID
        from kolibri.core.deviceadmin.utils import SCH_VACUUM_JOB_ID

        # schedule the pingback job if not already scheduled
        if DEFAULT_PING_JOB_ID not in scheduler:
            from kolibri.core.analytics.utils import schedule_ping

            schedule_ping()

        # schedule the vacuum job if not already scheduled
        if SCH_VACUUM_JOB_ID not in scheduler:
            from kolibri.core.deviceadmin.utils import schedule_vacuum

            schedule_vacuum()

        # Initialize the iceqube engine to handle queued tasks
        self.workers = initialize_workers()

        # Initialize the iceqube scheduler to handle scheduled tasks
        scheduler.start_scheduler()

    def STOP(self):
        from kolibri.core.tasks.main import scheduler

        scheduler.shutdown_scheduler()

        if self.workers is not None:
            for worker in self.workers:
                worker.shutdown(wait=True)


class ZeroConfPlugin(Monitor):
    def __init__(self, bus, port):
        self.port = port
        Monitor.__init__(self, bus, self.run, frequency=5)
        self.bus.subscribe("SERVING", self.SERVING)
        self.bus.subscribe("UPDATE_ZEROCONF", self.UPDATE_ZEROCONF)
        self.broadcast = None

    def SERVING(self, port):
        # Register the Kolibri zeroconf service so it will be discoverable on the network
        from kolibri.core.discovery.utils.network.broadcast import (
            build_broadcast_instance,
            KolibriBroadcast,
        )
        from kolibri.core.discovery.utils.network.search import (
            DynamicNetworkLocationListener,
            SoUDClientListener,
            SoUDServerListener,
        )

        self.port = port or self.port
        instance = build_broadcast_instance(port)

        if self.broadcast is None:
            self.broadcast = KolibriBroadcast(instance)
            self.broadcast.add_listener(DynamicNetworkLocationListener)
            self.broadcast.add_listener(SoUDClientListener)
            self.broadcast.add_listener(SoUDServerListener)
            self.broadcast.start_broadcast()
        else:
            self.broadcast.update_broadcast(instance=instance)

    def UPDATE_ZEROCONF(self):
        self.SERVING(self.port)

    def STOP(self):
        super(ZeroConfPlugin, self).STOP()

        if self.broadcast is not None:
            self.broadcast.stop_broadcast()
            self.broadcast = None

    def run(self):
        # If set of addresses that were present at the last time zeroconf updated its broadcast list
        # don't match the current set of all addresses for this device, then we should reinitialize
        # zeroconf, the listener, and the broadcast kolibri service.
        current_addresses = set(get_all_addresses())
        if (
            self.broadcast is not None
            and self.broadcast.is_broadcasting
            and self.broadcast.addresses != current_addresses
        ):
            logger.info(
                "List of local addresses has changed since zeroconf was last initialized, updating now"
            )
            self.broadcast.update_broadcast(interfaces=InterfaceChoice.All)


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
        self.set_pid_file(STATUS_RUNNING)

    def EXIT(self):
        try:
            os.unlink(self.bus.pid_file)
        except OSError:
            pass


class DaemonizePlugin(SimplePlugin):
    def ENTER(self):
        self.bus.publish("log", "Running Kolibri as background process", 20)
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


class KolibriProcessBus(ProcessBus):
    """
    This class is the state machine that manages the starting, restarting, and shutdown of
    a running Kolibri instance. It is responsible for starting any WSGI servers that respond
    to HTTP requests in the Kolibri lifecycle, and also other ancillary services like
    a ZeroConf server, task runner work pool, scheduler, etc.

    The primary use case for this process bus is for running Kolibri in a consumer server or
    application context - although it can still be used to run the background services in
    other contexts. One possible example for the extensibility of this class is if it is used
    in conjunction with uwsgi, the 'restart' method of this class can be updated in a subclass
    to run the specific `uwsgi.restart()` function that would otherwise not get invoked.
    """

    def __init__(
        self,
        port=0,
        zip_port=0,
        serve_http=True,
        background=False,
        pid_file=PID_FILE,
        listen_address=LISTEN_ADDRESS,
    ):
        self.listen_address = listen_address
        self.pid_file = pid_file
        self.background = background
        self.serve_http = serve_http
        self.port = int(port)
        port_cache.lock_port(self.port)
        self.zip_port = int(zip_port)
        port_cache.lock_port(self.zip_port)
        # On Mac, Python crashes when forking the process, so prevent daemonization until we can figure out
        # a better fix. See https://github.com/learningequality/kolibri/issues/4821
        if sys.platform == "darwin":
            self.background = False

        if (
            self._kolibri_appears_to_be_running()
            and self._kolibri_main_port_is_occupied()
        ):
            logger.error(
                "There is another Kolibri server running. "
                "Please use `kolibri stop` and try again."
            )
            sys.exit(1)

        super(KolibriProcessBus, self).__init__()
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

        self.background_port_check()

        logger.info("Starting Kolibri {version}".format(version=kolibri.__version__))

        if self.background:
            daemonize_plugin = DaemonizePlugin(self)
            daemonize_plugin.subscribe()

        log_plugin = LogPlugin(self)
        log_plugin.subscribe()

        self.configure_http_server()

        # Setup plugin for services
        service_plugin = ServicesPlugin(self)
        service_plugin.subscribe()

        # Setup zeroconf plugin
        zeroconf_plugin = ZeroConfPlugin(self, port)
        zeroconf_plugin.subscribe()

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

    def _kolibri_appears_to_be_running(self):
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        pid, _, _, status = _read_pid_file(self.pid_file)
        return status in IS_RUNNING and pid_exists(pid)

    def _kolibri_main_port_is_occupied(self):
        if not self.serve_http:
            return False
        return not port_is_available_on_host(self.listen_address, self.port)

    def _port_check(self, port):
        # In case that something other than Kolibri occupies the port,
        # check the port's availability.
        # Bypass check when socket activation is used
        # https://manpages.debian.org/testing/libsystemd-dev/sd_listen_fds.3.en.html#ENVIRONMENT
        # Also bypass when the port is 0, as that will choose a port
        port = int(port)
        if (
            not os.environ.get("LISTEN_PID", None)
            and port
            and not port_is_available_on_host(self.listen_address, port)
        ):
            # Port is occupied
            logger.error(
                "Port {} is occupied.\n"
                "Please check that you do not have other processes "
                "running on this port and try again.\n".format(port)
            )
            sys.exit(1)

    def background_port_check(self):
        # Do this before daemonization, otherwise just let the server processes handle this
        if self.background and self.serve_http:
            self._port_check(self.port)
            self._port_check(self.zip_port)
            if self.port:
                __, urls = get_urls(listen_port=self.port)
                for url in urls:
                    logger.info("Kolibri running on: {}".format(url))
            else:
                logger.info(
                    "No port specified, for information about accessing the server, run kolibri status"
                )

    def configure_http_server(self):
        if self.serve_http:
            from kolibri.deployment.default.wsgi import application
            from kolibri.deployment.default.alt_wsgi import alt_application

            server_config = {
                "numthreads": conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"],
                "request_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
                "timeout": conf.OPTIONS["Server"]["CHERRYPY_SOCKET_TIMEOUT"],
                "accepted_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
                "accepted_queue_timeout": conf.OPTIONS["Server"][
                    "CHERRYPY_QUEUE_TIMEOUT"
                ],
            }

            kolibri_address = (self.listen_address, self.port)

            kolibri_server = KolibriServerPlugin(
                self,
                httpserver=Server(kolibri_address, application, **server_config),
                bind_addr=kolibri_address,
            )

            alt_port_addr = (
                self.listen_address,
                self.zip_port,
            )

            alt_port_server = ZipContentServerPlugin(
                self,
                httpserver=Server(alt_port_addr, alt_application, **server_config),
                bind_addr=alt_port_addr,
            )
            # Subscribe these servers
            kolibri_server.subscribe()
            alt_port_server.subscribe()

    def run(self):
        self.graceful()
        if not self.serve_http:
            self.publish("SERVING", self.port)

        self.block()


def start(port=0, zip_port=0, serve_http=True, background=False):
    """
    Starts the server.

    :param: port: Port number (default: 0) - assigned by free port
    """

    bus = KolibriProcessBus(
        port=port, zip_port=zip_port, serve_http=serve_http, background=background
    )

    bus.run()


def restart():
    with open(PROCESS_CONTROL_FLAG, "w") as f:
        f.write(RESTART)
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
        pid_file_lines = open(filename, "r").readlines()
        pid, port, zip_port, status = pid_file_lines
        pid = int(pid.strip())
        port = int(port.strip()) if port.strip() else None
        zip_port = int(zip_port.strip()) if zip_port.strip() else None
        status = int(status.strip())
        return pid, port, zip_port, status
    except (TypeError, ValueError, IOError, OSError):
        pass
    return None, None, None, STATUS_PID_FILE_INVALID


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
            wait_for_occupied_port(LISTEN_ADDRESS, port)
        except OSError:
            raise NotRunning(STATUS_FAILED_TO_START)

    if status == STATUS_SHUTTING_DOWN:
        try:
            wait_for_free_port(LISTEN_ADDRESS, port)
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

    return pid, LISTEN_ADDRESS, listen_port  # Correct PID !
    # We don't detect this at present:
    # Could be detected because we fetch the PID directly via HTTP, but this
    # is dumb because kolibri could be running in a worker pool with different
    # PID from the PID file..
    # raise NotRunning(STATUS_UNKNOWN_INSTANCE)
    # This would be the fallback when we know it's not running, but we can't
    # give a proper reason...
    # raise NotRunning(STATUS_UNKNOW)


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
                for ip in get_all_addresses():
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
        elif len(cmd_line) > 1 or "uwsgi" in cmd_line:
            launcher = cmd_line[0]
            if launcher.endswith(".pex"):
                install_type = installation_types.PEX
            elif "runserver" in cmd_line:
                install_type = "devserver"
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
