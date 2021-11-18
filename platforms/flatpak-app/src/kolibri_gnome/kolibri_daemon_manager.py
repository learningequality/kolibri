from __future__ import annotations

import logging
import typing
from urllib.parse import urlencode
from urllib.parse import urljoin
from urllib.parse import urlsplit

import requests
from gi.repository import Gio
from gi.repository import GLib
from gi.repository import GObject
from gi.repository import KolibriDaemonDBus
from gi.repository import Soup

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH

logger = logging.getLogger(__name__)


AUTOLOGIN_URL_TEMPLATE = "kolibri_desktop_auth_plugin/login/{token}?{query}"
INITIALIZE_URL_TEMPLATE = "app/api/initialize/{key}?{query}"

APP_KEY_COOKIE_NAME = "app_key_cookie"


class KolibriDaemonManager(object):
    __on_change_cb: OnChangeCallback

    __dbus_proxy: KolibriDaemonDBus.MainProxy

    __did_init: bool = False
    __starting_kolibri: bool = False
    __dbus_proxy_has_error: bool = False
    __dbus_proxy_owner: typing.Optional[str] = None
    __login_token: typing.Optional[str] = None

    class OnChangeCallback(typing.Protocol):
        def __call__(self):
            pass

    def __init__(self, on_change_cb: OnChangeCallback):
        self.__on_change_cb = on_change_cb
        self.__dbus_proxy = KolibriDaemonDBus.MainProxy(
            g_bus_type=KolibriDaemonDBus.get_default_bus_type(),
            g_name=DAEMON_APPLICATION_ID,
            g_object_path=DAEMON_MAIN_OBJECT_PATH,
            g_interface_name=KolibriDaemonDBus.main_interface_info().name,
        )

    def init_kolibri_daemon(self):
        if self.__did_init:
            return

        self.__dbus_proxy.init_async(
            GLib.PRIORITY_DEFAULT, None, self.__dbus_proxy_on_init
        )
        self.__did_init = True

    def stop_kolibri_daemon(self):
        if self.__dbus_proxy.get_name_owner():
            try:
                self.__dbus_proxy.call_release_sync()
            except GLib.Error as error:
                logger.warning(
                    "Error calling Kolibri daemon release: {error}".format(error=error)
                )

    def is_started(self) -> bool:
        return (
            self.__dbus_proxy.props.app_key
            and self.__dbus_proxy.props.base_url
            and self.__login_token is not None
            and self.__dbus_proxy.props.status == "STARTED"
        )

    def is_loading(self) -> bool:
        return not self.is_started()

    def is_error(self) -> bool:
        return self.__dbus_proxy_has_error or self.__dbus_proxy.props.status in [
            "ERROR"
        ]

    def is_kolibri_url(self, url: str) -> bool:
        base_url = self.__dbus_proxy.props.base_url
        if not url or not base_url:
            return False
        elif not url.startswith(base_url):
            return False
        elif url.startswith(base_url + "static/"):
            return False
        elif url.startswith(base_url + "downloadcontent/"):
            return False
        elif url.startswith(base_url + "content/storage/"):
            return False
        else:
            return True

    def get_kolibri_url(self, url: str) -> typing.Optional[str]:
        if self.__dbus_proxy.props.base_url:
            return urljoin(self.__dbus_proxy.props.base_url, url)
        else:
            return None

    def get_app_key_cookie(self) -> typing.Optional[Soup.Cookie]:
        if not self.__dbus_proxy.props.app_key or not self.__dbus_proxy.props.base_url:
            return None

        url_tuple = urlsplit(self.__dbus_proxy.props.base_url)

        return Soup.Cookie.new(
            name=APP_KEY_COOKIE_NAME,
            value=self.__dbus_proxy.props.app_key,
            domain=url_tuple.netloc,
            path="",
            max_age=-1,
        )

    def get_kolibri_initialize_url(self, next_url: str) -> typing.Optional[str]:
        return self.get_kolibri_url(
            AUTOLOGIN_URL_TEMPLATE.format(
                token=self.__login_token, query=urlencode({"next": next_url})
            )
        )

    def kolibri_api_get(self, path: str, *args, **kwargs) -> typing.Any:
        url = self.get_kolibri_url(path)
        if url:
            request = requests.get(url, *args, **kwargs)
        else:
            logger.debug("Skipping Kolibri API request: Kolibri is not ready")
            return None

        try:
            return request.json()
        except ValueError as error:
            logger.info(
                "Error reading Kolibri API response: {error}".format(error=error)
            )
            return None

    def __on_dbus_proxy_changed(self):
        self.__on_change_cb()

    def __dbus_proxy_on_init(self, source: GLib.Object, result: Gio.AsyncResult):
        try:
            self.__dbus_proxy.init_finish(result)
        except GLib.Error as error:
            logger.warning(
                "Error initializing Kolibri daemon proxy: {error}".format(error=error)
            )
            self.__dbus_proxy_has_error = True
            self.__on_dbus_proxy_changed()
        else:
            self.__dbus_proxy_has_error = False
            self.__dbus_proxy.connect("notify", self.__dbus_proxy_on_notify)
            self.__dbus_proxy_on_notify(self.__dbus_proxy, None)

    def __dbus_proxy_login_token_result_handler(
        self,
        dbus_proxy: KolibriDaemonDBus.MainProxy,
        result: typing.Any,
        user_data: typing.Any = None,
    ):
        if isinstance(result, Exception):
            logging.warning(
                "Error communicating with Kolibri daemon: {}".format(result)
            )
            self.__dbus_proxy_has_error = True
            self.__login_token = None
        else:
            self.__dbus_proxy_has_error = False
            self.__login_token = result
        self.__on_dbus_proxy_changed()

    def __dbus_proxy_on_notify(
        self, dbus_proxy: KolibriDaemonDBus.MainProxy, param_spec: GObject.ParamSpec
    ):
        if self.__dbus_proxy_has_error:
            return

        dbus_proxy_owner = dbus_proxy.get_name_owner()
        dbus_proxy_owner_changed = bool(self.__dbus_proxy_owner != dbus_proxy_owner)
        self.__dbus_proxy_owner = dbus_proxy_owner

        if dbus_proxy_owner_changed:
            self.__starting_kolibri = False
            self.__dbus_proxy.Hold(result_handler=self.__dbus_proxy_null_result_handler)

        if self.__login_token is None and self.__dbus_proxy.props.status == "STARTED":
            self.__dbus_proxy.GetLoginToken(
                result_handler=self.__dbus_proxy_login_token_result_handler
            )
        elif (
            self.__login_token is not None
            and self.__dbus_proxy.props.status != "STARTED"
        ):
            # Invalidate the token if it was obtained before but now
            # the daemon switched to a different status. So it can be
            # obtained again if the status goes back to STARTED:
            self.__login_token = None

        if self.__starting_kolibri and self.is_started():
            self.__starting_kolibri = False
        elif self.__starting_kolibri:
            pass
        elif not self.is_error() or dbus_proxy_owner_changed:
            self.__starting_kolibri = True
            self.__dbus_proxy.Start(
                result_handler=self.__dbus_proxy_null_result_handler
            )

        self.__on_dbus_proxy_changed()

    def __dbus_proxy_null_result_handler(
        self,
        dbus_proxy: KolibriDaemonDBus.MainProxy,
        result: typing.Any,
        user_data: typing.Any = None,
    ):
        if isinstance(result, Exception):
            logging.warning(
                "Error communicating with Kolibri daemon: {}".format(result)
            )
            self.__dbus_proxy_has_error = True
        else:
            self.__dbus_proxy_has_error = False
        self.__on_dbus_proxy_changed()
