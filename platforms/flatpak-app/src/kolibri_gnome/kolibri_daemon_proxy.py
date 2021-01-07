import threading

from gi.repository import Gio

from . import config


class KolibriDaemonProxy(object):
    def __init__(self, application, bus_type):
        self.__application = application
        self.__proxy = Gio.DBusProxy.new_for_bus_sync(
            bus_type,
            Gio.DBusProxyFlags.NONE,
            None,
            config.DAEMON_APPLICATION_ID,
            "/org/learningequality/Kolibri/Devel/Daemon",
            "org.learningequality.Kolibri.Daemon",
            None,
        )
        self.__is_ready_event = threading.Event()
        self.__is_ready_value = None
        self.__proxy.connect(
            "g_properties_changed", self.__on_proxy_g_properties_changed
        )
        self.__update_is_ready_event()

    def __on_proxy_g_properties_changed(
        self, proxy, changed_properties, invalidated_properties
    ):
        self.__update_is_ready_event()

    @property
    def app_key(self):
        variant = self.__proxy.get_cached_property("AppKey")
        return variant.get_string() if variant else None

    @property
    def base_url(self):
        variant = self.__proxy.get_cached_property("BaseURL")
        return variant.get_string() if variant else None

    @property
    def status(self):
        variant = self.__proxy.get_cached_property("Status")
        return variant.get_string() if variant else None

    @property
    def kolibri_home(self):
        variant = self.__proxy.get_cached_property("KolibriHome")
        return variant.get_string() if variant else None

    def hold(self):
        self.__proxy.call_sync("Hold", None, Gio.DBusCallFlags.NONE, -1, None)

    def release(self):
        self.__proxy.call_sync("Release", None, Gio.DBusCallFlags.NONE, -1, None)

    def is_loading(self):
        if not self.app_key or not self.base_url:
            return True
        else:
            return self.status in ["NONE", "STARTING"]

    def is_started(self):
        if self.app_key and self.base_url:
            return self.status in ["STARTED"]
        else:
            return False

    def is_error(self):
        return self.status in ["ERROR"]

    def __update_is_ready_event(self):
        if self.is_started() or self.is_error():
            self.__is_ready_event.set()
        else:
            self.__is_ready_event.clear()

    def await_is_ready(self):
        self.__is_ready_event.wait()
        return self.is_started()

    def is_kolibri_app_url(self, url):
        if callable(url):
            return True

        if not url or not self.base_url:
            return False
        elif not url.startswith(self.base_url):
            return False
        elif url.startswith(self.base_url + "static/"):
            return False
        elif url.startswith(self.base_url + "downloadcontent/"):
            return False
        elif url.startswith(self.base_url + "content/storage/"):
            return False
        else:
            return True

    def get_initialize_url(self, next_url):
        if callable(next_url):
            next_url = next_url()
        return self.__get_kolibri_initialize_url(next_url)

    def __get_kolibri_initialize_url(self, next_url):
        path = "app/api/initialize/{key}".format(key=self.app_key)
        if next_url:
            path += "?next={next_url}".format(next_url=next_url)
        return self.base_url + path.lstrip("/")

