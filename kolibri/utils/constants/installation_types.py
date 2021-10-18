"""
This module contains constants representing the type of "installers" used to install Kolibri.
"""
from __future__ import unicode_literals

APK = "apk"
DEB = "deb"
KOLIBRI_SERVER = "kolibri-server"
MACOS = "Mac"
PEX = "pex"
UWSGI = "uwsgi"
WHL = "whl"
WINDOWS = "Windows"

install_type_map = {
    APK: "APK",
    DEB: "Debian package",
    KOLIBRI_SERVER: "kolibri Debian package with kolibri_server",
    MACOS: "macOS desktop app",
    PEX: "PEX executable",
    UWSGI: "UWSGI process",
    WHL: "WHL Python package",
    WINDOWS: "Windows Installer",
}
