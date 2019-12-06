import socket
from contextlib import closing

from . import errors
from .client import NetworkClient
from .urls import parse_address_into_components
from kolibri.core.utils.cache import CrossProcessCache


class Nothing:
    def __nonzero__(self):
        return False

    __bool__ = __nonzero__  # this is for python3


INVALID_DEVICE_INFO = Nothing()
FAILED_TO_CONNECT = Nothing()


def check_if_port_open(base_url, timeout=1):
    _, host, port, _ = parse_address_into_components(base_url)

    with closing(socket.socket(socket.AF_INET, socket.SOCK_STREAM)) as sock:
        sock.settimeout(timeout)
        return sock.connect_ex((host, port)) == 0


def check_device_info(base_url):
    """ try to get device info for a Kolibri instance at `base_url` """
    try:
        info = NetworkClient(base_url=base_url).info
        if info["application"] in ["studio", "kolibri"]:
            return info
        else:
            return INVALID_DEVICE_INFO
    except (errors.NetworkClientError, errors.NetworkLocationNotFound):
        return FAILED_TO_CONNECT
    except KeyError:
        return INVALID_DEVICE_INFO


device_info_cache = CrossProcessCache(3)
device_port_open_cache = CrossProcessCache(60)


class CachedDeviceConnectionChecker(object):
    def __init__(self, base_url):
        self.base_url = base_url

    def check_device_info(self):
        info = check_device_info(self.base_url)

        if info:
            device_info_cache.set(self.base_url, info)

        return info

    @property
    def device_info(self):
        return device_info_cache.get(self.base_url)

    @property
    def valid_device_info(self):
        if not (
            self.device_info is INVALID_DEVICE_INFO
            or self.device_info is FAILED_TO_CONNECT
        ):
            return self.device_info

    @property
    def invalid_device_info(self):
        return self.device_info is INVALID_DEVICE_INFO

    def failed_to_connect(self):
        return self.device_info is FAILED_TO_CONNECT

    @property
    def device_port_open(self):
        """ check to see if a port is open at a given `base_url` """

        cached = device_port_open_cache.get(self.base_url)

        if cached:
            return cached

        result = check_if_port_open(self.base_url)
        device_port_open_cache.set(self.base_url, result)

        return result

    @property
    def available(self):
        if self.device_info and self.device_port_open:
            return self.device_info
        elif self.invalid_device_info and self.device_port_open:
            return False
        elif self.failed_to_connect and self.device_port_open:
            self.check_device_info()
            return self.device_info
        elif not self.device_info and self.device_port_open:
            self.check_device_info()
            return self.device_info

        return False


def check_connection(base_url):
    return CachedDeviceConnectionChecker(base_url).available
