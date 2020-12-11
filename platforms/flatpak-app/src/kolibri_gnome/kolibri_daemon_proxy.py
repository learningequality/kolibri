from gi.repository import Gio

from . import config


class KolibriDaemonProxy(object):
    def __init__(self, application):
        self.__application = application
        self.__proxy = Gio.DBusProxy.new_for_bus_sync(
            Gio.BusType.SESSION,
            Gio.DBusProxyFlags.NONE,
            None,
            config.DAEMON_APPLICATION_ID,
            "/org/learningequality/Kolibri/Devel/Daemon",
            "org.learningequality.Kolibri.Daemon",
            None
        )
        self.__proxy.connect("g_properties_changed", self.__on_proxy_g_properties_changed)

    def __on_proxy_g_properties_changed(self, proxy, changed_properties, invalidated_properties):
        print("PROXY PROPERTIES CHANGED")

    @property
    def app_key(self):
        variant = self.__proxy.get_cached_property("AppKey")
        print("get_app_key", variant.get_string())
        return variant.get_string()

    @property
    def base_url(self):
        variant = self.__proxy.get_cached_property("BaseURL")
        print("get_base_url", variant.get_string())
        return variant.get_string()

    @property
    def status(self):
        variant = self.__proxy.get_cached_property("Status")
        print("get_status", variant.get_string())
        return variant.get_string()

    def hold(self):
        print("hold")
        self.__proxy.call_sync("Hold", None, Gio.DBusCallFlags.NONE, -1, None)

    def release(self):
        print("release")
        self.__proxy.call_sync("Release", None, Gio.DBusCallFlags.NONE, -1, None)

    @property
    def is_responding(self):
        return self.get_is_responding()

    def get_is_responding(self):
        print("get_is_responding")
        if not self.base_url or not self.app_key:
            return None
        elif self.status in ["STARTED"]:
            return True
        elif self.status in ["STOPPED", "ERROR"]:
            return False
        else:
            return None

    def await_is_responding(self):
        print("await_is_responding")
        import time
        # FIXME: This is of course terrible and we should subscribe to the
        #        IsReady signal instead.
        while True:
            is_responding = self.get_is_responding()
            if is_responding is None:
                time.sleep(1)
            else:
                return is_responding

    def is_kolibri_app_url(self, url):
        if not self.base_url:
            print("is_kolibri_app_url called but base_url is unset")
            return True

        if callable(url):
            return True

        if not url:
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
        print("get_initialize_url")
        if not self.base_url or not self.app_key:
            print("get_initialize_url called but base_url or app_key are unset")
            return None
        if callable(next_url):
            next_url = next_url()
        return get_kolibri_initialize_url(self.base_url, self.app_key, next_url)

