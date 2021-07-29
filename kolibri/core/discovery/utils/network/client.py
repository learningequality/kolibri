import logging

import requests
from six.moves.urllib.parse import urljoin
from six.moves.urllib.parse import urlparse

from . import errors
from .urls import get_normalized_url_variations

logger = logging.getLogger(__name__)

device_info_defaults = {
    "subset_of_users_device": False,
}


class NetworkClient(object):
    DEFAULT_TIMEOUT_IN_SECS = 5

    def __init__(self, base_url=None, address=None, timeout=None, **kwargs):
        """If an explicit base_url is already known, provide that. If a vague address is provided, we can try to infer the base_url"""
        if not base_url and not address:
            raise Exception(
                "You must provide either a `base_url` or `address` argument"
            )
        self.timeout = timeout or self.DEFAULT_TIMEOUT_IN_SECS
        self.session = requests.Session(**kwargs)
        if base_url:
            self.base_url = self._attempt_connections([base_url])
        else:
            # normalize the URL and try a number of variations until we find one that's able to connect
            logger.info(
                "Attempting connections to variations of the URL: {}".format(address)
            )
            self.base_url = self._attempt_connections(
                get_normalized_url_variations(address)
            )

    def _attempt_connections(self, urls):
        from kolibri.core.public.utils import DEVICE_INFO_VERSION
        from kolibri.core.public.utils import device_info_keys

        # try each of the URLs in turn, returning the first one that succeeds
        for url in urls:
            try:
                logger.info("Attempting connection to: {}".format(url))
                response = self.get(
                    "/api/public/info/",
                    base_url=url,
                    timeout=self.timeout,
                    allow_redirects=True,
                    params={"v": DEVICE_INFO_VERSION},
                )
                # check that we successfully connected, and if we were redirected that it's still
                # the right endpoint
                parsed_url = urlparse(response.url)
                if response.status_code == 200 and parsed_url.path.rstrip("/").endswith(
                    "/api/public/info"
                ):
                    info = response.json()
                    self.info = {}
                    for key in device_info_keys.get(DEVICE_INFO_VERSION, []):
                        self.info[key] = info.get(key, device_info_defaults.get(key))
                    if self.info["application"] not in ["studio", "kolibri"]:
                        raise requests.RequestException(
                            "Server is not running Kolibri or Studio"
                        )
                    logger.info("Success! We connected to: {}".format(response.url))

                    return "{}://{}".format(parsed_url.scheme, parsed_url.netloc)
            except (requests.RequestException) as e:
                logger.info("Unable to connect: {}".format(e))
            except ValueError:
                logger.info(
                    "Invalid JSON returned when attempting to connect to a remote server"
                )

        # we weren't able to connect to any of the URL variations, so all we can do is throw
        raise errors.NetworkLocationNotFound()

    def get(self, path, **kwargs):
        return self.request("get", path, **kwargs)

    def head(self, path, **kwargs):
        return self.request("head", path, **kwargs)

    def request(self, method, path, base_url=None, **kwargs):
        base_url = base_url or self.base_url
        url = urljoin(base_url, path)
        response = getattr(self.session, method)(url, **kwargs)
        response.raise_for_status()
        return response
