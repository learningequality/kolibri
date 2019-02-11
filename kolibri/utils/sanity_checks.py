import logging
import os
import sys

import portend

from .conf import OPTIONS
from .server import get_status
from .server import LISTEN_ADDRESS
from .server import NotRunning

logger = logging.getLogger(__name__)

PORT_AVAILABILITY_CHECK_TIMEOUT = 2


def check_other_kolibri_running(port):
    try:
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        get_status()
        logger.error(
            "There is another Kolibri server running. "
            "Please use `kolibri stop` and try again."
        )
        sys.exit(1)

    except NotRunning:
        # In case that something other than Kolibri occupies the port,
        # check the port's availability.
        check_port_availability(LISTEN_ADDRESS, port)


def check_port_availability(host, port):
    try:
        portend.free(host, port, timeout=PORT_AVAILABILITY_CHECK_TIMEOUT)
    except portend.Timeout:
        # Port is occupied
        logger.error(
            "Port {} is occupied.\n"
            "Please check that you do not have other processes "
            "running on this port and try again.\n".format(port)
        )
        sys.exit(1)


def check_content_directory_exists_and_writable():
    content_directory = OPTIONS['Paths']['CONTENT_DIR']

    # Check if the content directory exists
    if not os.path.exists(content_directory):
        logger.error(
            "The content directory {} does not exist.".format(content_directory)
        )
        sys.exit(1)

    # Check if the directory is writable
    if not os.access(content_directory, os.W_OK):
        logger.error(
            "The content directory {} is not writable.".format(content_directory)
        )
        sys.exit(1)
