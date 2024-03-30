"""
Utilities for local system calls, everything here is cross-platform.

become_daemon was originally taken from Django:
https://github.com/django/django/commit/5836a5771f2aefca83349b111f4191d6485af1d5#diff-f7d80be2ccf77f4f009d08dcac4b7736

We might want to refactor this into:

system/__init__.py
system/posix.py
system/windows.py

etc..
"""
import logging
import os
import shutil
import sys

from django.db import connections

from .conf import KOLIBRI_HOME
from .conf import OPTIONS

logger = logging.getLogger(__name__)


def _posix_pid_exists(pid):
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


def _windows_pid_exists(pid):
    import ctypes

    kernel32 = ctypes.windll.kernel32
    SYNCHRONIZE = 0x100000

    process = kernel32.OpenProcess(SYNCHRONIZE, 0, pid)
    if process != 0:
        kernel32.CloseHandle(process)
        return True
    return False


buffering = 1  # No unbuffered text I/O on Python 3 (#20815).


def _posix_become_daemon(
    our_home_dir=".", out_log="/dev/null", err_log="/dev/null", umask=0o022
):
    "Robustly turn into a UNIX daemon, running in our_home_dir."
    # First fork
    try:
        if os.fork() > 0:
            sys.exit(0)  # kill off parent
    except OSError as e:
        sys.stderr.write("fork #1 failed: (%d) %s\n" % (e.errno, e.strerror))
        sys.exit(1)
    os.setsid()
    os.chdir(our_home_dir)
    os.umask(umask)

    # Second fork
    try:
        if os.fork() > 0:
            os._exit(0)
    except OSError as e:
        sys.stderr.write("fork #2 failed: (%d) %s\n" % (e.errno, e.strerror))
        os._exit(1)
    if sys.platform != "darwin":  # This block breaks on OS X
        # Fix courtesy of https://github.com/serverdensity/python-daemon/blob/master/daemon.py#L94
        si = open("/dev/null", "r")
        so = open(out_log, "a+", buffering)
        se = open(err_log, "a+", buffering)
        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())
        # Set custom file descriptors so that they get proper buffering.
        sys.stdout, sys.stderr = so, se


def _windows_become_daemon(our_home_dir=".", out_log=None, err_log=None, umask=0o022):
    """
    If we're not running under a POSIX system, just simulate the daemon
    mode by doing redirections and directory changing.
    """
    os.chdir(our_home_dir)
    os.umask(umask)
    sys.stdin.close()
    old_stderr = sys.stderr
    old_stdout = sys.stdout

    if err_log:
        sys.stderr = open(err_log, "a", buffering)
    else:
        sys.stderr = _WindowsNullDevice()
    if out_log:
        sys.stdout = open(out_log, "a", buffering)
    else:
        sys.stdout = _WindowsNullDevice()

    # Redirect stderr and stdout
    os.dup2(sys.stderr.fileno(), old_stderr.fileno())
    os.dup2(sys.stdout.fileno(), old_stdout.fileno())

    old_stderr.flush()
    old_stdout.flush()


class _WindowsNullDevice:
    "A writeable object that writes to nowhere -- like /dev/null."

    def write(self, s):
        pass


def get_free_space(path=KOLIBRI_HOME):

    path = os.path.realpath(path)

    while path and not os.path.exists(path) and not os.path.isdir(path):
        path = os.path.dirname(
            path
        )  # look to parent if it doesn't exist or isn't a directory
    result = shutil.disk_usage(path).free

    return max(result - OPTIONS["Deployment"]["MINIMUM_DISK_SPACE"], 0)


_become_daemon_function = None


def become_daemon(**kwargs):
    # close all connections before forking, to avoid SQLite corruption:
    # https://www.sqlite.org/howtocorrupt.html#_carrying_an_open_database_connection_across_a_fork_
    connections.close_all()
    _become_daemon_function(**kwargs)


def _posix_get_fd_limit():
    """
    Determines the File Descriptor (FD) limit
    :return: int
    """
    import resource

    fd_soft_limit, _ = resource.getrlimit(resource.RLIMIT_NOFILE)
    return fd_soft_limit


def _windows_get_fd_limit():
    """
    Determines the File Descriptor (FD) limit
    :return: int
    """
    # TODO: "determine" it
    return 512


# Utility functions
if os.name == "posix":
    pid_exists = _posix_pid_exists
    get_fd_limit = _posix_get_fd_limit
    _become_daemon_function = _posix_become_daemon
else:
    pid_exists = _windows_pid_exists
    get_fd_limit = _windows_get_fd_limit
    _become_daemon_function = _windows_become_daemon
