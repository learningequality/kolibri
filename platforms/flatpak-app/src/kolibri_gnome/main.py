import datetime
import gettext
import logging

import pew

from . import config
from .application import Application

def main():
    gettext.bindtextdomain(config.APP_ID, config.LOCALE_DIR)
    gettext.textdomain(config.APP_ID)

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

