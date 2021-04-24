import logging
import os
import sys
import traceback as _traceback
from subprocess import CalledProcessError
from subprocess import check_output

import requests
from cheroot.wsgi import Server
from django.conf import settings
from magicbus import ProcessBus
from magicbus.plugins import SimplePlugin
from magicbus.plugins.servers import ServerPlugin
from magicbus.plugins.signalhandler import SignalHandler
from magicbus.plugins.tasks import Autoreloader
from zeroconf import get_all_addresses

import kolibri
from .system import kill_pid
from .system import pid_exists
from kolibri.core.tasks.main import initialize_workers
from kolibri.core.tasks.main import scheduler
from kolibri.utils import conf
from kolibri.utils.android import on_android

try:
    import kolibri.utils.pskolibri as psutil
except NotImplementedError:
    # This module can't work on this OS
    psutil = None

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
STATUS_PID_FILE_READ_ERROR = 99
STATUS_PID_FILE_INVALID = 100
STATUS_UNKNOWN = 101

# Used to store PID and port number (both in foreground and daemon mode)
PID_FILE = os.path.join(conf.KOLIBRI_HOME, "server.pid")

# Used to PID, port during certain exclusive startup process, before we fork
# to daemon mode
STARTUP_LOCK = os.path.join(conf.KOLIBRI_HOME, "server.lock")

# File used to activate profiling middleware and get profiler PID
PROFILE_LOCK = os.path.join(conf.KOLIBRI_HOME, "server_profile.lock")

# This is a special file with daemon activity. It logs ALL stderr output, some
# might not have made it to the log file!
DAEMON_LOG = os.path.join(conf.LOG_ROOT, "daemon.txt")

# Currently non-configurable until we know how to properly handle this
LISTEN_ADDRESS = "0.0.0.0"

# Constant job_id for scheduled jobs that we want to keep track of across server restarts
SCH_PING_JOB_ID = "0"
SCH_VACUUM_JOB_ID = "1"


class NotRunning(Exception):
    """
    Raised when server was expected to run, but didn't. Contains a status
    code explaining why.
    """

    def __init__(self, status_code):
        self.status_code = status_code
        super(NotRunning, self).__init__()


class LoggingServer(Server):
    def error_log(self, msg="", level=20, traceback=False):
        if traceback:
            if traceback is True:
                exc_info = sys.exc_info()
            else:
                exc_info = traceback
            msg += "\n" + "".join(_traceback.format_exception(*exc_info))
        return logger.log(level, msg)


class KolibriServerPlugin(ServerPlugin):
    def START(self):
        super(KolibriServerPlugin, self).START()
        _, bind_port = self.httpserver.bind_addr
        self.bus.publish("SERVING", bind_port)

    START.priority = 75


class ServicesPlugin(SimplePlugin):
    def __init__(self, bus, port):
        self.bus = bus
        self.port = port
        self.workers = None
        self.bus.subscribe("SERVING", self.SERVING)

    def START(self):
        # schedule the pingback job if not already scheduled
        if SCH_PING_JOB_ID not in scheduler:
            from kolibri.core.analytics.utils import schedule_ping

            schedule_ping(job_id=SCH_PING_JOB_ID)

        # schedule the vacuum job if not already scheduled
        if SCH_VACUUM_JOB_ID not in scheduler:
            from kolibri.core.deviceadmin.utils import schedule_vacuum

            schedule_vacuum(job_id=SCH_VACUUM_JOB_ID)

        # Initialize the iceqube engine to handle queued tasks
        self.workers = initialize_workers()

        # Initialize the iceqube scheduler to handle scheduled tasks
        scheduler.start_scheduler()

    def SERVING(self, port):
        # Register the Kolibri zeroconf service so it will be discoverable on the network
        from kolibri.core.discovery.utils.network.search import (
            register_zeroconf_service,
        )

        register_zeroconf_service(port=port or self.port)

    def STOP(self):
        scheduler.shutdown_scheduler()
        if self.workers is not None:
            for worker in self.workers:
                worker.shutdown()
        from kolibri.core.discovery.utils.network.search import (
            unregister_zeroconf_service,
        )

        unregister_zeroconf_service()

        if self.workers is not None:
            for worker in self.workers:
                worker.shutdown(wait=True)


def _rm_pid_file(pid_file):
    try:
        os.unlink(pid_file)
    except OSError:
        pass


class CleanUpPIDPlugin(SimplePlugin):
    def START(self):
        _rm_pid_file(STARTUP_LOCK)

    def EXIT(self):
        _rm_pid_file(PID_FILE)


