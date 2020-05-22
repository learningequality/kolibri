import fcntl
import json
import os
import socket
import subprocess
import urllib.request

from contextlib import contextmanager
from urllib.error import URLError

from ..globals import KOLIBRI_HTTP_PORT, XDG_DATA_HOME


@contextmanager
def singleton_service(service="kolibri", state=""):
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
