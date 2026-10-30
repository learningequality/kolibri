import json
from urllib.parse import urldefrag
from urllib.parse import urlsplit

from kolibri_app.logger import logging

LOOPBACK_IP = "127.0.0.1"

LOCATION = "location"
LEGACY_URL = "URL"


def loopback_origin(port):
    return f"http://{LOOPBACK_IP}:{port}"


def origin_of(url):
    parts = urlsplit(url or "")
    if not parts.scheme or not parts.netloc:
        return None
    return f"{parts.scheme}://{parts.netloc}"


def restore_url_for(loaded_url, saved_location):
    """
    The URL that puts `saved_location`'s fragment back on `loaded_url`, or None
    when it does not belong there.
    """
    if saved_location is None or "#" not in saved_location:
        return None
    origin = origin_of(loaded_url)
    if origin is None:
        return None
    if urldefrag(loaded_url).url != origin + urldefrag(saved_location).url:
        return None
    restore_url = origin + saved_location
    return None if restore_url == loaded_url else restore_url


def _legacy_location(url):
    if urlsplit(url or "").hostname != "localhost":
        return None
    return url[len(origin_of(url)) :]


class LastPage:
    def __init__(self, state_path):
        self._state_path = state_path
        self._origin = None
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
        self._origin = origin_of(initialize_url)
        self._initialize_path = urlsplit(initialize_url).path

    def serves(self, url):
        return self._origin is not None and origin_of(url) == self._origin

    def _location_of(self, url):
        if not self.serves(url) or urlsplit(url).path == self._initialize_path:
            return None
        return url[len(self._origin) :]

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
