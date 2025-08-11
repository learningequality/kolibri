import datetime
import sys
from multiprocessing import freeze_support

from kolibri_app.application import KolibriApp
from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging

if WINDOWS:
    from kolibri_app.server_process_windows import ServerProcess


def main():
    # This block is the entry point for the server subprocess
    if WINDOWS and "--run-as-server" in sys.argv:
        logging.info("Starting in server mode...")
        server = ServerProcess()
        server.run()
        sys.exit(0)

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("Kolibri App Initializing")
    logging.info("Started at: {}".format(datetime.datetime.now()))
    app = KolibriApp()
    app.MainLoop()


if __name__ == "__main__":
    # This call fixes some issues with using multiprocessing when packaged as an app. (e.g. fork can start the app
    # multiple times)
    freeze_support()
    main()
