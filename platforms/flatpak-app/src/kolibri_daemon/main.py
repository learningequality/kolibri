import multiprocessing
import signal
import sys
from functools import partial

from setproctitle import setproctitle

from .application import Application
from .kolibri_search_handler import LocalSearchHandler
from .kolibri_service_manager import KolibriServiceManager


PROCESS_NAME = "kolibri-daemon"


def application_signal_handler(application, sig, frame):
    application.quit()


def main():
    setproctitle(PROCESS_NAME)

    multiprocessing.set_start_method("spawn")

    kolibri_service = KolibriServiceManager()
    kolibri_service.init()

    search_handler = LocalSearchHandler()
    search_handler.init()

    application = Application(kolibri_service, search_handler)
    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))

    return application.run(sys.argv)


if __name__ == "__main__":
    result = main()
    sys.exit(result)
