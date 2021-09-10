import os

from kolibri.main import enable_plugin


os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"
enable_plugin('kolibri.plugins.app')
