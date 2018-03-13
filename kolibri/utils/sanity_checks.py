import logging
import socket
import sys

from .server import get_status
from .server import NotRunning

logger = logging.getLogger(__name__)

def check_other_kolibri_running(port):
    try:
        # Check if there are other kolibri instances running
        # If there are, then we need to stop users from starting kolibri again.
        pid, listen_address, listen_port = get_status()
        logger.error(
            "There is another Kolibri server running. "
            "Please use `kolibri stop` and try again."
        )
        sys.exit(1)

    except NotRunning:
        # In case that something other than Kolibri occupies the port,
        # check the port's availability.
        check_port_availability('127.0.0.1', port)


def check_port_availability(host, port):
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    # This is to prevent the previous execution has left the socket
    # in a TIME_WAIT start, and can't be immediately reused.
    # From the bottom of https://docs.python.org/2/library/socket.html#example
    s.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    try:
        s.bind((host, port))
        s.close()
    except socket.error:
        # Port is occupied
        logger.error(
            "Port {} is occupied.\n"
            "Please check that you do not have other processes "
            "running on this port and try again.\n".format(port)
        )
        s.close()
        sys.exit(1)
