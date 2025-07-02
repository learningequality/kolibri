import datetime
from multiprocessing import freeze_support

from kolibri_app.application import KolibriApp
from kolibri_app.logger import logging


def main():
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
