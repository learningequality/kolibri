from __future__ import annotations

import json
import logging
import typing
from functools import partial
from urllib.parse import urljoin

from gi.repository import Gio
from gi.repository import GLib
from gi.repository import GObject
from gi.repository import KolibriDaemonDBus
from gi.repository import Soup
from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH
from kolibri_app.globals import APP_AUTOMATIC_LOGIN

from .utils import GioInputStreamIO

logger = logging.getLogger(__name__)


APP_KEY_COOKIE_NAME = "app_key_cookie"
AUTH_TOKEN_COOKIE_NAME = "app_auth_token_cookie"


class KolibriDaemonManager(GObject.GObject):
    """
    A wrapper for KolibriDaemonDBus.MainProxy which automatically starts and
    stops Kolibri, and provides some helpers to access Kolibri's HTTP API.
    """

    __bus_type: Gio.BusType
    __dbus_proxy: KolibriDaemonDBus.MainProxy

    __did_init: bool = False
    __dbus_proxy_owner: typing.Optional[str] = None

    __soup_session: Soup.Session = None
    __soup_cookie_jar: Soup.CookieJar = None
    __last_status: typing.Optional[str] = None

    is_stopped = GObject.Property(type=bool, default=False)
    is_started = GObject.Property(type=bool, default=False)
    has_error = GObject.Property(type=bool, default=False)
    base_url = GObject.Property(type=str, default=None)
    app_key = GObject.Property(type=str, default=None)

    __gsignals__ = {
        "dbus-owner-changed": (GObject.SIGNAL_RUN_FIRST, None, ()),
    }

    def __init__(self):
        GObject.GObject.__init__(self)

        self.__bus_type = KolibriDaemonDBus.get_default_bus_type()

        self.__dbus_proxy = KolibriDaemonDBus.MainProxy(
            g_bus_type=self.__bus_type,
            g_name=DAEMON_APPLICATION_ID,
            g_object_path=DAEMON_MAIN_OBJECT_PATH,
            g_interface_name=KolibriDaemonDBus.main_interface_info().name,
        )

        self.__soup_session = Soup.Session.new()
        self.__soup_cookie_jar = Soup.CookieJar.new()
        self.__soup_session.add_feature(self.__soup_cookie_jar)

        self.__dbus_proxy.connect(
            "notify::g-name-owner", self.__dbus_proxy_on_notify_g_name_owner
        )
        self.__dbus_proxy.connect("notify", self.__dbus_proxy_on_notify)

        self.connect("notify::is-stopped", self.__on_notify_is_stopped)

    @property
    def do_automatic_login(self) -> bool:
        return APP_AUTOMATIC_LOGIN

    @property
    def kolibri_version(self) -> str:
        return self.__dbus_proxy.props.kolibri_version

    def init(self):
        if self.__did_init:
            return

        self.__dbus_proxy.init_async(
            GLib.PRIORITY_DEFAULT, None, self.__dbus_proxy_on_init
        )
        self.__did_init = True

    def shutdown(self):
        if self.__dbus_proxy.get_name_owner():
            try:
                self.__dbus_proxy.call_release_sync()
            except GLib.Error as error:
                logger.warning(
                    "Error calling Kolibri daemon release: {error}".format(error=error)
                )

    def is_url_in_scope(self, url: str) -> bool:
        return self.__is_base_url(url) or self.__is_extra_url(url)

    def __is_base_url(self, url: str) -> bool:
        base_url = self.__dbus_proxy.props.base_url
        return base_url and url.startswith(base_url)

    def __is_extra_url(self, url: str) -> bool:
        extra_url = self.__dbus_proxy.props.extra_url
        return extra_url and url.startswith(extra_url)

    def get_absolute_url(self, url: str = "") -> typing.Optional[str]:
        if self.is_url_in_scope(url):
            return url
        elif self.__dbus_proxy.props.base_url:
            return urljoin(self.__dbus_proxy.props.base_url, url)
        else:
            return None

    def get_debug_info(self) -> dict:
        return {
            "g_bus_type": self.__bus_type.value_name,
            "status": self.__dbus_proxy.props.status,
            "base_url": self.__dbus_proxy.props.base_url,
            "kolibri_home": self.__dbus_proxy.props.kolibri_home,
            "kolbri_version": self.__dbus_proxy.props.kolibri_version,
        }

    def kolibri_api_get(self, path: str) -> typing.Any:
        url = self.get_absolute_url(path)

        if not url:
            return None

        soup_message = Soup.Message.new("GET", url)
        stream = self.__soup_session.send(soup_message, None)
        return _read_json_from_input_stream(stream)

    def kolibri_api_get_async(self, path: str, result_cb: typing.Callable, **kwargs):
        self.__kolibri_api_call_async(path, "GET", result_cb, **kwargs)

    def kolibri_api_post_async(
        self,
        path: str,
        result_cb: typing.Callable,
        request_body: typing.Optional[dict] = None,
        **kwargs,
    ):
        self.__kolibri_api_call_async(path, "POST", result_cb, request_body, **kwargs)

    def __request_body_object_to_bytes(self, request_body: dict):
        return bytes(json.dumps(request_body), "utf8")

    def __kolibri_api_call_async(
        self,
        path: str,
        method: str,
        result_cb: typing.Callable,
        request_body: typing.Optional[dict] = None,
        flags: Soup.MessageFlags = None,
        parse_json: bool = True,
    ):
        url = self.get_absolute_url(path)

        if not url:
            # FIXME: It would be better to raise an exception, and
            # handle it in the other side to set SESSION_STATUS_ERROR.
            result_cb(None)
            return

        soup_message = Soup.Message.new(method, url)

        if flags is not None:
            soup_message.add_flags(flags)

        if request_body is not None:
            soup_message.set_request_body_from_bytes(
                "application/json",
                GLib.Bytes(self.__request_body_object_to_bytes(request_body)),
            )

        self.__soup_session.send_async(
            soup_message,
            GLib.PRIORITY_DEFAULT,
            None,
            partial(
                self.__kolibri_api_get_async_on_soup_send,
                result_cb=result_cb,
                soup_message=soup_message,
                parse_json=parse_json,
            ),
        )

    def __kolibri_api_get_async_on_soup_send(
        self,
        session: Soup.Session,
        result: Gio.AsyncResult,
        result_cb: typing.Callable,
        soup_message: Soup.Message,
        parse_json: bool = True,
    ):
        # On HTTP client (4xx) or server (5xx) errors:
        if soup_message.get_status() >= Soup.Status.BAD_REQUEST:
            # FIXME: It would be better to raise an exception, and
            # handle it in the other side to set SESSION_STATUS_ERROR.
            logger.warning(f"Error calling Kolibri API: {soup_message.get_status()}")
            result_cb(None, soup_message=soup_message)
            return

        stream = session.send_finish(result)

        if parse_json:
            data = _read_json_from_input_stream(stream)
        else:
            data = None

        result_cb(data, soup_message=soup_message)

    def get_login_token(self, login_token_ready_cb: typing.Callable):
        self.__dbus_proxy.GetLoginToken(
            result_handler=self.__dbus_proxy_login_token_result_handler,
            user_data=login_token_ready_cb,
        )

    def __dbus_proxy_login_token_result_handler(
        self,
        dbus_proxy: KolibriDaemonDBus.MainProxy,
        result: typing.Any,
        login_token_ready_cb: typing.Callable,
    ):
        if isinstance(result, Exception):
            logger.warning("Error creating login token: {}".format(result))
            login_token_ready_cb(self, None)
        else:
            login_token_ready_cb(self, result)

    def __dbus_proxy_on_init(self, source: GLib.Object, result: Gio.AsyncResult):
        try:
            self.__dbus_proxy.init_finish(result)
        except GLib.Error as error:
            logger.warning(
                "Error initializing Kolibri daemon proxy: {error}".format(error=error)
            )
            self.props.has_error = True
        else:
            self.__dbus_proxy_on_notify_g_name_owner(self.__dbus_proxy)

    def __dbus_proxy_on_notify_g_name_owner(
        self,
        dbus_proxy: KolibriDaemonDBus.MainProxy,
        param_spec: GObject.ParamSpec = None,
    ):
        dbus_proxy_owner = dbus_proxy.get_name_owner()
        dbus_proxy_owner_changed = bool(self.__dbus_proxy_owner != dbus_proxy_owner)
        self.__dbus_proxy_owner = dbus_proxy_owner

        if dbus_proxy_owner_changed:
            dbus_proxy.Hold(result_handler=self.__dbus_proxy_default_result_handler)
            self.__last_status = None
            self.emit("dbus-owner-changed")

    def __dbus_proxy_on_notify(
        self, dbus_proxy: KolibriDaemonDBus.MainProxy, param_spec: GObject.ParamSpec
    ):
        if dbus_proxy.props.status != self.__last_status:
            self.__update_from_status_text(dbus_proxy.props.status)
            self.__last_status = dbus_proxy.props.status

        if self.props.base_url != dbus_proxy.props.base_url:
            self.props.base_url = dbus_proxy.props.base_url

        if self.props.app_key != dbus_proxy.props.app_key:
            self.props.app_key = dbus_proxy.props.app_key

    def __update_from_status_text(self, status):
        self.props.is_stopped = status in ("STOPPED", "")
        self.props.is_started = status == "STARTED"
        self.props.has_error = status == "ERROR"

    def __on_notify_is_stopped(
        self, kolibri_daemon: KolibriDaemonManager, pspec: GObject.ParamSpec
    ):
        if kolibri_daemon.props.is_stopped:
            self.__dbus_proxy.Start(
                result_handler=self.__dbus_proxy_default_result_handler
            )

    def __dbus_proxy_default_result_handler(
        self,
        dbus_proxy: KolibriDaemonDBus.MainProxy,
        result: typing.Any,
        user_data: typing.Any = None,
    ):
        if isinstance(result, Exception):
            logger.warning("Error communicating with Kolibri daemon: {}".format(result))
            self.props.has_error = True


def _read_json_from_input_stream(stream: Gio.InputStream):
    stream_io = GioInputStreamIO(stream)

    try:
        return json.load(stream_io)
    except json.JSONDecodeError as error:
        logger.warning(
            "Error reading Kolibri API response: {error}".format(error=error)
        )
        return None
