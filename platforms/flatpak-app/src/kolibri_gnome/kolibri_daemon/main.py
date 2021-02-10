import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")

import os
import sys

from setproctitle import setproctitle

from .application import Application


PROCESS_NAME = "kolibri-daemon"


def main():
    setproctitle(PROCESS_NAME)
    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_gnome.kolibri_settings"

    application = Application()
    return application.run(sys.argv)


if __name__ == "__main__":
    result = main()
    sys.exit(result)
