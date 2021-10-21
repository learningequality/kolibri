from __future__ import annotations

import logging

logger = logging.getLogger(__name__)

import requests
import typing

from urllib.parse import urlencode
from urllib.parse import urljoin

from gi.repository import GLib
from gi.repository import GObject
from gi.repository import KolibriDaemonDBus

from kolibri_app.config import DAEMON_APPLICATION_ID
from kolibri_app.config import DAEMON_MAIN_OBJECT_PATH


class KolibriDaemonManager(object):
    __on_change_cb: callable = None

    __dbus_proxy: KolibriDaemonDBus.MainProxy = None

    __did_init: bool = False
    __starting_kolibri: bool = False
    __dbus_proxy_has_error: bool = None
    __dbus_proxy_owner: bool = None

    def __init__(self, on_change_cb: callable):
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
        if self.__dbus_proxy.props.app_key and self.__dbus_proxy.props.base_url:
            return self.__dbus_proxy.props.status in ["STARTED"]
        else:
            return False

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

    def get_kolibri_url(self, url: str) -> str:
        if self.__dbus_proxy.props.base_url:
            return urljoin(self.__dbus_proxy.props.base_url, url)
        else:
            return None

    def get_kolibri_initialize_url(self, next_url: str) -> str:
        initialize_url = "app/api/initialize/{key}?{query}".format(
            key=self.__dbus_proxy.props.app_key, query=urlencode({"next": next_url})
        )
        return self.get_kolibri_url(initialize_url)

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
            self.__dbus_proxy.call_hold(callback=self.__dbus_proxy_null_result_handler)

        if self.__starting_kolibri and self.is_started():
            self.__starting_kolibri = False
        elif self.__starting_kolibri:
            pass
        elif not self.is_error() or dbus_proxy_owner_changed:
            self.__starting_kolibri = True
            self.__dbus_proxy.call_start(callback=self.__dbus_proxy_null_result_handler)

        self.__on_dbus_proxy_changed()

    def __dbus_proxy_null_result_handler(
        self, dbus_proxy: KolibriDaemonDBus.MainProxy, result: Gio.AsyncResult
    ):
        if isinstance(result, Exception):
            logging.warning(
                "Error communicating with Kolibri daemon: {}".format(result)
            )
            self.__dbus_proxy_has_error = True
        else:
            self.__dbus_proxy_has_error = False
        self.__on_dbus_proxy_changed()
