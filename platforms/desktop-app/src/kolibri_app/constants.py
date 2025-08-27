import sys

APP_NAME = "Kolibri"

LINUX = sys.platform.startswith("linux")

MAC = sys.platform.startswith("darwin")

WINDOWS = sys.platform.startswith("win32")

# Windows specific constants
TRAY_ICON_ICO = "icons/kolibri.ico"
SERVICE_NAME = "Kolibri"
# Microsoft's official identifier for the WebView2 Runtime, used for registry checks.
# Source: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution?tabs=dotnetcsharp
WEBVIEW2_RUNTIME_GUID = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
