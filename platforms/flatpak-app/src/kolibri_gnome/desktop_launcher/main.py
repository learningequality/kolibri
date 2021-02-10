import logging

logging.basicConfig(level=logging.DEBUG)

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")

import datetime
import sys

from setproctitle import setproctitle

from ..globals import init_gettext, init_logging

import pew

from .application import Application


PROCESS_NAME = "kolibri-gnome"


def main():
    setproctitle(PROCESS_NAME)

    init_logging("{}.txt".format(PROCESS_NAME))
    init_gettext()

    pew.set_app_name("Kolibri")

    logger = logging.getLogger(__name__)

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logger.info("")
    logger.info("************************************")
    logger.info("*  Kolibri GNOME App Initializing  *")
    logger.info("************************************")
    logger.info("")
    logger.info("Started at: {}".format(datetime.datetime.today()))

    app = Application()
    app.run()

    logger.info("Stopped at: {}".format(datetime.datetime.today()))


if __name__ == "__main__":
    result = main()
    sys.exit(result)
