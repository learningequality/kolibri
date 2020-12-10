import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")

import os
import sys

from .application import Application

from ..globals import init_gettext


def main():
    init_gettext()
    # init_logging('kolibri-daemon.txt')

    os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_gnome.kolibri_settings"

    application = Application()
    return application.run()


if __name__ == "__main__":
    result = main()
    sys.exit(result)
