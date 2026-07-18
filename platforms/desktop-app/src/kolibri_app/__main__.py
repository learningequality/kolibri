import datetime
import sys
from multiprocessing import freeze_support

from kolibri_app.application import KolibriApp
from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging


def main():
    if WINDOWS:
        from kolibri_app.windows_utils import handle_windows_commands

        handle_windows_commands()

    # Check for tray-only mode
    tray_only = "--tray-only" in sys.argv

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("Kolibri App Initializing")
    logging.info("Started at: {}".format(datetime.datetime.now()))
    if tray_only:
        logging.info("Starting in tray-only mode")

    app = KolibriApp(tray_only=tray_only)
    app.MainLoop()


if __name__ == "__main__":
    # This call fixes some issues with using multiprocessing when packaged as an app. (e.g. fork can start the app
    # multiple times)
    freeze_support()
    main()
