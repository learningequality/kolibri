import datetime
import sys
from multiprocessing import freeze_support

from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging


def main():
    if WINDOWS:
        # windows_utils and the service import pywin32.
        # Dispatching the service before the app and windows_utils load cut its
        # working set from 62 MB to 40 MB on Windows 11.
        if sys.argv[1:2] == ["--run-as-service"]:
            from kolibri_app.windows.service import run_service  # noqa: PLC0415

            run_service()
            return
        from kolibri_app.windows_utils import handle_windows_commands  # noqa: PLC0415

        handle_windows_commands()

    from kolibri_app.application import KolibriApp  # noqa: PLC0415

    # Check for tray-only mode
    tray_only = "--tray-only" in sys.argv

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("Kolibri App Initializing")
    # The UI process can run before Kolibri configures Django settings.
    logging.info(f"Started at: {datetime.datetime.now()}")  # noqa: DTZ005
    if tray_only:
        logging.info("Starting in tray-only mode")

    app = KolibriApp(tray_only=tray_only)
    app.MainLoop()


if __name__ == "__main__":
    # This call fixes some issues with using multiprocessing when packaged as an app. (e.g. fork can start the app
    # multiple times)
    freeze_support()
    main()
