import errno
import logging
import os
import socket

from kolibri.utils.options import read_options_file
from kolibri.utils.options import update_options_file

try:
    import pwd
except ImportError:
    pwd = None

logger = logging.getLogger(__name__)

PREFERRED_HTTP_PORT = 80
FALLBACK_HTTP_PORT = 8080
PROCFS_PATH = "/proc"

# Socket state column of /proc/net/tcp{,6}: include/net/tcp_states.h TCP_LISTEN
_TCP_LISTEN = "0A"


def elect_http_port(preferred_port, ini_filename="options.ini"):
    deployment = read_options_file(ini_filename=ini_filename)["Deployment"]
    if "HTTP_PORT" not in deployment.defaults:
        logger.info("HTTP_PORT is set explicitly; skipping port election")
        return

    address = deployment["LISTEN_ADDRESS"]
    candidates = [preferred_port]
    if preferred_port != FALLBACK_HTTP_PORT:
        candidates.append(FALLBACK_HTTP_PORT)

    for port in candidates:
        error = _bind_error(address, port)
        if error is None:
            update_options_file("Deployment", "HTTP_PORT", port, ini_filename)
            logger.info("Elected HTTP port %s", port)
            return
        logger.warning("Port %s is %s", port, _describe_bind_error(error, port))

    logger.warning(
        "None of ports %s could be bound; HTTP_PORT left unset",
        ", ".join(str(port) for port in candidates),
    )


def _bind_error(address, port):
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        # cheroot's ``prepare_socket`` sets SO_REUSEADDR except on Windows,
        # so a port held only by TIME_WAIT connections is bindable by the server.
        if os.name != "nt":
            sock.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        sock.bind((address, port))
    except OSError as e:
        return e
    finally:
        sock.close()
    return None


def _describe_bind_error(error, port):
    # Winsock reports a refused bind as WSAEACCES, not the CRT's EACCES.
    permission_denied = error.errno in (errno.EACCES, getattr(errno, "WSAEACCES", None))
    if error.errno == errno.EADDRINUSE or permission_denied:
        # Linux checks bind privilege before port occupancy, so an
        # unprivileged bind to an occupied port below 1024 reports EACCES.
        listeners = _listening_sockets(port)
        if listeners:
            return f"in use by {_find_listener(listeners)}"
    if permission_denied:
        return "unavailable: permission denied"
    if error.errno == errno.EADDRINUSE:
        return "in use"
    return f"unavailable: {error.strerror}"


def _listening_sockets(port):
    """
    :returns: a dict of listening socket inode to owning uid
    """
    listeners = {}
    for table in ("tcp", "tcp6"):
        try:
            with open(os.path.join(PROCFS_PATH, "net", table)) as f:
                next(f)
                for line in f:
                    # Columns: sl local_address rem_address st ... uid (8th) timeout inode (10th)
                    fields = line.split()
                    local_port = int(fields[1].rsplit(":", 1)[1], 16)
                    if fields[3] == _TCP_LISTEN and local_port == port:
                        listeners[fields[9]] = int(fields[7])
        except OSError:
            continue
    return listeners


def _find_listener(listeners):
    targets = {f"socket:[{inode}]" for inode in listeners}
    for pid in os.listdir(PROCFS_PATH):
        if not pid.isdigit():
            continue
        fd_dir = os.path.join(PROCFS_PATH, pid, "fd")
        try:
            if any(
                os.readlink(os.path.join(fd_dir, fd)) in targets
                for fd in os.listdir(fd_dir)
            ):
                return _describe_process(pid)
        except (PermissionError, FileNotFoundError):
            continue
    users = sorted({_user_name(uid) for uid in listeners.values()})
    return f"a process of user {', '.join(users)}"


def _user_name(uid):
    try:
        return pwd.getpwuid(uid).pw_name
    except KeyError:
        return str(uid)


def _describe_process(pid):
    with open(os.path.join(PROCFS_PATH, pid, "comm"), errors="replace") as f:
        name = f.read().strip()
    with open(os.path.join(PROCFS_PATH, pid, "cgroup")) as f:
        units = [
            segment
            for line in f
            for segment in line.strip().split("/")
            if segment.endswith((".service", ".scope"))
        ]
    if units and units[-1].endswith(".service"):
        return f"{name} ({units[-1]})"
    return name
