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
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import sys

import six

from .conf import KOLIBRI_HOME
from kolibri.utils.android import on_android


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


def _posix_kill_pid(pid):
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


def _windows_pid_exists(pid):
    import ctypes
    kernel32 = ctypes.windll.kernel32
    SYNCHRONIZE = 0x100000

    process = kernel32.OpenProcess(SYNCHRONIZE, 0, pid)
    if process != 0:
        kernel32.CloseHandle(process)
        return True
    else:
        return False


def _windows_kill_pid(pid):
    """Kill the proces using pywin32 and pid"""
    import ctypes
    PROCESS_TERMINATE = 1
    handle = ctypes.windll.kernel32.OpenProcess(PROCESS_TERMINATE, False, pid)  # @UndefinedVariable
    ctypes.windll.kernel32.TerminateProcess(handle, -1)  # @UndefinedVariable
    ctypes.windll.kernel32.CloseHandle(handle)  # @UndefinedVariable


buffering = int(six.PY3)        # No unbuffered text I/O on Python 3 (#20815).


def _posix_become_daemon(our_home_dir='.', out_log='/dev/null',
                         err_log='/dev/null', umask=0o022):
    "Robustly turn into a UNIX daemon, running in our_home_dir."
    # First fork
    try:
        if os.fork() > 0:
            sys.exit(0)     # kill off parent
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
    if sys.platform != 'darwin':  # This block breaks on OS X
        # Fix courtesy of https://github.com/serverdensity/python-daemon/blob/master/daemon.py#L94
        si = open('/dev/null', 'r')
        so = open(out_log, 'a+', buffering)
        se = open(err_log, 'a+', buffering)
        os.dup2(si.fileno(), sys.stdin.fileno())
        os.dup2(so.fileno(), sys.stdout.fileno())
        os.dup2(se.fileno(), sys.stderr.fileno())
        # Set custom file descriptors so that they get proper buffering.
        sys.stdout, sys.stderr = so, se


def _windows_become_daemon(our_home_dir='.', out_log=None, err_log=None, umask=0o022):
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
        sys.stderr = open(err_log, 'a', buffering)
    else:
        sys.stderr = _WindowsNullDevice()
    if out_log:
        sys.stdout = open(out_log, 'a', buffering)
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
    if sys.platform.startswith('win'):
        import ctypes

        free = ctypes.c_ulonglong(0)
        check = ctypes.windll.kernel32.GetDiskFreeSpaceExW(ctypes.c_wchar_p(path), None, None, ctypes.pointer(free))
        if check == 0:
            raise ctypes.winError()
        result = free.value
    elif on_android():
        # This is meant for android, which needs to interact with android API to understand free
        # space. If we're somehow getting here on non-android, we've got a problem.
        try:
            from jnius import autoclass
            StatFs = autoclass('android.os.StatFs')

            st = StatFs(KOLIBRI_HOME)

            try:
                # for api version 18+
                result = st.getFreeBlocksLong() * st.getBlockSizeLong()
            except Exception:
                # for api versions < 18
                result = st.getFreeBlocks() * st.getBlockSize()

        except Exception as e:
            raise e
    else:
        st = os.statvfs(os.path.realpath(path))
        result = st.f_bavail * st.f_frsize

    return result


# Utility functions for pinging or killing PIDs
if os.name == 'posix':
    pid_exists = _posix_pid_exists
    kill_pid = _posix_kill_pid
    become_daemon = _posix_become_daemon
else:
    pid_exists = _windows_pid_exists
    kill_pid = _windows_kill_pid
    become_daemon = _windows_become_daemon
