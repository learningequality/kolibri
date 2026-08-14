import sys

APP_NAME = "Kolibri"

LINUX = sys.platform.startswith("linux")

MAC = sys.platform.startswith("darwin")

WINDOWS = sys.platform.startswith("win32")

# True only in the server subprocess the Windows UI process spawns; on POSIX the
# server runs in a thread of the UI process.
RUN_AS_SERVER = "--run-as-server" in sys.argv

# Windows specific constants
TRAY_ICON_ICO = "icons/kolibri.ico"
SERVICE_NAME = "Kolibri"
# Explicit AppUserModelID for notification attribution. Without it, Windows
# auto-generates an identity for the tray icon and renders the notification
# header from a cached copy of the tray HICON, which can show with swapped
# colours (see issue #184). Registered in the registry with a DisplayName and
# IconUri so toasts show "Kolibri" and the icon file directly.
APP_USER_MODEL_ID = "LearningEquality.Kolibri"
# Microsoft's official identifier for the WebView2 Runtime, used for registry checks.
# Source: https://learn.microsoft.com/en-us/microsoft-edge/webview2/concepts/distribution?tabs=dotnetcsharp
WEBVIEW2_RUNTIME_GUID = "{F3017226-FE2A-4295-8BDF-00C3A9A7E4C5}"
