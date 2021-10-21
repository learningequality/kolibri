import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")
gi.require_version("KolibriDaemonDBus", "1.0")

import os
import signal
import sys

from functools import partial
from setproctitle import setproctitle

from .application import Application


PROCESS_NAME = "kolibri-daemon"


def application_signal_handler(application, sig, frame):
    print("SIGNAL HANDLER", application, sig, type(sig), frame, type(frame))
    application.quit()


def main():
    setproctitle(PROCESS_NAME)
    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.kolibri_settings"

    application = Application()
    signal.signal(signal.SIGTERM, partial(application_signal_handler, application))
    return application.run(sys.argv)


if __name__ == "__main__":
    result = main()
    sys.exit(result)
