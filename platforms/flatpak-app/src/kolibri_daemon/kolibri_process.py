from __future__ import annotations

import logging
import queue
import threading

import kolibri
from kolibri.core.device.models import DeviceAppKey
from kolibri.core.device.utils import app_initialize_url
from kolibri.core.device.utils import device_provisioned
from kolibri.dist.magicbus.plugins import SimplePlugin
from kolibri.dist.magicbus.plugins.tasks import Monitor
from kolibri.utils.conf import OPTIONS
from kolibri.utils.server import get_urls
from kolibri.utils.server import KolibriProcessBus
from kolibri_app.globals import KOLIBRI_HOME_PATH

from .application import Application
from .application import KolibriState
from .application import KolibriStatus

logger = logging.getLogger(__name__)


class KolibriDaemonProcess(KolibriProcessBus):
    __application: Application

    def __init__(self, application: Application):
        super().__init__(
            port=OPTIONS["Deployment"]["HTTP_PORT"],
            zip_port=OPTIONS["Deployment"]["ZIP_CONTENT_PORT"],
        )
        # The thread_wait plugin seems be causing a hang when kolibri-daemon is
        # running as a systemd system service with KillMode=control-group.
        self.thread_wait.unsubscribe()

        self.__application = application
        _DBusPlugin(self, application).subscribe()

    def run(self):
        # KolibriProcessBus.run() goes on to RUN; Kolibri waits for Start.
        self.transition("IDLE")
        self.block()

    def transition(self, desired_state: str):
        if desired_state == "EXITED":
            # Drop the bus name while Status still reads STARTED. Otherwise a
            # connected frontend never restarts the daemon, and no successor
            # can take the name while this Kolibri stops.
            self.__application.detach_kolibri()
        return super().transition(desired_state)


class _DBusPlugin(SimplePlugin):
    __application: Application
    __commands: queue.SimpleQueue[str]
    __provisioned_monitor: Monitor
    __state: KolibriState
    __state_lock: threading.Lock

    def __init__(self, bus: KolibriDaemonProcess, application: Application):
        super().__init__(bus)
        self.__application = application
        self.__commands = queue.SimpleQueue()
        self.__state = KolibriState()
        self.__state_lock = threading.Lock()
        self.__provisioned_monitor = Monitor(
            bus, self.__update_is_device_provisioned, frequency=5
        )

    def subscribe(self):
        super().subscribe()
        # ProcessBus.START_ERROR (priority 50) exits the bus, after which the
        # Application drops any state update.
        self.bus.subscribe("START_ERROR", self.__on_start_error, priority=40)
        self.__provisioned_monitor.subscribe()

    def start(self):
        self.__commands.put("RUN")

    def stop(self):
        self.__commands.put("IDLE")

    def exit(self):
        self.__commands.put("EXITED")

    def main(self):
        # Published from block() on the main thread, so commands are applied in
        # order with run() and signal handling.
        while True:
            try:
                state = self.__commands.get_nowait()
            except queue.Empty:
                return
            self.bus.transition(state)

    def ENTER(self):
        self.__update_state(
            app_key=DeviceAppKey.get_app_key(),
            app_initialize_url=app_initialize_url(),
            kolibri_home=KOLIBRI_HOME_PATH.as_posix(),
            kolibri_version=kolibri.__version__,
            is_device_provisioned=device_provisioned(),
        )
        self.__application.attach_kolibri(self)

    def START(self):
        self.__update_state(status=KolibriStatus.STARTING)

    def SERVING(self, port: int):
        _, base_urls = get_urls(listen_port=port)
        self.__update_state(base_url=base_urls[0], status=KolibriStatus.STARTED)

    def ZIP_SERVING(self, zip_port: int):
        _, zip_urls = get_urls(listen_port=zip_port)
        self.__update_state(extra_url=zip_urls[0])

    def __on_start_error(self, error_class, error, traceback):
        self.__update_state(status=KolibriStatus.ERROR)
        logger.error("Kolibri failed to start due to an error: %s", error)

    def STOP(self):
        self.__update_state(base_url="", extra_url="", status=KolibriStatus.STOPPED)

    def __update_is_device_provisioned(self):
        if self.__state.is_device_provisioned:
            return

        if device_provisioned():
            self.__update_state(is_device_provisioned=True)

    def __update_state(self, **changes):
        # Updates come from the main and Monitor threads; pushing inside the
        # lock keeps them in order.
        with self.__state_lock:
            self.__state = self.__state._replace(**changes)
            self.__application.update_kolibri_state(self.__state)
