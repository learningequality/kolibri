import sys

import pywintypes
import win32service

from kolibri_app.constants import SERVICE_NAME
from kolibri_app.logger import logging
from kolibri_app.server_process_windows import ServerProcess
from kolibri_app.windows_registry import update_tray_icon_startup


start_type_map = {
    "auto": win32service.SERVICE_AUTO_START,
    "disabled": win32service.SERVICE_DISABLED,
}


def _configure_service_start_type(service_name, start_type):
    """Configure the Windows service start type."""

    if start_type not in start_type_map:
        raise ValueError(f"Invalid start type: {start_type}")

    scm_handle = None
    service_handle = None
    try:
        scm_handle = win32service.OpenSCManager(
            None, None, win32service.SC_MANAGER_ALL_ACCESS
        )
        service_handle = win32service.OpenService(
            scm_handle, service_name, win32service.SERVICE_CHANGE_CONFIG
        )

        win32service.ChangeServiceConfig(
            service_handle,
            win32service.SERVICE_NO_CHANGE,
            start_type_map[start_type],
            win32service.SERVICE_NO_CHANGE,
            None,
            None,
            0,
            None,
            None,
            None,
            None,
        )
        logging.info(
            f"Successfully configured service '{service_name}' start type to '{start_type}'."
        )
    finally:
        if service_handle:
            win32service.CloseServiceHandle(service_handle)
        if scm_handle:
            win32service.CloseServiceHandle(scm_handle)


def run_service_command(new_state):
    """Executes sc commands to configure and optionally start the service."""
    service_name = SERVICE_NAME
    logging.info(
        f"Attempting to set service '{service_name}' start type to '{new_state}'."
    )

    try:
        _configure_service_start_type(service_name, new_state)
        update_tray_icon_startup(new_state)

        logging.info("Service configuration successful.")
        return 0

    except pywintypes.error as e:
        logging.error(f"Failed to configure the service. Win32 Error: {e}")
        return e.winerror


def handle_windows_commands():
    # This block handles command-line actions that don't launch the full app.
    # It is intended to be run with elevated privileges.
    if len(sys.argv) > 1 and sys.argv[1] == "--configure-service":
        if len(sys.argv) < 3 or sys.argv[2] not in ["auto", "disabled"]:
            print("Usage: --configure-service [auto|disabled]", file=sys.stderr)
            sys.exit(1)

        new_state = sys.argv[2]
        logging.info(f"Running elevated command to configure service: {new_state}")
        exit_code = run_service_command(new_state)
        sys.exit(exit_code)

    # This block is the entry point for the server subprocess
    if "--run-as-server" in sys.argv:
        logging.info("Starting in server mode...")
        server = ServerProcess()
        server.run()
        sys.exit(0)
