import atexit
import logging
import os
import sys
import threading
import time
from subprocess import CalledProcessError
from subprocess import check_output

import cherrypy
import ifcfg
import requests
from django.conf import settings
from django.core.management import call_command

from .system import kill_pid
from .system import pid_exists
from kolibri.core.content.utils import paths
from kolibri.utils import conf
from kolibri.utils.android import on_android

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
DAEMON_LOG = os.path.join(conf.KOLIBRI_HOME, "server.log")

# Currently non-configurable until we know how to properly handle this
LISTEN_ADDRESS = "0.0.0.0"

# use locks so vacuum doesn't conflict with ping
vacuum_db_lock = threading.Lock()


class NotRunning(Exception):
    """
    Raised when server was expected to run, but didn't. Contains a status
    code explaining why.
    """

    def __init__(self, status_code):
        self.status_code = status_code
        super(NotRunning, self).__init__()


def start(port=8080, run_cherrypy=True):
    """
    Starts the server.

    :param: port: Port number (default: 8080)
    """

    # start the pingback thread
    PingbackThread.start_command()

    # Do a db vacuum periodically
    VacuumThread.start_command()

    # Write the new PID
    with open(PID_FILE, 'w') as f:
        f.write("%d\n%d" % (os.getpid(), port))

    # This should be run every time the server is started for now.
    # Events to trigger it are hard, because of copying a content folder into
    # ~/.kolibri, or deleting a channel DB on disk
    from kolibri.core.content.utils.annotation import update_channel_metadata
    update_channel_metadata()

    # This is also run every time the server is started to clear all the tasks
    # in the queue
    from kolibri.core.tasks.client import get_client
    get_client().clear(force=True)

    def rm_pid_file():
        os.unlink(PID_FILE)

    atexit.register(rm_pid_file)

    if run_cherrypy:
        run_server(port=port)
    else:
        block()


def block():
    # Modified from:
    # https://github.com/cherrypy/cherrypy/blob/e5de08887ddb960b337e1f335c819c0b2873d850/cherrypy/process/wspbus.py#L326
    unlock_after_vacuum()
    try:
        while True:
            time.sleep(100000)
    except Exception as e:
        logger.error('Block interrupted! %s' % e)
    # Waiting for ALL child threads to finish is necessary on OS X.
    # See https://github.com/cherrypy/cherrypy/issues/581.
    # It's also good to let them all shut down before allowing
    # the main thread to call atexit handlers.
    # See https://github.com/cherrypy/cherrypy/issues/751.
    logger.debug('Waiting for child threads to terminate...')
    for t in threading.enumerate():
        # Validate the we're not trying to join the MainThread
        # that will cause a deadlock and the case exist when
        # implemented as a windows service and in any other case
        # that another thread executes cherrypy.engine.exit()
        if (
                t != threading.currentThread()
                and not isinstance(t, threading._MainThread)
                # Note that any dummy (external) threads are
                # always daemonic.
                and not t.daemon
        ):
            logger.debug('Waiting for thread %s.' % t.getName())
            t.join()


class PingbackThread(threading.Thread):

    @classmethod
    def start_command(cls):
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        call_command("ping")


class VacuumThread(threading.Thread):

    @classmethod
    def start_command(cls):
        thread = cls()
        thread.daemon = True
        thread.start()

    def run(self):
        # Do the vacuum every day at 3am local server time
        call_command("vacuumsqlite", scheduled=True)


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

    # Finally, remove the PID file
    os.unlink(PID_FILE)


def run_server(port):

    # Mount the application
    from kolibri.deployment.default.wsgi import application
    cherrypy.tree.graft(application, "/")

    cherrypy.config.update({
        "environment": "production",
        "tools.expires.on": True,
        "tools.expires.secs": 31536000,
    })

    # Mount static files
    static_files_handler = cherrypy.tools.staticdir.handler(
        section="/",
        dir=settings.STATIC_ROOT)
    cherrypy.tree.mount(static_files_handler, settings.STATIC_URL, config={
        "/": {
            "tools.gzip.on": True,
            "tools.gzip.mime_types": ["text/*", "application/javascript"],
            "tools.caching.on": True,
            "tools.caching.maxobj_size": 2000000,
            "tools.caching.maxsize": 50000000,
        }
    })

    # Mount content files
    content_files_handler = cherrypy.tools.staticdir.handler(
        section="/", dir=paths.get_content_dir_path()
    )

    url_path_prefix = conf.OPTIONS["Deployment"]["URL_PATH_PREFIX"]

    cherrypy.tree.mount(
        content_files_handler,
        "/{}".format(paths.get_content_url(url_path_prefix).lstrip("/")),
        config={"/": {"tools.caching.on": False}},
    )

    # Unsubscribe the default server
    cherrypy.server.unsubscribe()

    # Instantiate a new server object
    server = cherrypy._cpserver.Server()

    # Configure the server
    server.socket_host = LISTEN_ADDRESS
    server.socket_port = port
    server.thread_pool = conf.OPTIONS["Server"]["CHERRYPY_THREAD_POOL"]
    server.socket_timeout = conf.OPTIONS["Server"]["CHERRYPY_SOCKET_TIMEOUT"]
    server.accepted_queue_size = conf.OPTIONS["Server"]["CHERRYPY_QUEUE_SIZE"]
    server.accepted_queue_timeout = conf.OPTIONS["Server"]["CHERRYPY_QUEUE_TIMEOUT"]

    # Subscribe this server
    server.subscribe()

    # Start the server engine (Option 1 *and* 2)
    unlock_after_vacuum()  # don't start the server until vacuum finishes
    cherrypy.engine.start()
    cherrypy.engine.block()


