from __future__ import annotations

import logging
import re
import typing
from pathlib import Path
from urllib.parse import parse_qs
from urllib.parse import SplitResult
from urllib.parse import urlencode
from urllib.parse import urlsplit

from gi.repository import GLib
from gi.repository import GObject
from gi.repository import Soup
from gi.repository import WebKit
from kolibri_app.config import APP_URI_SCHEME
from kolibri_app.config import BUILD_PROFILE
from kolibri_app.config import KOLIBRI_APP_DATA_DIR
from kolibri_app.config import KOLIBRI_URI_SCHEME
from kolibri_app.config import PROJECT_VERSION
from kolibri_app.config import VCS_TAG
from kolibri_app.utils import get_app_modules_debug_info

from .kolibri_daemon_manager import KolibriDaemonManager
from .utils import bubble_signal
from .utils import get_localized_file
from .utils import PropertyWatcher

logger = logging.getLogger(__name__)

LEARN_PATH_PREFIX = "/learn/#/"
SETUP_PATH_PREFIX = "/setup/#/"

STATIC_PATHS_RE = r"^(app|static|downloadcontent|content\/storage|content\/static|content\/zipcontent)\/?"
SYSTEM_PATHS_RE = r"^(?P<lang>[\w\-]+\/)?(auth|user|logout|redirectuser|learn\/app)\/?"
CONTENT_PATHS_RE = r"^(?P<lang>[\w\-]+\/)?learn\/?"
SETUP_PATHS_RE = r"^(?P<lang>[\w\-]+\/)?setup\/?"
SETUP_COMPLETE_PATHS_RE = r"^(?P<lang>[\w\-]+\/)?redirectuser\/?"


