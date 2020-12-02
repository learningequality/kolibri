import gi

gi.require_version("Gdk", "3.0")
gi.require_version("Gtk", "3.0")

import sys

from .application import Application

from ..globals import init_gettext


def main():
    init_env()
    init_gettext()
    # init_logging('kolibri-gnome-search-provider.txt')

    application = Application()
    return application.run()


if __name__ == "__main__":
    result = main()
    sys.exit(result)
