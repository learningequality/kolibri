from django.apps import AppConfig


class KolibriDeviceAppConfig(AppConfig):
    name = "kolibri.core.device"
    label = "device"
    verbose_name = "Kolibri Device"

    def ready(self):
        # apps.py is imported before the app registry is ready.
        # Implicitly connect signal handlers decorated with @receiver.
        from . import signals  # noqa: F401, PLC0415
