from __future__ import annotations

import logging
import re
import subprocess
import sys
import typing
from pathlib import Path
from urllib.parse import parse_qs
from urllib.parse import SplitResult
from urllib.parse import urlsplit

import pew.ui
from kolibri_app.config import DATA_DIR
from kolibri_app.globals import KOLIBRI_HOME_PATH

from .kolibri_daemon_manager import KolibriDaemonManager
from .kolibri_window import KolibriChannelWindow
from .kolibri_window import KolibriGenericWindow
from .kolibri_window import KolibriWindow
from .utils import get_localized_file

logger = logging.getLogger(__name__)

INACTIVITY_TIMEOUT_MS = 10 * 1000  # 10 seconds in milliseconds


class Application(pew.ui.PEWApp):
    handles_open_file_uris: bool = True

    __application_id: str
    __kolibri_daemon: KolibriDaemonManager
    __loader_url: str
    __windows: typing.List[KolibriWindow]

    def __init__(self, application_id):
        self.__application_id = application_id

        self.__kolibri_daemon = KolibriDaemonManager(self.__on_kolibri_daemon_change)

        loader_path = get_localized_file(
            Path(DATA_DIR, "assets", "_load-{}.html").as_posix(),
            Path(DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = loader_path.as_uri()

        self.__windows = []

        super().__init__()

        gtk_application = getattr(self, "gtk_application", None)
        if gtk_application:
            gtk_application.set_inactivity_timeout(INACTIVITY_TIMEOUT_MS)

    @property
    def application_id(self) -> str:
        return self.__application_id

    @property
    def default_url(self) -> str:
        return "x-kolibri-app:/"

    @property
    def kolibri_daemon(self) -> KolibriDaemonManager:
        return self.__kolibri_daemon

    def init_ui(self):
        self.kolibri_daemon.init_kolibri_daemon()
        if len(self.__windows) == 0:
            self.open_window()

    def shutdown(self):
        self.kolibri_daemon.stop_kolibri_daemon()
        super().shutdown()

    def __on_kolibri_daemon_change(self):
        for window in self.__windows:
            window.kolibri_change_notify()

    def open_window(self, target_url: str = None) -> typing.Optional[KolibriWindow]:
        target_url = target_url or self.default_url

        if not self.should_load_url(target_url, fallback_to_external=True):
            return None

        window = self._create_window(target_url)
        self.add_window(window)
        window.kolibri_change_notify()
        window.show()

        return window

    def _create_window(self, target_url: str) -> KolibriWindow:
        raise NotImplementedError()

    def add_window(self, window: KolibriWindow):
        self.__windows.append(window)

    def remove_window(self, window: KolibriWindow):
        self.__windows.remove(window)

    def handle_open_file_uris(self, urls: list):
        for url in urls:
            self.__handle_open_file_uri(url)

    def __handle_open_file_uri(self, url: str):
        valid_url_schemes = ("kolibri", "x-kolibri-app")

        url_tuple = urlsplit(url)

        if url_tuple.scheme not in valid_url_schemes:
            logger.info("Invalid URL scheme: %s", url)
            return

        last_window = next(reversed(self.__windows), None)

        if last_window:
            last_window.load_url(url)
        else:
            self.open_window(url)

    def open_url_in_external(self, url: str):
        self.open_in_browser(url)

    def should_load_url(self, url: str, fallback_to_external: bool = True) -> bool:
        is_loader_url = url.startswith(self.__loader_url)

        should_load = (
            url == self.default_url
            or urlsplit(url).scheme in ("kolibri", "x-kolibri-app", "about")
            or (is_loader_url and self.kolibri_daemon.is_loading())
            or self.is_kolibri_url(url)
        )

        if fallback_to_external and not (should_load or is_loader_url):
            self.open_url_in_external(url)

        return should_load

    def is_kolibri_url(self, url: str) -> bool:
        return self.kolibri_daemon.is_kolibri_url(url)

    def get_loader_url(self, state: str) -> str:
        return self.__loader_url + "#" + state

    def get_full_url(self, url: str) -> typing.Optional[str]:
        url_tuple = urlsplit(url)
        if url_tuple.scheme == "kolibri":
            target_url = self.parse_kolibri_url_tuple(url_tuple)
            return self.kolibri_daemon.get_kolibri_initialize_url(target_url)
        elif url_tuple.scheme == "x-kolibri-app":
            target_url = self.parse_x_kolibri_app_url_tuple(url_tuple)
            return self.kolibri_daemon.get_kolibri_initialize_url(target_url)
        return url

    def parse_kolibri_url_tuple(self, url_tuple: SplitResult) -> str:
        """
        Parse a URL tuple according to the public Kolibri URL format. This format uses
        a single-character identifier for a node type - "t" for topic or "c"
        for content, followed by its unique identifier. It is constrained to
        opening content nodes or search pages.

        Examples:

        - kolibri:t/TOPIC_NODE_ID?searchTerm=addition
        - kolibri:c/CONTENT_NODE_ID
        - kolibri:?searchTerm=addition
        """

        url_query = parse_qs(url_tuple.query, keep_blank_values=True)

        if url_tuple.path and url_tuple.path != "/":
            item_path = "/learn"
            item_fragment = "/topics/" + url_tuple.path.lstrip("/")
        elif url_tuple.query:
            item_path = "/learn"
            item_fragment = "/search"
        else:
            item_path = "/"
            item_fragment = ""

        if "searchTerm" in url_query:
            item_fragment += "?searchTerm={search}".format(
                search=" ".join(url_query["searchTerm"])
            )

        return "{path}#{fragment}".format(path=item_path, fragment=item_fragment)

    def url_to_x_kolibri_app(self, url: str) -> str:
        return urlsplit(url)._replace(scheme="x-kolibri-app", netloc="").geturl()

    def parse_x_kolibri_app_url_tuple(self, url_tuple: SplitResult) -> str:
        """
        Parse a URL tuple according to the internal Kolibri app URL format. This
        format is the same as Kolibri's URLs, but without the hostname or port
        number.

        - x-kolibri-app:/device
        """
        return url_tuple._replace(scheme="", netloc="").geturl()

    def open_in_browser(self, url: str):
        subprocess.call(["xdg-open", url])

    def open_kolibri_home(self):
        # TODO: It would be better to open self.__dbus_proxy.props.kolibri_home,
        #       but the Flatpak's OpenURI portal only allows us to open files
        #       that exist in our sandbox.
        subprocess.call(["xdg-open", KOLIBRI_HOME_PATH.as_uri()])

    def run(self, argv: list = None):
        self.gtk_application.run(argv or sys.argv)

    def quit(self):
        for window in self.__windows:
            window.close()


class GenericApplication(Application):
    def _create_window(self, target_url: str = None):
        return KolibriGenericWindow(target_url, delegate=self)


class ChannelApplication(Application):
    __channel_id: str

    def __init__(self, channel_id: str, *args, **kwargs):
        self.__channel_id = channel_id
        super().__init__(*args, **kwargs)

    @property
    def channel_id(self) -> str:
        return self.__channel_id

    @property
    def default_url(self) -> str:
        return "x-kolibri-app:/learn#topics/{channel_id}".format(
            channel_id=self.channel_id
        )

    def _create_window(self, target_url: str = None) -> KolibriWindow:
        return KolibriChannelWindow(self.channel_id, target_url, delegate=self)

    def open_url_in_external(self, url: str):
        if super().kolibri_daemon.is_kolibri_url(url):
            url = self.url_to_x_kolibri_app(url)
        self.open_in_browser(url)

    def is_kolibri_url(self, url: str) -> bool:
        return super().is_kolibri_url(url) and self.__is_url_in_channel(url)

    def __is_url_in_channel(self, url: str) -> bool:
        # Allow the user to navigate to login and account management pages, as
        # well as URLs related to file storage and general-purpose APIs, but not
        # to other channels or the channel listing page.

        # TODO: This is costly and complicated. Instead, we should be able to
        #       ask the Kolibri web frontend to avoid showing links outside of
        #       the channel, and any such links in a new window.

        url_tuple = urlsplit(url)

        if re.match(
            r"^\/(zipcontent|app|static|downloadcontent|content\/storage)\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(
            r"^\/(?P<lang>[\w\-]+\/)?(user|logout|redirectuser|learn\/app)\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(
            r"^\/(?P<lang>[\w\-]+\/)?kolibri_desktop_auth_plugin\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(
            r"^\/(?P<lang>[\w\-]+\/)?\/app\/api\/initialize\/?",
            url_tuple.path,
        ):
            return True
        elif re.match(r"^\/(?P<lang>[\w\-]+\/)?learn\/?", url_tuple.path):
            return self.__is_learn_fragment_in_channel(url_tuple.fragment)
        else:
            return False

    def __is_learn_fragment_in_channel(self, fragment: str) -> bool:
        fragment = fragment.lstrip("/")

        if re.match(r"^(content-unavailable|search)", fragment):
            return True

        contentnode_id = self.__contentnode_id_for_learn_fragment(fragment)

        if contentnode_id is None:
            return False

        if contentnode_id == self.channel_id:
            return True

        response = self.kolibri_daemon.kolibri_api_get(
            "/api/content/contentnode/{contentnode_id}".format(
                contentnode_id=contentnode_id
            )
        )

        if not isinstance(response, dict):
            return False

        contentnode_channel = response.get("channel_id")

        return contentnode_channel == self.channel_id

    def __contentnode_id_for_learn_fragment(
        self, fragment: str
    ) -> typing.Optional[str]:
        pattern = r"^topics\/([ct]\/)?(?P<node_id>\w+)"
        match = re.match(pattern, fragment)
        if match:
            return match.group("node_id")

        return None
