import logging

logger = logging.getLogger(__name__)

from .kolibri_service_main import KolibriServiceMainProcess
from .kolibri_service_monitor import KolibriServiceMonitorProcess
from .kolibri_service_setup import KolibriServiceSetupProcess
from .kolibri_service_stop import KolibriServiceStopProcess


class KolibriServiceManager(object):
    """
    Manages the Kolibri service, starting and stopping it in separate
    processes, and checking for availability.
    """

    APP_INITIALIZE_URL = "/app/api/initialize/{key}"

    def __init__(self, retry_timeout_secs=None):
        self.__setup_process = KolibriServiceSetupProcess()
        self.__main_process = KolibriServiceMainProcess(
            ready_event=self.__setup_process.ready_event,
            retry_timeout_secs=retry_timeout_secs,
        )
        self.__monitor_process = KolibriServiceMonitorProcess(
            stopped_event=self.__main_process.stopped_event
        )
        self.__stop_process = KolibriServiceStopProcess(
            loaded_event=self.__monitor_process.loaded_event
        )

    def get_initialize_url(self, next_url=None):
        from ..kolibri_globals import KOLIBRI_BASE_URL

        app_key = self.__main_process.get_app_key_sync()
        url = self.APP_INITIALIZE_URL.format(key=app_key)
        if next_url:
            url += "?next={next_url}".format(next_url=next_url)
        return KOLIBRI_BASE_URL + url.lstrip('/')

    def get_kolibri_url(self, **kwargs):
        from urllib.parse import urljoin
        from urllib.parse import urlsplit
        from urllib.parse import urlunsplit
        from ..kolibri_globals import KOLIBRI_BASE_URL

        base_url = urlsplit(KOLIBRI_BASE_URL)
        if 'path' in kwargs:
            kwargs['path'] = urljoin(base_url.path, kwargs['path'].lstrip('/'))
        target_url = base_url._replace(**kwargs)
        return urlunsplit(target_url)

    def is_kolibri_url(self, url):
        from ..kolibri_globals import KOLIBRI_BASE_URL

        return url and url.startswith(KOLIBRI_BASE_URL)

    def is_kolibri_loading(self):
        return self.__monitor_process.is_kolibri_loading()

    def is_kolibri_loaded(self):
        return self.__monitor_process.is_kolibri_loaded()

    def wait_for_kolibri(self):
        return self.__monitor_process.wait_for_kolibri()

    def join(self):
        if self.__main_process.is_alive():
            self.__main_process.join()

    def start_kolibri(self):
        self.__setup_process.start()
        self.__main_process.start()
        self.__monitor_process.start()

    def stop_kolibri(self):
        self.__main_process.stop()
        self.__stop_process.start()
