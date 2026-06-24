from django.apps import AppConfig
from django.core.signals import got_request_exception
from django.core.signals import request_started


class ErrorReportsConfig(AppConfig):
    name = "kolibri.plugins.error_reports"
    verbose_name = "Kolibri Error Reports"

    def ready(self):
        from .handlers import handle_request_exception
        from .handlers import mark_request_start

        request_started.connect(
            mark_request_start,
            dispatch_uid="kolibri.plugins.error_reports.request_started",
        )
        got_request_exception.connect(
            handle_request_exception,
            dispatch_uid="kolibri.plugins.error_reports.got_request_exception",
        )