class BaseKolibriContext(GObject.GObject):
    SESSION_STATUS_ERROR = 0
    SESSION_STATUS_STOPPED = 1
    SESSION_STATUS_SETUP = 2
    SESSION_STATUS_READY = 3

    __loader_url: str

    session_status = GObject.Property(type=int, default=SESSION_STATUS_STOPPED)

    __gsignals__ = {
        "download-started": (GObject.SIGNAL_RUN_FIRST, None, (WebKit.Download,)),
        "open-external-url": (GObject.SIGNAL_RUN_FIRST, None, (str,)),
        "kolibri-ready": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(self):
        GObject.GObject.__init__(self)

        loader_path = get_localized_file(
            Path(KOLIBRI_APP_DATA_DIR, "loading-page", "{}", "loading.html").as_posix(),
            "en",
        )
        self.__loader_url = loader_path.as_uri()

    @property
    def kolibri_version(self) -> str:
        raise NotImplementedError()

    @property
    def default_url(self) -> str:
        raise NotImplementedError()

    @property
    def is_confined(self) -> bool:
        return False

    @property
    def webkit_network_session(self) -> WebKit.NetworkSession:
        raise NotImplementedError()

    def get_absolute_url(self, url: str) -> typing.Optional[str]:
        raise NotImplementedError()

    def kolibri_api_get(self, *args, **kwargs) -> typing.Any:
        raise NotImplementedError()

    def kolibri_api_get_async(self, *args, **kwargs):
        raise NotImplementedError()

    def is_url_for_kolibri_app(self, url: str) -> bool:
        raise NotImplementedError()

    def is_url_in_scope(self, url: str) -> bool:
        raise NotImplementedError()

    def should_open_url(self, url: str) -> bool:
        return (
            url == self.default_url
            or urlsplit(url).scheme
            in (KOLIBRI_URI_SCHEME, APP_URI_SCHEME, "about", "blob")
            or self.is_url_in_scope(url)
        )

    def get_debug_info(self) -> dict:
        return {}

    def get_loader_url(self, state: str) -> str:
        return self.__loader_url + "#" + state

    def parse_kolibri_url_tuple(self, url_tuple: SplitResult) -> str:
        """
        Parse a URL tuple according to the public Kolibri URL format. This format uses
        a single-character identifier for a node type - "t" for topic or "c"
        for content, followed by its unique identifier. It is constrained to
        opening content nodes or search pages.

        Examples:

        - kolibri:t/TOPIC_NODE_ID?search=addition
        - kolibri:c/CONTENT_NODE_ID
        - kolibri:?search=addition
        """

        url_path = url_tuple.path.lstrip("/")
        url_query = parse_qs(url_tuple.query, keep_blank_values=True)
        url_search = " ".join(url_query.get("search", []))

        node_type, _, node_id = url_path.partition("/")

        if node_type == "c":
            return self._get_kolibri_content_path(node_id, url_search)
        elif node_type == "t":
            # As a special case, don't include the search property for topic
            # nodes. This means Kolibri will always show a simple browsing
            # interface for a topic, instead of a search interface.
            return self._get_kolibri_topic_path(node_id, None)
        else:
            return self._get_kolibri_library_path(url_search)

    def _get_kolibri_content_path(
        self, node_id: str, search: typing.Optional[str] = None
    ) -> str:
        if search:
            query = {"keywords": search, "last": "TOPICS_TOPIC_SEARCH"}
            return f"{LEARN_PATH_PREFIX}topics/c/{node_id}?{urlencode(query)}"
        else:
            return f"{LEARN_PATH_PREFIX}topics/c/{node_id}"

    def _get_kolibri_topic_path(
        self, node_id: str, search: typing.Optional[str] = None
    ) -> str:
        if search:
            query = {"keywords": search}
            return f"{LEARN_PATH_PREFIX}topics/t/{node_id}/search?{urlencode(query)}"
        else:
            return f"{LEARN_PATH_PREFIX}topics/t/{node_id}"

    def _get_kolibri_library_path(self, search: typing.Optional[str] = None) -> str:
        if search:
            query = {"keywords": search}
            return f"{LEARN_PATH_PREFIX}library?{urlencode(query)}"
        else:
            return f"{LEARN_PATH_PREFIX}home"

    def url_to_x_kolibri_app(self, url: str) -> str:
        return urlsplit(url)._replace(scheme=APP_URI_SCHEME, netloc="").geturl()

    def parse_x_kolibri_app_url_tuple(self, url_tuple: SplitResult) -> str:
        """
        Parse a URL tuple according to the internal Kolibri app URL format. This
        format is the same as Kolibri's URLs, but without the hostname or port
        number.

        - x-kolibri-app:/device
        """
        return url_tuple._replace(scheme="", netloc="").geturl()

    def open_external_url(self, url: str) -> typing.Optional[str]:
        if self.is_url_for_kolibri_app(url):
            self.emit("open-external-url", self.url_to_x_kolibri_app(url))
        else:
            self.emit("open-external-url", url)
        return None

    def get_session_status_is_error(self) -> bool:
        return self.props.session_status == KolibriContext.SESSION_STATUS_ERROR

    def get_session_status_is_setup(self) -> bool:
        return self.props.session_status == KolibriContext.SESSION_STATUS_SETUP

    def get_session_status_is_ready(self) -> bool:
        return self.props.session_status == KolibriContext.SESSION_STATUS_READY


class KolibriContext(BaseKolibriContext):
    """
    Keeps track of global context related to accessing Kolibri over HTTP. A
    single KolibriContext object is shared between all Application,
    KolibriWindow, and KolibriWebView objects. Generates a WebKit.WebContext
    with the appropriate cookies to enable Kolibri's app mode and to log in as
    the correct user. Use the session-status property or kolibri-ready signal to
    determine whether Kolibri is ready to use.
    """

    __webkit_network_session: WebKit.NetworkSession
    __kolibri_daemon: KolibriDaemonManager
    __setup_helper: _KolibriSetupHelper

    __is_own_kolibri_daemon: bool
    __property_watchers: list[PropertyWatcher]
    __download_started_handler_id: int

    __gsignals__ = {
        "open-setup-wizard": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(
        self,
        kolibri_daemon: typing.Optional[KolibriDaemonManager] = None,
        ephemeral: bool = False,
        require_is_device_provisioned: bool = True,
    ):
        super().__init__()

        self.__property_watchers = []

        if kolibri_daemon:
            self.__is_own_kolibri_daemon = False
            self.__kolibri_daemon = kolibri_daemon
        else:
            self.__is_own_kolibri_daemon = True
            self.__kolibri_daemon = KolibriDaemonManager()

        if ephemeral:
            self.__webkit_network_session = WebKit.NetworkSession.new_ephemeral()
        else:
            self.__webkit_network_session = WebKit.NetworkSession()

        self.__setup_helper = _KolibriSetupHelper(
            self.__webkit_network_session,
            self.__kolibri_daemon,
            require_is_device_provisioned=require_is_device_provisioned,
        )

    @property
    def kolibri_version(self) -> str:
        return self.__kolibri_daemon.kolibri_version

    @property
    def default_url(self) -> str:
        return f"{APP_URI_SCHEME}:/"

    @property
    def webkit_network_session(self) -> WebKit.NetworkSession:
        return self.__webkit_network_session

    @property
    def _kolibri_daemon(self) -> KolibriDaemonManager:
        return self.__kolibri_daemon

    def init(self):
        if self.__is_own_kolibri_daemon:
            self.__kolibri_daemon.init()

        self.__setup_helper.init()

        self.__property_watchers.append(
            PropertyWatcher(
                (self.__kolibri_daemon, "has-error"),
                (self.__kolibri_daemon, "is-started"),
                (self.__kolibri_daemon, "is-device-provisioned"),
                (self.__setup_helper, "is-session-ready"),
            )
            .map(self.__update_session_status)
            .notify()
        )

        self.__download_started_handler_id = bubble_signal(
            self.__webkit_network_session, "download-started", self
        )

    def shutdown(self):
        if self.__is_own_kolibri_daemon:
            self.__kolibri_daemon.shutdown()

        for watcher in self.__property_watchers:
            watcher.disconnect()
        self.__property_watchers = []
        self.__setup_helper.shutdown()

        self.__webkit_network_session.disconnect(self.__download_started_handler_id)
        self.__download_started_handler_id = 0

    def start_session_setup(self):
        self.__setup_helper.start_session_setup()

    def get_absolute_url(self, url: str) -> typing.Optional[str]:
        url_tuple = urlsplit(url)
        if url_tuple.scheme == KOLIBRI_URI_SCHEME:
            target_url = self.parse_kolibri_url_tuple(url_tuple)
            return self.__kolibri_daemon.get_absolute_url(target_url)
        elif url_tuple.scheme == APP_URI_SCHEME:
            target_url = self.parse_x_kolibri_app_url_tuple(url_tuple)
            return self.__kolibri_daemon.get_absolute_url(target_url)
        return url

    def kolibri_api_get(self, *args, **kwargs) -> typing.Any:
        return self.__kolibri_daemon.kolibri_api_get(*args, **kwargs)

    def kolibri_api_get_async(self, *args, **kwargs):
        self.__kolibri_daemon.kolibri_api_get_async(*args, **kwargs)

    def is_url_for_kolibri_app(self, url: str) -> bool:
        if not self.__kolibri_daemon.is_url_in_scope(url):
            return False

        url_tuple = urlsplit(url)
        url_path = url_tuple.path.lstrip("/")

        return not (
            url_path.startswith("static/") or url_path.startswith("content/storage/")
        )

    def is_url_in_scope(self, url: str) -> bool:
        return self.is_url_for_kolibri_app(url)

    def get_debug_info(self) -> dict:
        # FIXME: It would be better to call `get_app_modules_debug_info()` from`
        #        the kolibri_daemon service and include the output here. In some
        #        rare cases, its Python environment may differ.
        return {
            "app": {
                "project_version": PROJECT_VERSION,
                "vcs_tag": VCS_TAG,
                "build_profile": BUILD_PROFILE,
                "do_automatic_login": self.__kolibri_daemon.do_automatic_login,
            },
            "kolibri_daemon": self.__kolibri_daemon.get_debug_info(),
            "python_modules": get_app_modules_debug_info(),
        }

    def __update_session_status(
        self,
        has_error: bool,
        is_started: bool,
        is_device_provisioned: bool,
        is_session_ready: bool,
    ):
        if has_error:
            if self.props.session_status != KolibriContext.SESSION_STATUS_ERROR:
                self.props.session_status = KolibriContext.SESSION_STATUS_ERROR
        elif is_started and is_session_ready:
            if self.props.session_status != KolibriContext.SESSION_STATUS_READY:
                self.props.session_status = KolibriContext.SESSION_STATUS_READY
                self.emit("kolibri-ready")
        elif is_started and not is_device_provisioned:
            if self.props.session_status != KolibriContext.SESSION_STATUS_SETUP:
                self.props.session_status = KolibriContext.SESSION_STATUS_SETUP
                self.emit("open-setup-wizard")
        else:
            if self.props.session_status != KolibriContext.SESSION_STATUS_STOPPED:
                self.props.session_status = KolibriContext.SESSION_STATUS_STOPPED


class _KolibriSetupHelper(GObject.GObject):
    """
    Helper to set up a Kolibri web session. This helper communicates with the
    Kolibri web service and with kolibri-daemon to create an "app mode" cookie,
    and logs in as the desktop user through the login token mechanism. If
    Kolibri has not been set up, it will automatically create a facility.
    """

    __webkit_network_session: WebKit.NetworkSession
    __kolibri_daemon: KolibriDaemonManager
    __cookies_to_add: set

    __require_is_device_provisioned: bool
    __property_watchers: list[PropertyWatcher]

    INITIALIZE_API_PATH = "/app/api/initialize"

    auth_token = GObject.Property(type=str, default=None)
    is_auth_token_ready = GObject.Property(type=bool, default=False)
    is_cookie_manager_ready = GObject.Property(type=bool, default=False)
    is_session_ready = GObject.Property(type=bool, default=False)

    def __init__(
        self,
        webkit_network_session: WebKit.NetworkSession,
        kolibri_daemon: KolibriDaemonManager,
        require_is_device_provisioned: bool = True,
    ):
        GObject.GObject.__init__(self)

        self.__require_is_device_provisioned = require_is_device_provisioned
        self.__property_watchers = []

        self.__webkit_network_session = webkit_network_session
        self.__kolibri_daemon = kolibri_daemon

    def init(self):
        await_device_provisioned = (
            [
                (self.__kolibri_daemon, "is-device-provisioned"),
            ]
            if self.__require_is_device_provisioned
            else []
        )

        self.__property_watchers.append(
            PropertyWatcher(
                (self.__kolibri_daemon, "is-started"),
                *await_device_provisioned,
            )
            .all(self.__update_auth_token)
            .notify()
        )

        self.__property_watchers.append(
            PropertyWatcher(
                (self.__kolibri_daemon, "app-key"),
                (self.__kolibri_daemon, "is-started"),
                (self, "is-auth-token-ready"),
                *await_device_provisioned,
            )
            .all(self.__initialize_kolibri_session)
            .notify()
        )

        self.__property_watchers.append(
            PropertyWatcher(
                (self, "is-cookie-manager-ready"),
                *await_device_provisioned,
            )
            .map(self.__update_is_session_ready)
            .notify()
        )

    def shutdown(self):
        for watcher in self.__property_watchers:
            watcher.disconnect()
        self.__property_watchers = []

    def __update_auth_token(self, *args):
        # Reset the auth token cookie; it is no longer valid
        self.props.is_cookie_manager_ready = False

        if not self.__kolibri_daemon.do_automatic_login:
            self.props.auth_token = None
            self.props.is_auth_token_ready = True
            return

        self.props.auth_token = None
        self.props.is_auth_token_ready = False
        self.__kolibri_daemon.get_login_token(
            self.__kolibri_daemon_on_get_login_token_ready
        )

    def __kolibri_daemon_on_get_login_token_ready(
        self, kolibri_daemon: KolibriDaemonManager, login_token: typing.Optional[str]
    ):
        self.props.auth_token = login_token
        self.props.is_auth_token_ready = True

    def __initialize_kolibri_session(self, app_key: str, *args):
        if (
            not self.__kolibri_daemon.do_automatic_login
            and not self.__require_is_device_provisioned
        ):
            # Skip session initialize completely if automatic login and
            # require_is_device_provisioned is False. This works around an issue
            # where Kolibri's initial setup wizard fails to create an initial
            # user account if an app session has been created.
            self.props.is_cookie_manager_ready = True
            return

        initialize_query = {}
        if self.props.auth_token:
            initialize_query["auth_token"] = self.props.auth_token

        self.__kolibri_daemon.kolibri_api_get_async(
            f"{self.INITIALIZE_API_PATH}/{app_key}?{urlencode(initialize_query)}",
            self.__on_kolibri_initialize_api_ready,
            flags=Soup.MessageFlags.NO_REDIRECT,
            parse_json=False,
        )

    def __on_kolibri_initialize_api_ready(
        self, data: typing.Any, soup_message: Soup.Message = None
    ):
        self.__copy_cookies_from_soup_message_response(soup_message)

    def __copy_cookies_from_soup_message_response(self, soup_message: Soup.Message):
        cookie_manager = self.__webkit_network_session.get_cookie_manager()
        cookie_manager.replace_cookies(
            Soup.cookies_from_response(soup_message),
            None,
            self.__on_webkit_replace_cookies_ready,
        )

    def __on_webkit_replace_cookies_ready(self, cookie_manager, result):
        try:
            cookie_manager.replace_cookies_finish(result)
        except GLib.Error as error:
            # Continue anyway; it is better that the app at least mostly works.
            logger.error(f"Error replacing cookies from API response: {error}")

        self.props.is_cookie_manager_ready = True

    def __update_is_session_ready(self, *setup_flags):
        self.props.is_session_ready = all(setup_flags)


class KolibriChannelContext(KolibriContext):
    """
    A KolibriContext subclass that overrides is_url_in_scope in such a way that
    the application will only show content belonging to a particular Kolibri
    channel.
    """

    __channel_id: str

    def __init__(self, channel_id: str):
        super().__init__()

        self.__channel_id = channel_id

    @property
    def default_url(self) -> str:
        return f"{APP_URI_SCHEME}:{self.__default_path}"

    @property
    def is_confined(self) -> bool:
        return True

    @property
    def __default_path(self) -> str:
        return f"{LEARN_PATH_PREFIX}topics/t/{self.__channel_id}"

    def _get_kolibri_library_path(self, search: typing.Optional[str] = None) -> str:
        if search:
            query = {"keywords": search}
            return f"{self.__default_path}/search?{urlencode(query)}"
        else:
            return self.__default_path

    def open_external_url(self, url: str) -> typing.Optional[str]:
        if self.is_url_for_kolibri_app(url):
            # For would-be internal URLs, redirect to the default URL.
            return self.default_url
        else:
            return super().open_external_url(url)

    def is_url_in_scope(self, url: str) -> bool:
        # Allow the user to navigate to login and account management pages, as
        # well as URLs related to file storage and general-purpose APIs, but not
        # to other channels or the channel listing page.

        # TODO: This is costly and complicated. Instead, we should be able to
        #       ask the Kolibri web frontend to avoid showing links outside of
        #       the channel, and target external links to a new window.

        if not self.is_url_for_kolibri_app(url):
            return False

        url_tuple = urlsplit(url)
        url_path = url_tuple.path.lstrip("/")

        if re.match(STATIC_PATHS_RE, url_path):
            return True
        elif re.match(SYSTEM_PATHS_RE, url_path):
            return True
        elif re.match(CONTENT_PATHS_RE, url_path):
            return self.__is_learn_fragment_in_channel(url_tuple.fragment)
        else:
            return False

    def __is_learn_fragment_in_channel(self, fragment: str) -> bool:
        fragment = fragment.lstrip("/")

        if re.match(r"^(resources-unavailable|content-unavailable|search)", fragment):
            return True

        contentnode_id = self.__contentnode_id_for_learn_fragment(fragment)

        if contentnode_id is None:
            return False

        if contentnode_id == self.__channel_id:
            return True

        response = self.kolibri_api_get(f"/api/content/contentnode/{contentnode_id}")

        if not isinstance(response, dict):
            return False

        contentnode_channel = response.get("channel_id")

        return contentnode_channel == self.__channel_id

    def __contentnode_id_for_learn_fragment(
        self, fragment: str
    ) -> typing.Optional[str]:
        pattern = r"^topics\/([ct]\/)?(?P<node_id>\w+)"
        match = re.match(pattern, fragment)
        if match:
            return match.group("node_id")

        return None


class KolibriSetupContext(KolibriContext):
    """
    A KolibriContext that causes the application to only display Kolibri's setup
    UI, at kolibri:/en/setup. It uses another "parent" KolibriContext to provide
    most of its functionality.
    """

    __gsignals__ = {
        "setup-complete": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(self, parent: KolibriContext):
        super().__init__(
            kolibri_daemon=parent._kolibri_daemon,
            ephemeral=True,
            require_is_device_provisioned=False,
        )

    @property
    def default_url(self) -> str:
        return f"{APP_URI_SCHEME}:{SETUP_PATH_PREFIX}"

    @property
    def is_confined(self) -> bool:
        return True

    def is_url_in_scope(self, url: str) -> bool:
        if not self.is_url_for_kolibri_app(url):
            return False

        url_tuple = urlsplit(url)
        url_path = url_tuple.path.lstrip("/")

        if re.match(SETUP_PATHS_RE, url_path):
            return True

        return False

    def __is_url_for_setup_complete(self, url: str) -> bool:
        url_tuple = urlsplit(url)
        url_path = url_tuple.path.lstrip("/")

        if re.match(SETUP_COMPLETE_PATHS_RE, url_path):
            return True

        return False

    def open_external_url(self, url: str) -> typing.Optional[str]:
        if self.__is_url_for_setup_complete(url):
            self.emit("setup-complete")
            return None
        else:
            return super().open_external_url(url)
