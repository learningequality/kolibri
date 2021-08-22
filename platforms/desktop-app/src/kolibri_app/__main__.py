import datetime
import multiprocessing

from kolibri_app.application import KolibriApp
from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging


def main():
    # This call fixes some issues with using multiprocessing when packaged as an app. (e.g. fork can start the app
    # multiple times)
    multiprocessing.freeze_support()
    if WINDOWS:
        import winreg
        root = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
        KEY = r"SOFTWARE\Microsoft\Internet Explorer\Main\FeatureControl\FEATURE_BROWSER_EMULATION"
        with winreg.CreateKeyEx(root, KEY, 0, winreg.KEY_ALL_ACCESS) as regkey:
            winreg.SetValueEx(regkey, os.path.basename(sys.executable), 0, winreg.REG_DWORD, 11000)
    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("Kolibri App Initializing")
    logging.info("Started at: {}".format(datetime.datetime.now()))
    app = KolibriApp()
    app.MainLoop()


if __name__ == "__main__":
    main()
