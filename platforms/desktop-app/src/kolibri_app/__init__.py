import os

from kolibri.main import enable_plugin

from kolibri_app.constants import MAC

__version__ = "0.3.0"

os.environ["KOLIBRI_INSTALLER_VERSION"] = __version__

if MAC:
    os.environ["KOLIBRI_INSTALLATION_TYPE"] = "mac"

os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"
enable_plugin("kolibri.plugins.app")
