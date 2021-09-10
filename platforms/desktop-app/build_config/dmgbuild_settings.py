application = "dist/Kolibri.app"
appname = "Kolibri"

files = [application]

window_rect = ((20, 100000), (700, 300))

icon_locations = {
    appname: (140, 120),
    "Applications": (500, 120),
}

# Symlinks to create
symlinks = {"Applications": "/Applications"}

background = "icons/Layout.png"
