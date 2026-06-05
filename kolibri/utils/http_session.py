"""
HTTP utilities shared across Kolibri's remote-fetching code paths.
"""

import logging
from urllib.parse import urljoin
from urllib.parse import urlparse

import requests

logger = logging.getLogger(__name__)


def _host(url):
    """The hostname of a URL, lowercased for comparison."""
    hostname = urlparse(url).hostname
    return hostname.lower() if hostname else None


class SameHostSession(requests.Session):
    """A :class:`requests.Session` that refuses cross-host redirects."""

    def get_redirect_target(self, resp):
        target = super().get_redirect_target(resp)
        if target is None:
            return None
        absolute_target = urljoin(resp.url, target)
        if _host(absolute_target) != _host(resp.url):
            logger.info(
                "Refusing cross-host redirect from %s to %s",
                resp.url,
                absolute_target,
            )
            return None
        return target