class LogPlugin(SimplePlugin):
    def log(self, msg, level):
        logger.log(level, msg)


def start(port=8080, serve_http=True):
    """
    Starts the server.

    :param: port: Port number (default: 8080)
    """
    # Write the new PID
    # Note: to prevent a race condition on some setups, this needs to happen first
    _write_pid_file(PID_FILE, port=port)

    logger.info("Starting Kolibri {version}".format(version=kolibri.__version__))

    run_server(port=port, serve_http=serve_http)


def stop(pid=None, force=False):
    """
    Stops the kolibri server, either from PID or through a management command

    :param args: List of options to parse to the django management command
    :raises: NotRunning
    """

    if not force:
        # Kill the Kolibri server
        kill_pid(pid)
    else:
        try:
            pid, __ = _read_pid_file(PID_FILE)
            kill_pid(pid)
        except ValueError:
            logger.error("Could not find PID in .pid file\n")
        except OSError:
            logger.error("Could not read .pid file\n")

    # TODO: Check that server has in fact been killed, otherwise we should
    # raise an error...


def calculate_cache_size():
    """
    Returns the default value for CherryPY memory cache:
    - value between 50MB and 250MB
    """
    MIN_CACHE = 50000000
    MAX_CACHE = 250000000
    if psutil:
        MIN_MEM = 1
        MAX_MEM = 4
        total_memory = psutil.virtual_memory().total / pow(2, 30)  # in Gb
        # if it's in the range, scale thread count linearly with available memory
        if MIN_MEM < total_memory < MAX_MEM:
            return MIN_CACHE + int(
                (MAX_CACHE - MIN_CACHE)
                * float(total_memory - MIN_MEM)
                / (MAX_MEM - MIN_MEM)
            )
        # otherwise return either the min or max amount
        return MAX_CACHE if total_memory >= MAX_MEM else MIN_CACHE
    elif sys.platform.startswith(
        "darwin"
    ):  # Considering MacOS has at least 4 Gb of RAM
        return MAX_CACHE
    return MIN_CACHE


def configure_http_server(port, bus):
    from kolibri.deployment.default.wsgi import application
    from kolibri.deployment.default.alt_wsgi import alt_application

    server_config = {
        "numthreads": conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"],
        "request_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
        "timeout": conf.OPTIONS["Server"]["CHERRYPY_SOCKET_TIMEOUT"],
        "accepted_queue_size": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"],
        "accepted_queue_timeout": conf.OPTIONS["Server"]["CHERRYPY_QUEUE_TIMEOUT"],
    }

    kolibri_address = (LISTEN_ADDRESS, port)

    kolibri_server = KolibriServerPlugin(
        bus,
        httpserver=LoggingServer(kolibri_address, application, **server_config),
        bind_addr=kolibri_address,
    )

    alt_port_addr = (
        LISTEN_ADDRESS,
        conf.OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
    )

    alt_port_server = ServerPlugin(
        bus,
        httpserver=LoggingServer(alt_port_addr, alt_application, **server_config),
        bind_addr=alt_port_addr,
    )
    # Subscribe these servers
    kolibri_server.subscribe()
    alt_port_server.subscribe()


def run_server(port, serve_http=True):
    bus = ProcessBus()

    log_plugin = LogPlugin(bus)
    log_plugin.subscribe()

    if serve_http:
        configure_http_server(port, bus)

    # Setup plugin for services
    service_plugin = ServicesPlugin(bus, port)
    service_plugin.subscribe()

    # Setup plugin for handling PID file cleanup
    pid_plugin = CleanUpPIDPlugin(bus)
    pid_plugin.subscribe()

    process_pid = os.getpid()

    signal_handler = SignalHandler(bus)

    original_handler = signal_handler._handle_signal

    def handler(signum, frame):
        if os.getpid() == process_pid:
            original_handler(signum, frame)

    signal_handler._handle_signal = handler

    signal_handler.handlers.update(
        {
            "SIGINT": signal_handler.handle_SIGTERM,
            "CTRL_C_EVENT": signal_handler.handle_SIGTERM,
            "CTRL_BREAK_EVENT": signal_handler.handle_SIGTERM,
        }
    )

    signal_handler.subscribe()

    if getattr(settings, "DEVELOPER_MODE", False):
        autoreloader = Autoreloader(bus)
        autoreloader.subscribe()

    bus.graceful()
    if not serve_http:
        bus.publish("SERVING", None)

    bus.block()


