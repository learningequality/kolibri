#!/usr/bin/python3

import fcntl
import io
import json
import os
import socket
import subprocess
import urllib.request

from contextlib import contextmanager
from urllib.error import URLError


USER_HOME = os.path.expanduser("~")

XDG_DATA_HOME = os.environ.get('XDG_DATA_HOME', os.path.join(USER_HOME, ".local", "share"))

KOLIBRI_IDLE_TIMEOUT_MINS = int(os.environ.get("KOLIBRI_IDLE_TIMEOUT_MINS", 60))
KOLIBRI_IDLE_TIMEOUT_SECS = KOLIBRI_IDLE_TIMEOUT_MINS * 60

# Get KOLIBRI_HTTP_PORT from kolibri.utils.conf if needed.
# This will fail in an environment where Kolibri is supposed to run as a
# separate user due to code in kolibri.utils.conf which requires access to
# KOLIBRI_HOME. For that case, we check for the environment variable
# ourselves.

if 'KOLIBRI_HTTP_PORT' in os.environ:
    KOLIBRI_HTTP_PORT = int(os.environ.get("KOLIBRI_HTTP_PORT"))
else:
    from kolibri.utils.conf import OPTIONS
    KOLIBRI_HTTP_PORT = OPTIONS["Deployment"]["HTTP_PORT"]

KOLIBRI_URL = "http://127.0.0.1:{}".format(KOLIBRI_HTTP_PORT)

DEFAULT_KOLIBRI_HOME = os.path.join(USER_HOME, ".kolibri")
KOLIBRI_HOME = os.environ.get("KOLIBRI_HOME", DEFAULT_KOLIBRI_HOME)


@contextmanager
def singleton_service(service='kolibri', state=''):
    # Ensures that only a single copy of a service is running on the system,
    # including in different containers.
    lockfile_path = os.path.join(XDG_DATA_HOME, "{}.lock".format(service))
    with open(lockfile_path, "w") as lockfile:
        with _flocked(lockfile):
            lockfile.write(state)
            lockfile.flush()
            yield


def is_kolibri_socket_open():
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", KOLIBRI_HTTP_PORT)) == 0


def get_is_kolibri_responding():
    # Check if Kolibri is responding to http requests at the expected URL.

    try:
        response = urllib.request.urlopen('{}/api/public/info'.format(KOLIBRI_URL))
    except URLError:
        return False

    if response.status != 200:
        return False

    try:
        data = json.load(response)
    except json.JSONDecodeError:
        return False

    return data.get('application') == 'kolibri'


def get_kolibri_running_tasks():
    return subprocess.run("/app/bin/check_for_running_tasks.sh").returncode


@contextmanager
def _flocked(fd):
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
