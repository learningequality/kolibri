from django.apps import AppConfig


class KolibriTasksConfig(AppConfig):
    name = "kolibri.core.tasks"
    label = "kolibritasks"
    verbose_name = "Kolibri Tasks"

    def ready(self):
        pass
