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

    def get_app_key(self):
        print("get_app_key")
        result = self.__proxy.call_sync("GetAppKey", None, Gio.DBusCallFlags.NONE, -1, None)
        return result[0]

    def get_base_url(self):
        print("get_base_url")
        result = self.__proxy.call_sync("GetBaseURL", None, Gio.DBusCallFlags.NONE, -1, None)
        return result[0]

    def get_status(self):
        result = self.__proxy.call_sync("GetStatus", None, Gio.DBusCallFlags.NONE, -1, None)
        return result[0]

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
        status = self.get_status()
        print("GOT STATUS", status)
        if status == "STARTED":
            return True
        elif status == "ERROR":
            return False
        elif status == "STOPPED":
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
            if is_responding is not None:
                return is_responding
            else:
                time.sleep(1)

    def is_kolibri_app_url(self, url):
        base_url = self.get_base_url()

        if not base_url:
            print("is_kolibri_app_url called but base_url is unset")
            return True

        if not url:
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

    def get_initialize_url(self, next_url):
        print("get_initialize_url")
        base_url = self.get_base_url()
        app_key = self.get_app_key()
        if not base_url or not app_key:
            print("get_initialize_url called but base_url or app_key are unset")
            return None
        return get_kolibri_initialize_url(base_url, app_key, next_url)

