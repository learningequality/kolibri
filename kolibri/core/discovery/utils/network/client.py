import logging
from urllib.parse import urlparse

import requests

import kolibri
from . import errors
from .urls import get_normalized_url_variations
from .urls import HTTP_PORTS
from .urls import HTTPS_PORTS
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import LocationTypes
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.urls import join_url
from kolibri.utils.server import get_urls

logger = logging.getLogger(__name__)

device_info_defaults = {
    "subset_of_users_device": False,
}

DEFAULT_CONNECT_TIMEOUT = 5
DEFAULT_READ_TIMEOUT = 60
# default read timeout when within a job
DEFAULT_ASYNC_READ_TIMEOUT = 30
# when the network client tries variations of a url, that means the overall length of time it takes
# is multiplied by the number of variations, so for synchronous operations (in a HTTP request) we
# make the overall timeout ~= the DEFAULT_READ_TIMEOUT
DEFAULT_SYNC_READ_TIMEOUT = DEFAULT_READ_TIMEOUT / (len(HTTP_PORTS) + len(HTTPS_PORTS))


class NetworkClient(requests.Session):
    __slots__ = ("base_url", "timeout", "session", "device_info", "remote_ip")

    def __init__(self, base_url, timeout=None):
        """
        If an explicit base_url is already known, provide that. If only a vague address is known,
        `build_from_address` can build a client to determine the actual `base_url`
        :param base_url: The fully composed URL for a network location, without path
        :param timeout: A timeout value in seconds or tuple for (connect, read)
        :type timeout: float|tuple
        """
        super(NetworkClient, self).__init__()

        self.base_url = base_url
        self.timeout = timeout or (DEFAULT_CONNECT_TIMEOUT, DEFAULT_READ_TIMEOUT)
        self.session = None
        self.device_info = None
        self.remote_ip = None
        self.headers.update(
            {
                "User-Agent": get_user_agent(),
            }
        )

    @classmethod
    def build_for_address(cls, address, timeout=None):
        """
        Normalizes the address URL and tries a number of variations until we find one
        that's able to connect

        :param address: The address of which to try variations of
        :param timeout: A timeout value in seconds or tuple for (connect, read)
        :return: A NetworkClient with a verified connection
        :rtype: NetworkClient|cls
        """
        logger.info(
            "Attempting connections to variations of the URL: {}".format(address)
        )
        if timeout is None:
            if get_current_job() is not None:
                # when we're within a job, then we can use longer timeouts
                timeout = (DEFAULT_CONNECT_TIMEOUT, DEFAULT_ASYNC_READ_TIMEOUT)
            else:
                # if we're within a request thread, then we limit it for an overall time
                timeout = (DEFAULT_CONNECT_TIMEOUT, DEFAULT_SYNC_READ_TIMEOUT)
        _, self_urls = get_urls()
        for url in get_normalized_url_variations(address):
            if url in self_urls:
                continue  # exclude our own URLs
            with cls(url, timeout=timeout) as client:
                if client.connect(raise_if_unavailable=False):
                    return client
        # we weren't able to connect to any of the URL variations, so all we can do is throw
        raise errors.NetworkLocationNotFound()

    @classmethod
    def build_from_network_location(cls, network_location, timeout=None):
        """
        Creates a NetworkClient for a NetworkLocation, and validates the connection if the status
        isn't already 'Okay'
        :param network_location: The network location model
        :type network_location: kolibri.core.discovery.models.NetworkLocation
        :param timeout: A timeout value in seconds or tuple for (connect, read)
        :return: A NetworkClient with a verified connection
        :rtype: NetworkClient|cls
        """
        # expect that static network locations have an exact base_url, and only try different
        # variations if we haven't already
        if (
            network_location.location_type is LocationTypes.Dynamic
            and network_location.connection_status == ConnectionStatus.Unknown
        ):
            return cls.build_for_address(network_location.base_url, timeout=timeout)
        return cls(network_location.base_url, timeout=timeout)

    def head(self, path, **kwargs):
        return self.request("HEAD", path, **kwargs)

    def get(self, path, **kwargs):
        return self.request("GET", path, **kwargs)

    def post(self, path, **kwargs):
        return self.request("POST", path, **kwargs)

    def request(self, method, path, **kwargs):
        response = None
        if "timeout" not in kwargs:
            kwargs.update(timeout=self.timeout)

        url = join_url(self.base_url, path)
        try:
            with super(NetworkClient, self).request(
                method, url, stream=True, **kwargs
            ) as response:
                if response.raw._connection.sock is None:
                    raise requests.exceptions.ConnectionError("No socket available")

                # capture the remote IP address, which requires `stream=True` and before consumed
                self.remote_ip = response.raw._connection.sock.getpeername()[0]
                # now consume content, see how `Session.send` does this when `stream=False`
                response.content

            response.raise_for_status()
            return response
        except (
            requests.exceptions.ConnectionError,
            requests.exceptions.SSLError,
            requests.exceptions.ConnectTimeout,
            requests.exceptions.URLRequired,
            requests.exceptions.MissingSchema,
            requests.exceptions.InvalidSchema,
            requests.exceptions.InvalidURL,
            requests.exceptions.InvalidHeader,
            requests.exceptions.InvalidJSONError,
        ) as e:
            raise errors.NetworkLocationConnectionFailure(
                "Unable to connect: {}".format(url)
            ) from e
        except (
            requests.exceptions.ReadTimeout,
            requests.exceptions.TooManyRedirects,
        ) as e:
            raise errors.NetworkLocationResponseTimeout(
                "Response timeout: {}".format(url)
            ) from e
        except (
            requests.exceptions.HTTPError,
            requests.exceptions.ContentDecodingError,
            requests.exceptions.ChunkedEncodingError,
            requests.exceptions.RequestException,
        ) as e:
            raise errors.NetworkLocationResponseFailure(
                "Response failure: {}".format(url), response=response
            ) from e

    def connect(self, raise_if_unavailable=True):  # noqa: C901
        """
        Attempts a connection to the instance and caches its device information if successful
        :param raise_if_unavailable: Raises an error if connection fails and this value is True
        :return: A boolean determining success, never False if `raise_if_unavailable=True`
        """

        from kolibri.core.device.utils import DEVICE_INFO_VERSION
        from kolibri.core.device.utils import device_info_keys

        # don't reconnect if client has already done so
        if self.device_info is not None:
            return True

        try:
            logger.info("Attempting connection to: {}".format(self.base_url))
            response = self.get(
                "api/public/info/",
                allow_redirects=True,
                params={"v": DEVICE_INFO_VERSION},
                timeout=(DEFAULT_CONNECT_TIMEOUT, 5),
            )
        except errors.NetworkClientError as e:
            logger.info(e)
            if raise_if_unavailable:
                raise e
            return False

        # check that we successfully connected, and if we were redirected that it's still
        # the right endpoint
        parsed_url = urlparse(response.url)
        if response.status_code != 200:
            if raise_if_unavailable:
                raise errors.NetworkLocationInvalidResponse(
                    "Response status {}".format(response.status_code)
                )
            return False
        if not parsed_url.path.rstrip("/").endswith("/api/public/info"):
            if raise_if_unavailable:
                raise errors.NetworkLocationInvalidResponse(
                    "Request redirected to {}".format(parsed_url.path)
                )
            return False

        try:
            info = response.json()
            self.device_info = {}
            for key in device_info_keys.get(DEVICE_INFO_VERSION, []):
                self.device_info[key] = info.get(key, device_info_defaults.get(key))
            if self.device_info["application"] not in ["studio", "kolibri"]:
                raise errors.NetworkLocationInvalidResponse(
                    "Server is not running Kolibri or Studio"
                )
            logger.info("Success! We connected to: {}".format(response.url))

            self.base_url = "{}://{}{}".format(
                parsed_url.scheme,
                parsed_url.netloc,
                parsed_url.path.rstrip("/").replace("api/public/info", ""),
            )
        except (requests.exceptions.JSONDecodeError, ValueError) as e:
            logger.info(
                "Invalid JSON returned when attempting to connect to a remote server"
            )
            if raise_if_unavailable:
                raise errors.NetworkLocationInvalidResponse(
                    "Invalid JSON returned"
                ) from e
            return False

        return True


def get_user_agent():
    return "Kolibri/{0} python-requests/{1}".format(
        kolibri.__version__, requests.__version__
    )
