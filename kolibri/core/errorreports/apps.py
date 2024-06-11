from django.apps import AppConfig


class KolibriErrorConfig(AppConfig):
    name = "kolibri.core.errorreports"
    label = "errorreports"
    verbose_name = "Kolibri ErrorReports"

    def ready(self):
        pass
