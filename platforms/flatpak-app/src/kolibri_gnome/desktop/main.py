import logging

logging.basicConfig(level=logging.DEBUG)

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")

import argparse
import datetime
import signal
import sys

from functools import partial
from setproctitle import setproctitle

from gi.repository import GLib

from .. import config

from ..globals import init_gettext, init_logging


PROCESS_NAME = "kolibri-gnome"


def application_signal_handler(application, sig, frame):
    application.quit()


def main():
    setproctitle(PROCESS_NAME)

    init_logging("{}.txt".format(PROCESS_NAME))
    init_gettext()

    parser = argparse.ArgumentParser()
    parser.add_argument("--channel-id", type=str, default=None)
    args = parser.parse_args()

    logger = logging.getLogger(__name__)

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logger.info("")
    logger.info("************************************")
    logger.info("*  Kolibri GNOME App Initializing  *")
    logger.info("************************************")
    logger.info("")
    logger.info("Started at: {}".format(datetime.datetime.today()))

    import pew
    from .application import ChannelApplication
    from .application import GenericApplication

    if args.channel_id:
        pew.set_app_name("Kolibri")
        application_id = "{prefix}{channel_id}".format(
            prefix=config.FRONTEND_CHANNEL_APPLICATION_ID_PREFIX,
            channel_id=args.channel_id,
        )
        GLib.set_prgname(application_id)
        application = ChannelApplication(
            application_id=application_id, channel_id=args.channel_id
        )
    else:
        application_id = config.FRONTEND_APPLICATION_ID
        GLib.set_prgname(application_id)
        application = GenericApplication(application_id=application_id)

    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))
    application.run()

    logger.info("Stopped at: {}".format(datetime.datetime.today()))


if __name__ == "__main__":
    result = main()
    sys.exit(result)
