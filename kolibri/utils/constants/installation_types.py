"""
This module contains constants representing the type of "installers" used to install Kolibri.
"""
from __future__ import unicode_literals

APK = "apk"
DEB = "deb"
FLATPAK = "flatpak"
GNOME = "gnome"
KOLIBRI_SERVER = "kolibriserver"
MACOS = "mac"
PEX = "pex"
WHL = "whl"
WINDOWS = "windows"
WINDOWS_APP = "windowsapp"

install_type_map = {
    APK: "apk - {}",
    DEB: "deb kolibri - {}",
    FLATPAK: "Flatpak - {}",
    GNOME: "GNOME - {}",
    KOLIBRI_SERVER: "deb kolibri-server - {}",
    MACOS: "Mac - {}",
    PEX: "pex",
    WHL: "whl",
    WINDOWS: "Windows - {}",
    WINDOWS_APP: "Windows App - {}",
}
