from .application import Application

from ..globals import init_logging

def main():
    init_logging('kolibri-gnome-search-provider.txt')

    application = Application()
    return application.run()

