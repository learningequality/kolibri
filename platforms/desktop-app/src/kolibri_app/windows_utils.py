import sys

import pywintypes
import win32service
import win32serviceutil
import winerror

from kolibri.utils.server import stop as stop_kolibri_server
from kolibri_app.constants import RUN_AS_SERVER
from kolibri_app.constants import SERVICE_NAME
from kolibri_app.logger import logging
from kolibri_app.server_process_windows import WindowsKolibriProcess
from kolibri_app.windows_registry import update_tray_icon_startup

# NSSM waits AppStopMethodWindow (30s, set by the installer) for a graceful stop,
# then terminates the server; leave room for both.
SERVICE_STOP_TIMEOUT_SECONDS = 60

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
    """Set the service start type, then stop or start the service to match."""
    logging.info(
        f"Attempting to set service '{SERVICE_NAME}' start type to '{new_state}'."
    )

    try:
        _set_start_type(new_state)
    except pywintypes.error as e:
        logging.error(f"Failed to configure the service. Win32 Error: {e}")
        return e.winerror

    try:
        if new_state == "disabled":
            _stop_service()
        else:
            _replace_local_server_with_service()
    except pywintypes.error as e:
        logging.error(
            f"Failed to apply the service start type, reverting it. Win32 Error: {e}"
        )
        _set_start_type("auto" if new_state == "disabled" else "disabled")
        return e.winerror

    logging.info("Service configuration successful.")
    return 0


def _set_start_type(new_state):
    _configure_service_start_type(SERVICE_NAME, new_state)
    update_tray_icon_startup(new_state)


def _stop_service():
    try:
        win32serviceutil.StopService(SERVICE_NAME)
    except pywintypes.error as e:
        if e.winerror != winerror.ERROR_SERVICE_NOT_ACTIVE:
            raise
    # StopService returns while the service is still stopping, and
    # RestartService gives up after 30s without reporting failure.
    win32serviceutil.WaitForServiceStatus(
        SERVICE_NAME, win32service.SERVICE_STOPPED, SERVICE_STOP_TIMEOUT_SECONDS
    )


def _replace_local_server_with_service():
    status = win32serviceutil.QueryServiceStatus(SERVICE_NAME)[1]
    if status in (win32service.SERVICE_RUNNING, win32service.SERVICE_START_PENDING):
        return
    stop_kolibri_server()
    win32serviceutil.StartService(SERVICE_NAME)


def restart_service():
    logging.info(f"Restarting service '{SERVICE_NAME}'.")
    try:
        _stop_service()
        win32serviceutil.StartService(SERVICE_NAME)
        return 0
    except pywintypes.error as e:
        logging.error(f"Failed to restart the service. Win32 Error: {e}")
        return e.winerror


def handle_windows_commands():
    # This block handles command-line actions that don't launch the full app.
    # It is intended to be run with elevated privileges.
    if len(sys.argv) > 1 and sys.argv[1] == "--configure-service":
        if len(sys.argv) < 3 or sys.argv[2] not in ["auto", "disabled"]:
            # A usage error for the command-line caller, not the app log.
            print("Usage: --configure-service [auto|disabled]", file=sys.stderr)  # noqa: T201
            sys.exit(1)

        new_state = sys.argv[2]
        logging.info(f"Running elevated command to configure service: {new_state}")
        exit_code = run_service_command(new_state)
        sys.exit(exit_code)

    if len(sys.argv) > 1 and sys.argv[1] == "--restart-service":
        sys.exit(restart_service())

    # This block is the entry point for the server subprocess
    if RUN_AS_SERVER:
        logging.info("Starting in server mode...")
        server = WindowsKolibriProcess()
        server.run()
        sys.exit(0)
