import json
from urllib.parse import urldefrag
from urllib.parse import urlsplit

from kolibri_app.logger import logging

LOOPBACK_IP = "127.0.0.1"

LOCATION = "location"
LEGACY_URL = "URL"

_DEFAULT_PORTS = {"http": 80, "https": 443}


def loopback_origin(port):
    return f"http://{LOOPBACK_IP}:{port}"


def origin_of(url):
    parts = urlsplit(url or "")
    if not parts.scheme or not parts.hostname:
        return None
    if parts.port == _DEFAULT_PORTS.get(parts.scheme):
        return f"{parts.scheme}://{parts.hostname}"
    return f"{parts.scheme}://{parts.netloc}"


def _legacy_location(url):
    if urlsplit(url or "").hostname != "localhost":
        return None
    return url[len(origin_of(url)) :]


class LastPage:
    def __init__(self, state_path):
        self._state_path = state_path
        self.origin = None
        self._initialize_path = None
        self.location = self._read()

    def _read(self):
        try:
            with open(self._state_path, encoding="utf-8") as f:
                state = json.load(f)
            return state.get(LOCATION) or _legacy_location(state.get(LEGACY_URL))
        except (OSError, ValueError, AttributeError):
            return None

    @property
    def next_url(self):
        return None if self.location is None else urldefrag(self.location).url

    def served_at(self, initialize_url):
        self.origin = origin_of(initialize_url)
        self._initialize_path = urlsplit(initialize_url).path

    def _location_of(self, url):
        if (
            self.origin is None
            or origin_of(url) != self.origin
            or urlsplit(url).path == self._initialize_path
        ):
            return None
        return url[len(self.origin) :]

    def save(self, url):
        location = self._location_of(url)
        if location is None or location == self.location:
            return
        self.location = location
        try:
            with open(self._state_path, "w", encoding="utf-8") as f:
                json.dump({LOCATION: location}, f)
        except OSError as e:
            logging.warning(f"Failed to save the last page: {e}")
