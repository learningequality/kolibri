import logging

import requests
from six.moves.urllib.parse import urljoin

from . import errors
from .urls import get_normalized_url_variations

logger = logging.getLogger(__name__)


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
        # try each of the URLs in turn, returning the first one that succeeds
        for url in urls:
            try:
                logger.info("Attempting connection to: {}".format(url))
                response = self.get(
                    "/api/public/info/",
                    base_url=url,
                    timeout=self.timeout,
                    allow_redirects=True,
                )
                # check that we successfully connected, and if we were redirected that it's still the right endpoint
                if response.status_code == 200 and response.url.rstrip("/").endswith(
                    "/api/public/info"
                ):
                    self.info = response.json()
                    if self.info["application"] not in ["studio", "kolibri"]:
                        raise requests.RequestException(
                            "Server is not running Kolibri or Studio"
                        )
                    logger.info("Success! We connected to: {}".format(response.url))
                    return response.url.rstrip("/").replace("api/public/info", "")
            except (requests.RequestException) as e:
                logger.info("Unable to connect: {}".format(e))

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
