from django.apps import AppConfig


class KolibriLoggerConfig(AppConfig):
    name = "kolibri.core.logger"
    label = "logger"
    verbose_name = "Kolibri Logger"

    def ready(self):
        pass
