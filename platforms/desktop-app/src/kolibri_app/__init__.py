import os

from kolibri_app.constants import MAC

__version__ = "0.4.4"

os.environ["KOLIBRI_INSTALLER_VERSION"] = __version__

if MAC:
    os.environ["KOLIBRI_INSTALLATION_TYPE"] = "mac"

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"
