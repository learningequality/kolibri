import fcntl
import json
import os
import socket
import subprocess
import urllib.request

from contextlib import contextmanager
from urllib.error import URLError

from ..globals import KOLIBRI_HTTP_PORT, XDG_DATA_HOME, kolibri_api_get_json


def is_kolibri_socket_open():
    with socket.socket() as sock:
        return sock.connect_ex(("127.0.0.1", KOLIBRI_HTTP_PORT)) == 0

def get_is_kolibri_responding():
    # Check if Kolibri is responding to http requests at the expected URL.
    info = kolibri_api_get_json('/api/public/info', default=dict())
    return info.get('application') == 'kolibri'

def get_kolibri_running_tasks():
    return subprocess.run("/app/bin/check_for_running_tasks.sh").returncode

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

@contextmanager
def _flocked(fd):
    try:
        fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
        yield
    finally:
        fcntl.flock(fd, fcntl.LOCK_UN)
