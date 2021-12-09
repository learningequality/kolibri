from __future__ import annotations

import logging
import re
import typing
from gettext import gettext as _
from pathlib import Path
from urllib.parse import parse_qs
from urllib.parse import SplitResult
from urllib.parse import urlsplit

from gi.repository import GLib
from gi.repository import GObject
from gi.repository import Gtk
from gi.repository import WebKit2
from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES
from kolibri_app.config import DATA_DIR
from kolibri_app.config import FRONTEND_APPLICATION_ID
from langcodes import closest_supported_match

from .kolibri_daemon_manager import KolibriDaemonManager
from .utils import await_properties
from .utils import get_localized_file
from .utils import map_properties

logger = logging.getLogger(__name__)


class KolibriContext(GObject.GObject):
    """
    Keeps track of global context related to accessing Kolibri over HTTP. A
    single KolibriContext object is shared between all Application,
    KolibriWindow, and KolbriWebView objects. Generates a WebKit2.WebContext
    with the appropriate cookies to enable Kolibri's app mode and to log in as
    the correct user. Use the session-status property or kolibri-ready signal to
    determine whether Kolibri is ready to use.
    """

    __webkit_web_context: WebKit2.WebContext
    __kolibri_daemon: KolibriDaemonManager
    __setup_helper: _KolibriSetupHelper
    __loader_url: str

    SESSION_STATUS_LOADING = 0
    SESSION_STATUS_READY = 1
    SESSION_STATUS_ERROR = 2

    session_status = GObject.Property(type=int, default=SESSION_STATUS_LOADING)

    __gsignals__ = {
        "kolibri-ready": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(self):
        GObject.GObject.__init__(self)

        cache_dir = Path(GLib.get_user_cache_dir(), FRONTEND_APPLICATION_ID)
        data_dir = Path(GLib.get_user_data_dir(), FRONTEND_APPLICATION_ID)

        website_data_manager = WebKit2.WebsiteDataManager(
            base_cache_directory=cache_dir.as_posix(),
            base_data_directory=data_dir.as_posix(),
        )

        loader_path = get_localized_file(
            Path(DATA_DIR, "assets", "_load-{}.html").as_posix(),
            Path(DATA_DIR, "assets", "_load.html"),
        )
        self.__loader_url = loader_path.as_uri()

        self.__webkit_web_context = WebKit2.WebContext(
            website_data_manager=website_data_manager
        )
        self.__kolibri_daemon = KolibriDaemonManager()
        self.__setup_helper = _KolibriSetupHelper(
            self.__webkit_web_context, self.__kolibri_daemon
        )

        map_properties(
            [
                (self.__kolibri_daemon, "has-error"),
                (self.__setup_helper, "is-cookie-ready"),
                (self.__setup_helper, "is-login-ready"),
                (self.__setup_helper, "is-facility-ready"),
            ],
            self.__update_session_status,
        )

    @property
    def default_url(self) -> str:
        return "x-kolibri-app:/"

    @property
    def webkit_web_context(self) -> WebKit2.WebContext:
        return self.__webkit_web_context

    def init(self):
        self.__kolibri_daemon.init()

    def shutdown(self):
        self.__kolibri_daemon.shutdown()

    def get_absolute_url(self, url: str) -> typing.Optional[str]:
        url_tuple = urlsplit(url)
        if url_tuple.scheme == "kolibri":
            target_url = self.parse_kolibri_url_tuple(url_tuple)
            return self.__kolibri_daemon.get_absolute_url(target_url)
        elif url_tuple.scheme == "x-kolibri-app":
            target_url = self.parse_x_kolibri_app_url_tuple(url_tuple)
            return self.__kolibri_daemon.get_absolute_url(target_url)
        return url

    def kolibri_api_get(self, *args, **kwargs) -> typing.Any:
        return self.__kolibri_daemon.kolibri_api_get(*args, **kwargs)

    def kolibri_api_get_async(self, *args, **kwargs):
        self.__kolibri_daemon.kolibri_api_get_async(*args, **kwargs)

    def should_load_url(self, url: str) -> bool:
        return (
            url == self.default_url
            or urlsplit(url).scheme in ("kolibri", "x-kolibri-app", "about")
            or self.is_url_in_scope(url)
        )

    def default_is_url_in_scope(self, url: str) -> bool:
        if not self.__kolibri_daemon.is_absolute_url(url):
            return False

        base_url = self.__kolibri_daemon.get_absolute_url()

        if not base_url:
            return False

        return not (
            url.startswith(base_url + "static/")
            or url.startswith(base_url + "downloadcontent/")
            or url.startswith(base_url + "content/storage/")
        )

    def is_url_in_scope(self, url: str) -> bool:
        return self.default_is_url_in_scope(url)

    def get_loader_url(self, state: str) -> str:
        return self.__loader_url + "#" + state

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

    def __update_session_status(
        self,
        has_error: bool,
        is_cookie_ready: bool,
        is_login_ready: bool,
        is_facility_ready: bool,
    ):
        if has_error:
            self.props.session_status = KolibriContext.SESSION_STATUS_ERROR
        elif is_cookie_ready and is_login_ready and is_facility_ready:
            self.props.session_status = KolibriContext.SESSION_STATUS_READY
            self.emit("kolibri-ready")
        else:
            self.props.session_status = KolibriContext.SESSION_STATUS_LOADING


class _KolibriSetupHelper(GObject.GObject):
    """
    Helper to set up a Kolibri web session. This helper communicates with the
    Kolibri web service and with kolibri-daemon to create an "app mode" cookie,
    and logs in as the desktop user through the login token mechanism. If
    Kolibri has not been set up, it will automatically create a facility or emit
    the "requires-user-interaction" signal to begin showing the setup wizard in
    a dialog.
    """

    __webkit_web_context: WebKit2.WebContext
    __kolibri_daemon: KolibriDaemonManager

    __login_webview: WebKit2.WebView

    login_token = GObject.Property(type=str, default=None)

    AUTOLOGIN_URL_TEMPLATE = "kolibri_desktop_auth_plugin/login/{token}"

    is_cookie_ready = GObject.Property(type=bool, default=False)
    is_login_ready = GObject.Property(type=bool, default=False)
    is_facility_ready = GObject.Property(type=bool, default=False)

    __gsignals__ = {
        "requires-user-interaction": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(
        self,
        webkit_web_context: WebKit2.WebContext,
        kolibri_daemon: KolibriDaemonManager,
    ):
        GObject.GObject.__init__(self)

        self.__webkit_web_context = webkit_web_context
        self.__kolibri_daemon = kolibri_daemon

        self.__login_webview = WebKit2.WebView(web_context=self.__webkit_web_context)
        self.__login_webview.connect(
            "load-changed", self.__login_webview_on_load_changed
        )

        self.__kolibri_daemon.connect(
            "dbus-owner-changed", self.__kolibri_daemon_on_dbus_owner_changed
        )
        self.__kolibri_daemon.connect(
            "notify::app-key-cookie", self.__kolibri_daemon_on_notify_app_key_cookie
        )
        self.__kolibri_daemon.connect(
            "notify::is-started", self.__kolibri_daemon_on_notify_is_started
        )

        await_properties(
            [
                (self, "login-token"),
                (self, "is-facility-ready"),
                (self.__kolibri_daemon, "is-started"),
            ],
            self.__on_await_login_token_and_kolibri_is_started,
        )

        self.__kolibri_daemon_on_notify_app_key_cookie(self.__kolibri_daemon)

    def __login_webview_on_load_changed(
        self, webview: WebKit2.WebView, load_event: WebKit2.LoadEvent
    ):
        # Show the main webview once it finishes loading.
        if load_event == WebKit2.LoadEvent.FINISHED:
            self.props.is_login_ready = True
            self.props.login_token = None

    def __kolibri_daemon_on_dbus_owner_changed(
        self, kolibri_daemon: KolibriDaemonManager
    ):
        self.props.is_login_ready = False

        kolibri_daemon.get_login_token(self.__kolibri_daemon_on_login_token_ready)

    def __kolibri_daemon_on_notify_is_started(
        self, kolibri_daemon: KolibriDaemonManager, pspec: GObject.ParamSpec = None
    ):
        self.props.is_facility_ready = False

        if not self.__kolibri_daemon.props.is_started:
            return

        self.__kolibri_daemon.kolibri_api_get_async(
            "/api/public/v1/facility/",
            result_cb=self.__on_kolibri_api_facility_response,
        )

    def __on_kolibri_api_facility_response(self, data: typing.Any):
        if isinstance(data, list) and data:
            self.props.is_facility_ready = True
            return

        # There is no facility, so automatically provision the device:
        self.__automatic_device_provision()

    def __automatic_device_provision(self):
        logger.info("Provisioning device…")
        language_id = self.__get_closest_system_kolibri_language()
        request_body_data = {
            "language_id": language_id,
            "facility": {"name": _("Kolibri at home")},
            "preset": "nonformal",
            "superuser": None,
            "device_name": _("Kolibri at home"),
            "device_name": "Kolibri at home",
            "settings": {},
            "allow_guest_access": "",
        }
        self.__kolibri_daemon.kolibri_api_post_async(
            "/api/device/deviceprovision/",
            result_cb=self.__on_kolibri_api_deviceprovision_response,
            request_body=request_body_data,
        )

    def __on_kolibri_api_deviceprovision_response(self, data: dict):
        logger.info("Device provisioned.")
        self.props.is_facility_ready = True

    def __get_closest_system_kolibri_language(self):
        system_language = Gtk.get_default_language().to_string()
        return closest_supported_match(system_language, KOLIBRI_SUPPORTED_LANGUAGES)

    def __on_await_login_token_and_kolibri_is_started(
        self, login_token: str, is_facility_ready: bool, is_started: bool
    ):
        if self.props.is_login_ready:
            return

        login_url = self.__kolibri_daemon.get_absolute_url(
            self.AUTOLOGIN_URL_TEMPLATE.format(token=login_token)
        )

        self.__login_webview.load_uri(login_url)

    def __kolibri_daemon_on_login_token_ready(
        self, kolibri_daemon: KolibriDaemonManager, login_token: typing.Optional[str]
    ):
        self.props.login_token = login_token

    def __kolibri_daemon_on_notify_app_key_cookie(
        self, kolibri_daemon: KolibriDaemonManager, pspec: GObject.ParamSpec = None
    ):
        self.props.is_cookie_ready = False

        if not self.__kolibri_daemon.props.app_key_cookie:
            return

        cookie_manager = self.__webkit_web_context.get_cookie_manager()
        cookie_manager.add_cookie(
            self.__kolibri_daemon.props.app_key_cookie,
            None,
            self.__on_cookie_ready,
        )

    def __on_cookie_ready(self, cookie_manager, result):
        self.props.is_cookie_ready = True


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
        return "x-kolibri-app:/learn#topics/{channel_id}".format(
            channel_id=self.__channel_id
        )

    def is_url_in_scope(self, url: str) -> bool:
        # Allow the user to navigate to login and account management pages, as
        # well as URLs related to file storage and general-purpose APIs, but not
        # to other channels or the channel listing page.

        # TODO: This is costly and complicated. Instead, we should be able to
        #       ask the Kolibri web frontend to avoid showing links outside of
        #       the channel, and any such links in a new window.

        if not super().is_url_in_scope(url):
            return False

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

        if contentnode_id == self.__channel_id:
            return True

        response = self.kolibri_api_get(
            "/api/content/contentnode/{contentnode_id}".format(
                contentnode_id=contentnode_id
            )
        )

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
