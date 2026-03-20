"""
Module for handling Windows Registry operations for the Kolibri application.

This includes functions for:
- Checking for the WebView2 runtime installation.
- Managing the application's UI and tray icon startup settings.
"""
import logging
import sys
import winreg

from kolibri_app.constants import APP_NAME
from kolibri_app.constants import WEBVIEW2_RUNTIME_GUID

# Path for current user's startup programs
REG_KEY_STARTUP_CURRENT_USER = r"Software\Microsoft\Windows\CurrentVersion\Run"

# Path for system-wide startup programs
REG_KEY_STARTUP_ALL_USERS = r"SOFTWARE\Microsoft\Windows\CurrentVersion\Run"

# Primary path for WebView2 runtime (32-bit on 64-bit OS)
REG_KEY_WEBVIEW2_PRIMARY = (
    rf"SOFTWARE\WOW6432Node\Microsoft\EdgeUpdate\Clients\{WEBVIEW2_RUNTIME_GUID}"
)

# Alternative path for WebView2 runtime (64-bit)
REG_KEY_WEBVIEW2_ALTERNATIVE = (
    rf"SOFTWARE\Microsoft\EdgeUpdate\Clients\{WEBVIEW2_RUNTIME_GUID}"
)


def is_webview2_installed():
    """Check if the WebView2 runtime is installed on the system."""
    keys_to_check = [
        (winreg.HKEY_LOCAL_MACHINE, REG_KEY_WEBVIEW2_PRIMARY),
        (winreg.HKEY_LOCAL_MACHINE, REG_KEY_WEBVIEW2_ALTERNATIVE),
    ]

    for registry_section, key_path in keys_to_check:
        try:
            with winreg.OpenKey(registry_section, key_path) as key:
                winreg.QueryValueEx(key, "pv")
                return True
        except (FileNotFoundError, OSError):
            continue
    return False


def is_ui_startup_enabled():
    """Check if Kolibri UI is set to open on startup for the current user."""
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER, REG_KEY_STARTUP_CURRENT_USER, 0, winreg.KEY_READ
        ) as key:
            winreg.QueryValueEx(key, f"{APP_NAME}_UI")
            return True
    except (FileNotFoundError, OSError):
        return False


def set_ui_startup_enabled(enabled):
    """Enable or disable Kolibri UI startup on logon for the current user."""
    try:
        with winreg.OpenKey(
            winreg.HKEY_CURRENT_USER,
            REG_KEY_STARTUP_CURRENT_USER,
            0,
            winreg.KEY_ALL_ACCESS,
        ) as key:
            if enabled:
                exe_path = sys.executable
                startup_cmd = f'"{exe_path}"'
                if not getattr(sys, "frozen", False):
                    startup_cmd += " -m kolibri_app"
                winreg.SetValueEx(key, f"{APP_NAME}_UI", 0, winreg.REG_SZ, startup_cmd)
                logging.info("Enabled Kolibri UI startup on logon.")
            else:
                winreg.DeleteValue(key, f"{APP_NAME}_UI")
                logging.info("Disabled Kolibri UI startup on logon.")
            return True
    except (FileNotFoundError, OSError) as e:
        logging.error(f"Failed to modify UI startup setting: {e}")
        return False


def update_tray_icon_startup(new_state):
    """Update tray icon startup registry entry for all users."""
    try:
        with winreg.OpenKey(
            winreg.HKEY_LOCAL_MACHINE,
            REG_KEY_STARTUP_ALL_USERS,
            0,
            winreg.KEY_ALL_ACCESS,
        ) as key:
            if new_state == "auto":
                # Add tray icon to startup
                exe_path = sys.executable
                tray_cmd = f'"{exe_path}" --tray-only'
                if not getattr(sys, "frozen", False):
                    tray_cmd = f'"{sys.executable}" -m kolibri_app --tray-only'
                winreg.SetValueEx(key, "KolibriTray", 0, winreg.REG_SZ, tray_cmd)
                logging.info("Added tray icon to system startup.")
            else:
                # Remove tray icon from startup
                try:
                    winreg.DeleteValue(key, "KolibriTray")
                    logging.info("Removed tray icon from system startup.")
                except FileNotFoundError:
                    pass  # Key doesn't exist, which is fine.
    except (OSError, PermissionError, winreg.error) as e:
        logging.error(f"Failed to update tray icon startup: {e}")
