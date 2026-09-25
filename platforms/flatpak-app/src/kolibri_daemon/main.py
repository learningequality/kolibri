import signal
import sys
import threading
from functools import partial

from gi.repository import GLib
from setproctitle import setproctitle

from .application import Application
from .kolibri_search_handler import LocalSearchHandler
from .kolibri_utils import init_kolibri
from .kolibri_utils import kolibri_home_lock

PROCESS_NAME = "kolibri-daemon"


def application_signal_handler(application, sig, frame):
    GLib.idle_add(application.quit)


def main():
    setproctitle(PROCESS_NAME)

    search_handler = LocalSearchHandler()
    application = Application(search_handler)
    # Kolibri's own SignalHandler replaces this once its bus enters.
    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))

    exit_status = []
    application_thread = threading.Thread(
        target=lambda: exit_status.append(application.run(sys.argv)), daemon=True
    )
    application_thread.start()

    try:
        if application.await_bus_name():
            with kolibri_home_lock():
                init_kolibri()
                search_handler.init()
                # Kolibri reads its options at import time, from the
                # environment init_kolibri() sets.
                from .kolibri_process import KolibriDaemonProcess

                KolibriDaemonProcess(application).run()
    finally:
        search_handler.shutdown()

    application_thread.join()
    return exit_status[0]


if __name__ == "__main__":
    result = main()
    sys.exit(result)
