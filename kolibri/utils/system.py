"""
Utilities for local system calls, everything here is cross-platform.

We might want to refactor this into:

system/__init__.py
system/posix.py
system/windows.py

etc..
"""
from __future__ import absolute_import, print_function, unicode_literals

import os


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


# Utility functions for pinging or killing PIDs
if os.name == 'posix':
    pid_exists = _posix_pid_exists
    kill_pid = _posix_kill_pid
else:
    pid_exists = _windows_pid_exists
    kill_pid = _windows_kill_pid
