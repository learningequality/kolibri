"""
This module contains constants representing the type of "installers" used to install Kolibri.
"""
from __future__ import unicode_literals

APK = "apk"
APT = "apt"
KOLIBRI_SERVER = "kolibri-server"
MACOS = "Mac"
PEX = "pex"
WHL = "whl"
WINDOWS = "Windows"

install_type_map = {
    APK: "APK",
    APT: "APT - Debian package",
    KOLIBRI_SERVER: "kolibri(apt) with kolibri_server",
    MACOS: "MacOS Installer",
    PEX: "PEX file",
    WHL: "WHL Python package",
    WINDOWS: "Windows Installer",
}
