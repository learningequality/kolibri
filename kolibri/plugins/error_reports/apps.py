from django.apps import AppConfig
from django.core.signals import got_request_exception
from django.core.signals import request_started


class ErrorReportsConfig(AppConfig):
    name = "kolibri.plugins.error_reports"
    verbose_name = "Kolibri Error Reports"

    def ready(self):
        # apps.py is imported before the app registry is ready.
        from .handlers import handle_request_exception  # noqa: PLC0415
        from .handlers import mark_request_start  # noqa: PLC0415
        from .utils.request import patch_drf_request_backref  # noqa: PLC0415

        patch_drf_request_backref()
        request_started.connect(
            mark_request_start,
            dispatch_uid="kolibri.plugins.error_reports.request_started",
        )
        got_request_exception.connect(
            handle_request_exception,
            dispatch_uid="kolibri.plugins.error_reports.got_request_exception",
        )
