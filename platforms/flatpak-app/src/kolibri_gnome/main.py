import argparse
import datetime
import logging
import signal
import sys
from functools import partial

from gi.repository import Gio
from gi.repository import GLib
from setproctitle import setproctitle

from kolibri_app.config import FRONTEND_APPLICATION_ID
from kolibri_app.config import FRONTEND_CHANNEL_APPLICATION_ID_PREFIX
from kolibri_app.globals import init_gettext
from kolibri_app.globals import init_logging

PROCESS_NAME = "kolibri-gnome"


def application_signal_handler(application, sig, frame):
    application.quit()


def main():
    setproctitle(PROCESS_NAME)

    init_logging(f"{PROCESS_NAME}.txt")
    init_gettext()

    parser = argparse.ArgumentParser()
    parser.add_argument("--channel-id", type=str, default=None)
    parser.add_argument("uri_list", type=str, default=None, nargs="*")
    args, extra_argv = parser.parse_known_args()

    logger = logging.getLogger(__name__)

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logger.info("")
    logger.info("************************************")
    logger.info("*  Kolibri GNOME App Initializing  *")
    logger.info("************************************")
    logger.info("")
    logger.info("Started at: %s", datetime.datetime.today())

    from .application import Application
    from .application import ChannelApplication

    uri_files = [Gio.File.new_for_uri(uri) for uri in args.uri_list]

    if args.channel_id:
        application_id = f"{FRONTEND_CHANNEL_APPLICATION_ID_PREFIX}{args.channel_id}"
        GLib.set_prgname(application_id)
        application = ChannelApplication(
            application_id=application_id, channel_id=args.channel_id
        )
    else:
        application_id = FRONTEND_APPLICATION_ID
        GLib.set_prgname(application_id)
        application = Application(application_id=application_id)

    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))

    application.register()

    if uri_files:
        application.open(uri_files, "")

    application.run([sys.argv[0], *extra_argv])

    logger.info("Stopped at: %s", datetime.datetime.today())


if __name__ == "__main__":
    result = main()
    sys.exit(result)