def _read_pid_file(filename):
    """
    Reads a pid file and returns the contents. PID files have 1 or 2 lines;
     - first line is always the pid
     - optional second line is the port the server is listening on.

    :param filename: Path of PID to read
    :return: (pid, port): with the PID in the file and the port number
                          if it exists. If the port number doesn't exist, then
                          port is None.
    """
    pid_file_lines = open(filename, "r").readlines()

    if len(pid_file_lines) == 2:
        pid, port = pid_file_lines
        pid, port = int(pid), int(port)
    elif len(pid_file_lines) == 1:
        # The file only had one line
        pid, port = int(pid_file_lines[0]), None
    else:
        raise ValueError("PID file must have 1 or two lines")

    return pid, port


def _write_pid_file(filename, port=None):
    """
    Writes a PID file in the format Kolibri parses

    :param: filename: Path of file to write
    :param: port: Listening port number which the server is assigned
    """

    with open(filename, "w") as f:
        f.write("%d\n" % os.getpid())
        if port is not None:
            f.write("%d" % port)


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

    # Check if the system is still starting (clear sessions and vacuum not finished yet):
    if os.path.isfile(STARTUP_LOCK):
        try:
            pid, port = _read_pid_file(STARTUP_LOCK)
            # Does the PID in there still exist?
            if pid_exists(pid):
                raise NotRunning(STATUS_STARTING_UP)
            # It's dead so assuming the startup went badly
            else:
                raise NotRunning(STATUS_FAILED_TO_START)
        # Couldn't parse to int or empty PID file
        except (TypeError, ValueError):
            raise NotRunning(STATUS_STOPPED)

    if not os.path.isfile(PID_FILE):
        # There is no PID file (created by server daemon)
        raise NotRunning(STATUS_STOPPED)  # Stopped

    # PID file exists and startup has finished, check if it is running
    try:
        pid, port = _read_pid_file(PID_FILE)
    except (ValueError, OSError):
        raise NotRunning(STATUS_PID_FILE_INVALID)  # Invalid PID file

    # PID file exists, but process is dead
    if pid is None or not pid_exists(pid):
        if os.path.isfile(STARTUP_LOCK):
            raise NotRunning(STATUS_FAILED_TO_START)  # Failed to start
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
            if os.path.isfile(STARTUP_LOCK):
                raise NotRunning(STATUS_STARTING_UP)  # Starting up
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


def installation_type(cmd_line=None):  # noqa:C901
    """
    Tries to guess how the running kolibri server was installed

    :returns: install_type is the type of detected installation
    """
    if cmd_line is None:
        cmd_line = sys.argv
    install_type = "Unknown"

    def is_debian_package():
        # find out if this is from the debian package
        install_type = "dpkg"
        try:
            check_output(["apt-cache", "show", "kolibri"])
            apt_repo = str(check_output(["apt-cache", "madison", "kolibri"]))
            if len(apt_repo) > 4:  # repo will have at least http
                install_type = "apt"
        except (
            CalledProcessError,
            FileNotFoundError,
        ):  # kolibri package not installed!
            if sys.path[-1] != "/usr/lib/python3/dist-packages":
                install_type = "whl"
        return install_type

    def is_kolibri_server():
        # running under uwsgi, finding out if we are using kolibri-server
        install_type = ""
        try:
            package_info = (
                check_output(["apt-cache", "show", "kolibri-server"])
                .decode("utf-8")
                .split("\n")
            )
            version = [output for output in package_info if "Version" in output]
            install_type = "kolibri-server {}".format(version[0])
        except CalledProcessError:  # kolibri-server package not installed!
            install_type = "uwsgi"
        return install_type

    if len(cmd_line) > 1 or "uwsgi" in cmd_line:
        launcher = cmd_line[0]
        if launcher.endswith(".pex"):
            install_type = "pex"
        elif "runserver" in cmd_line:
            install_type = "devserver"
        elif launcher == "/usr/bin/kolibri":
            install_type = is_debian_package()
        elif launcher == "uwsgi":
            package = is_debian_package()
            if package != "whl":
                kolibri_server = is_kolibri_server()
                install_type = "kolibri({kolibri_type}) with {kolibri_server}".format(
                    kolibri_type=package, kolibri_server=kolibri_server
                )
        elif "\\Scripts\\kolibri" in launcher:
            paths = sys.path
            for path in paths:
                if "kolibri.exe" in path:
                    install_type = "Windows"
                    break
        elif "start" in cmd_line:
            install_type = "whl"
    if on_android():

        version_name = os.environ.get("KOLIBRI_APK_VERSION_NAME")

        if version_name:
            install_type = "apk - {}".format(version_name)
        else:
            install_type = "apk"

    return install_type
