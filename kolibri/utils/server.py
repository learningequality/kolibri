import atexit
import multiprocessing
import os
import platform

import cherrypy
from cherrypy.process.plugins import Daemonizer, PIDFile
from django.conf import settings
from django.core.management import call_command
from kolibri.content.utils import paths
from kolibri.content.utils.annotation import update_channel_metadata_cache
from kolibri.deployment.default.wsgi import application

PID_FILE = os.path.join(os.environ['KOLIBRI_HOME'], 'kolibri.pid')


def start_background_workers():
    p = multiprocessing.Process(target=call_command, args=("qcluster",))

    # note: atexit normally only runs when python exits normally, aka doesn't
    # exit through a signal. However, this function gets run because cherrypy
    # catches all the various signals, and runs the atexit callbacks.
    atexit.register(p.terminate)

    p.start()


# Utility functions for reading or killing PIDs
def pid_exists(pid):
    if os.name == 'posix':
        """Check whether PID exists in the current process table."""
        import errno
        if pid < 0:
            return False
        try:
            # Send signal 0, this is harmless
            os.kill(pid, 0)
        except OSError as e:
            return e.errno == errno.EPERM
        else:
            return True
    else:
        import ctypes
        kernel32 = ctypes.windll.kernel32
        SYNCHRONIZE = 0x100000

        process = kernel32.OpenProcess(SYNCHRONIZE, 0, pid)
        if process != 0:
            kernel32.CloseHandle(process)
            return True
        else:
            return False


def kill_pid(pid):
    if os.name == 'posix':
        """Kill a PID by sending a posix signal"""
        import signal
        try:
            os.kill(pid, signal.SIGTERM)
        # process does not exist
        except OSError:
            return
        # process didn't exit cleanly, make one last effort to kill it
        if pid_exists(pid):
            os.kill(pid, signal.SIGKILL)
    else:
        """Kill the proces using pywin32 and pid"""
        import ctypes
        PROCESS_TERMINATE = 1
        handle = ctypes.windll.kernel32.OpenProcess(PROCESS_TERMINATE, False, pid)  # @UndefinedVariable
        ctypes.windll.kernel32.TerminateProcess(handle, -1)  # @UndefinedVariable
        ctypes.windll.kernel32.CloseHandle(handle)  # @UndefinedVariable


def read_pid_file(filename):
    try:
        pid = int(open(filename, "r").read())
    except ValueError:
        pid = None
    return pid


def stop():
    pid = read_pid_file(PID_FILE)
    kill_pid(pid)


def start():
    # start the qcluster process
    # don't run on windows; we don't run a full cluster there.
    if platform.system() != "Windows":
        start_background_workers()

    # Due to the way how Daemonizer works
    # You should be careful to not start any threads before this function runs.
    run_server()

    # TODO(aronasorman): move to install/plugin-enabling scripts, and remove from here
    call_command("collectstatic", interactive=False)
    call_command("collectstatic_js_reverse", interactive=False)
    call_command("migrate", interactive=False, database="default")
    call_command("migrate", interactive=False, database="ormq")

    update_channel_metadata_cache()


def run_server():
    # Daemonizer engine plugin is only available on Unix and similar systems which provide fork().
    Daemonizer(cherrypy.engine).subscribe()
    PIDFile(cherrypy.engine, PID_FILE).subscribe()

    # Mount the application
    cherrypy.tree.graft(application, "/")

    serve_static_dir(settings.STATIC_ROOT, settings.STATIC_URL)
    serve_static_dir(settings.CONTENT_DATABASE_DIR, paths.get_content_database_url("/"))
    serve_static_dir(settings.CONTENT_STORAGE_DIR, paths.get_content_storage_url("/"))

    # Unsubscribe the default server
    cherrypy.server.unsubscribe()

    # Instantiate a new server object
    server = cherrypy._cpserver.Server()

    # Configure the server settings
    server.socket_host = "0.0.0.0"
    server.socket_port = 8080
    server.thread_pool = 30

    # Subscribe this server
    server.subscribe()

    # Start the server engine (Option 1 *and* 2)
    cherrypy.engine.start()
    cherrypy.engine.block()

def serve_static_dir(root, url):

    static_handler = cherrypy.tools.staticdir.handler(
        section="/",
        dir=os.path.split(root)[1],
        root=os.path.abspath(os.path.split(root)[0])
    )
    cherrypy.tree.mount(static_handler, url)
