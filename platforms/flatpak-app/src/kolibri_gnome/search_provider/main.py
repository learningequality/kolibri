from .application import Application

from ..utils import init_logging

def main():
    init_logging('kolibri-gnome-search-provider.txt')

    application = Application()
    return application.run()

