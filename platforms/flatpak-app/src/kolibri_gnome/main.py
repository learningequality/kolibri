import logging

logging.basicConfig(level=logging.DEBUG)

import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")
gi.require_version("KolibriDaemonDBus", "1.0")
gi.require_version("WebKit2", "4.0")

import argparse
import datetime
import signal
import sys

from functools import partial
from setproctitle import setproctitle

from gi.repository import Gio
from gi.repository import GLib

from kolibri_app.config import FRONTEND_CHANNEL_APPLICATION_ID_PREFIX
from kolibri_app.config import FRONTEND_APPLICATION_ID
from kolibri_app.globals import init_gettext
from kolibri_app.globals import init_logging


PROCESS_NAME = "kolibri-gnome"


def application_signal_handler(application, sig, frame):
    application.quit()


def main():
    setproctitle(PROCESS_NAME)

    init_logging("{}.txt".format(PROCESS_NAME))
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
    logger.info("Started at: {}".format(datetime.datetime.today()))

    import pew
    from .application import ChannelApplication
    from .application import GenericApplication

    uri_files = [Gio.File.new_for_uri(uri) for uri in args.uri_list]

    if args.channel_id:
        pew.set_app_name("Kolibri")
        application_id = "{prefix}{channel_id}".format(
            prefix=FRONTEND_CHANNEL_APPLICATION_ID_PREFIX,
            channel_id=args.channel_id,
        )
        GLib.set_prgname(application_id)
        application = ChannelApplication(
            application_id=application_id, channel_id=args.channel_id
        )
    else:
        application_id = FRONTEND_APPLICATION_ID
        GLib.set_prgname(application_id)
        application = GenericApplication(application_id=application_id)

    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))

    application.gtk_application.register()

    if uri_files:
        application.gtk_application.open(uri_files, "")

    application.run([sys.argv[0], *extra_argv])

    logger.info("Stopped at: {}".format(datetime.datetime.today()))


if __name__ == "__main__":
    result = main()
    sys.exit(result)
