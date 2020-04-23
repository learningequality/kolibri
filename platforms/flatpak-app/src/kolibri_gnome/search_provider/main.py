import gi
gi.require_version('Gdk', '3.0')
gi.require_version('Gtk', '3.0')

from .application import Application

from ..globals import init_logging

def main():
    init_logging('kolibri-gnome-search-provider.txt')

    application = Application()
    return application.run()

