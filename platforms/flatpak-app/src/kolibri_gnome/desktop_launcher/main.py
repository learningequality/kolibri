import gi
gi.require_version('Gdk', '3.0')
gi.require_version('Gtk', '3.0')

import datetime
import logging
import sys

from ..globals import init_gettext, init_logging
init_logging('kolibri-gnome.txt')
init_gettext()

import pew

from .application import Application

def main():
    pew.set_app_name("Kolibri")

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("")
    logging.info("************************************")
    logging.info("*  Kolibri GNOME App Initializing  *")
    logging.info("************************************")
    logging.info("")
    logging.info("Started at: {}".format(datetime.datetime.today()))

    app = Application()
    app.run()
    app.join()

    logging.info("Stopped at: {}".format(datetime.datetime.today()))


if __name__ == "__main__":
    result = main()
    sys.exit(result)