def unlock_after_vacuum():
    while vacuum_db_lock.locked():
        time.sleep(0.5)
    if os.path.exists(STARTUP_LOCK):
        try:
            os.remove(STARTUP_LOCK)
        except OSError:
            pass  # lock file was deleted by other process


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


def _write_pid_file(filename, port):
    """
    Writes a PID file in the format Kolibri parses

    :param: filename: Path of file to write
    :param: port: Listening port number which the server is assigned
    """

    with open(filename, 'w') as f:
        f.write("%d\n%d" % (os.getpid(), port))


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

    check_url = "http://{}:{}".format("127.0.0.1", listen_port)

    if conf.OPTIONS["Server"]["CHERRYPY_START"]:

        try:
            # Timeout is 3 seconds, we don't want the status command to be slow
            # TODO: Using 127.0.0.1 is a hardcode default from Kolibri, it could
            # be configurable
            # TODO: HTTP might not be the protocol if server has SSL
            response = requests.get(check_url, timeout=3)
        except (requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError):
            raise NotRunning(STATUS_NOT_RESPONDING)
        except (requests.exceptions.RequestException):
            if os.path.isfile(STARTUP_LOCK):
                raise NotRunning(STATUS_STARTING_UP)  # Starting up
            raise NotRunning(STATUS_UNCLEAN_SHUTDOWN)

        if response.status_code == 404:
            raise NotRunning(STATUS_UNKNOWN_INSTANCE)  # Unknown HTTP server

        if response.status_code != 200:
            # Probably a mis-configured kolibri
            raise NotRunning(STATUS_SERVER_CONFIGURATION_ERROR)

    else:
        try:
            requests.get(check_url, timeout=3)
        except (requests.exceptions.ReadTimeout,
                requests.exceptions.ConnectionError):
            raise NotRunning(STATUS_NOT_RESPONDING)
        except (requests.exceptions.RequestException):
            return pid, '', ''

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
            interfaces = ifcfg.interfaces()
            for interface in filter(lambda i: i['inet'], interfaces.values()):
                urls.append("http://{}:{}/".format(interface['inet'], port))
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
    install_type = 'Unknown'

    def is_debian_package():
        # find out if this is from the debian package
        install_type = 'dpkg'
        try:
            check_output(['apt-cache', 'show', 'kolibri'])
            apt_repo = str(check_output(['apt-cache', 'madison', 'kolibri']))
            if apt_repo:
                install_type = 'apt'
        except CalledProcessError:  # kolibri package not installed!
            install_type = 'whl'
        return install_type

    def is_kolibri_server():
        # running under uwsgi, finding out if we are using kolibri-server
        install_type = ''
        try:
            package_info = check_output(['apt-cache', 'show', 'kolibri-server']).decode('utf-8').split('\n')
            version = [output for output in package_info if 'Version' in output]
            install_type = 'kolibri-server {}'.format(version[0])
        except CalledProcessError:  # kolibri-server package not installed!
            install_type = 'uwsgi'
        return install_type

    if len(cmd_line) > 1 or 'uwsgi' in cmd_line:
        launcher = cmd_line[0]
        if launcher.endswith('.pex'):
            install_type = 'pex'
        elif 'runserver' in cmd_line:
            install_type = 'devserver'
        elif launcher == '/usr/bin/kolibri':
            install_type = is_debian_package()
        elif launcher == 'uwsgi':
            package = is_debian_package()
            if package != 'whl':
                kolibri_server = is_kolibri_server()
                install_type = 'kolibri({kolibri_type}) with {kolibri_server}'.format(kolibri_type=package,
                                                                                      kolibri_server=kolibri_server)
        elif '\\Scripts\\kolibri' in launcher:
            paths = sys.path
            for path in paths:
                if 'kolibri.exe' in path:
                    install_type = 'Windows'
                    break
        elif 'start' in cmd_line:
            install_type = 'whl'
    if on_android():
        from jnius import autoclass
        context = autoclass('org.kivy.android.PythonActivity')
        version_name = context.getPackageManager().getPackageInfo(
            context.getPackageName(), 0).versionName
        install_type = 'apk - {}'.format(version_name)

    return install_type
