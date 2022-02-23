# -*- coding: utf-8 -*-
from __future__ import unicode_literals

# Symlinks to create
symlinks = { 'Applications': '/Applications' }

# Volume icon
badge_icon = 'icons/kolibri.icns'

files = ["dist/Kolibri.app"]

# Where to put the icons
icon_locations = {
    "Kolibri.app": (185, 120),
    "Applications": (550, 120),
}

background = "icons/Layout.png"

window_rect = ((0, 1000), (734, 550))
