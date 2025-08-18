import datetime
import subprocess
import sys
from multiprocessing import freeze_support

from kolibri_app.application import KolibriApp
from kolibri_app.constants import SERVICE_NAME
from kolibri_app.constants import WINDOWS
from kolibri_app.logger import logging

if WINDOWS:
    from kolibri_app.server_process_windows import ServerProcess


def _configure_service_start_type(service_name, start_type):
    """Configure the Windows service start type."""
    start_type_arg = "auto" if start_type == "auto" else "disabled"
    config_cmd = ["sc", "config", service_name, f"start={start_type_arg}"]

    result = subprocess.run(config_cmd, check=True, capture_output=True, text=True)
    logging.info(f"'sc config' output: {result.stdout}")


def _update_tray_icon_startup(new_state, service_name):
    """Update tray icon startup registry entry and start service if needed."""
    import winreg

    try:
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run",
            0,
            winreg.KEY_ALL_ACCESS,
        ) as key:
            if new_state == "auto":
                # Add tray icon to system startup
                exe_path = sys.executable
                if getattr(sys, "frozen", False):
                    tray_cmd = f'"{exe_path}" --tray-only'
                else:
                    tray_cmd = f'"{sys.executable}" -m kolibri_app --tray-only'
                winreg.SetValueEx(key, "KolibriTray", 0, winreg.REG_SZ, tray_cmd)
                logging.info("Added tray icon to system startup")

                # Start the service
                logging.info(f"Attempting to start service '{service_name}'.")
                start_cmd = ["sc", "start", service_name]
                subprocess.run(start_cmd, capture_output=True, text=True)
            else:
                # Remove tray icon from system startup
                try:
                    winreg.DeleteValue(key, "KolibriTray")
                    logging.info("Removed tray icon from system startup")
                except FileNotFoundError:
                    pass  # Key doesn't exist, which is fine
    except (OSError, PermissionError, winreg.error) as e:
        logging.error(f"Failed to update tray icon startup: {e}")


def run_service_command(new_state):
    """Executes sc commands to configure and optionally start the service."""
    service_name = SERVICE_NAME
    logging.info(
        f"Attempting to set service '{service_name}' start type to '{new_state}'."
    )

    try:
        _configure_service_start_type(service_name, new_state)
        _update_tray_icon_startup(new_state, service_name)

        logging.info("Service configuration successful.")
        return 0

    except FileNotFoundError:
        logging.error("'sc.exe' not found. Is it in the system's PATH?")
        return 1
    except subprocess.CalledProcessError as e:
        logging.error(f"Failed to execute service command. Return code: {e.returncode}")
        logging.error(f"Stderr: {e.stderr}")
        return e.returncode


def main():
    # This block handles command-line actions that don't launch the full app.
    # It is intended to be run with elevated privileges.
    if WINDOWS and len(sys.argv) > 1 and sys.argv[1] == "--configure-service":
        if len(sys.argv) < 3 or sys.argv[2] not in ["auto", "disabled"]:
            print("Usage: --configure-service [auto|disabled]", file=sys.stderr)
            sys.exit(1)

        new_state = sys.argv[2]
        logging.info(f"Running elevated command to configure service: {new_state}")
        exit_code = run_service_command(new_state)
        sys.exit(exit_code)

    # This block is the entry point for the server subprocess
    if WINDOWS and "--run-as-server" in sys.argv:
        logging.info("Starting in server mode...")
        server = ServerProcess()
        server.run()
        sys.exit(0)

    # Check for tray-only mode
    tray_only = "--tray-only" in sys.argv

    # Since the log files can contain multiple runs, make the first printout very visible to quickly show
    # when a new run starts in the log files.
    logging.info("Kolibri App Initializing")
    logging.info("Started at: {}".format(datetime.datetime.now()))
    if tray_only:
        logging.info("Starting in tray-only mode")

    app = KolibriApp(tray_only=tray_only)
    app.MainLoop()


if __name__ == "__main__":
    # This call fixes some issues with using multiprocessing when packaged as an app. (e.g. fork can start the app
    # multiple times)
    freeze_support()
    main()
