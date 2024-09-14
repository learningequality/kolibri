import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from .constants import BACKEND
from .constants import FRONTEND
from .constants import POSSIBLE_ERRORS
from .schemas import context_backend_schema
from .schemas import context_frontend_schema
from kolibri.core.fields import JSONField
from kolibri.core.utils.validators import JSON_Schema_Validator
from kolibri.deployment.default.sqlite_db_names import ERROR_REPORTS


logger = logging.getLogger(__name__)


class ErrorReportsRouter(object):
    """
    Determine how to route database calls for the ErrorReports app.
    """

    def db_for_read(self, model, **hints):
        if model._meta.app_label == "errorreports":
            return ERROR_REPORTS
        return None

    def db_for_write(self, model, **hints):
        if model._meta.app_label == "errorreports":
            return ERROR_REPORTS
        return None

    def allow_relation(self, obj1, obj2, **hints):
        if (
            obj1._meta.app_label == "errorreports"
            and obj2._meta.app_label == "errorreports"
        ):
            return True
        elif "errorreports" not in [obj1._meta.app_label, obj2._meta.app_label]:
            return None

        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        if app_label == "errorreports":
            return db == ERROR_REPORTS
        elif db == ERROR_REPORTS:
            return False

        return None


class ErrorReports(models.Model):
    category = models.CharField(max_length=10, choices=POSSIBLE_ERRORS)
    error_message = models.CharField(max_length=255)
    traceback = models.TextField()
    first_occurred = models.DateTimeField(default=timezone.now)
    last_occurred = models.DateTimeField(default=timezone.now)
    reported = models.BooleanField(default=False)
    events = models.IntegerField(default=1)
    context = JSONField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.error_message} ({self.category})"

    def clean(self):
        if self.category == FRONTEND:
            JSON_Schema_Validator(context_frontend_schema)(self.context)
        elif self.category == BACKEND:
            JSON_Schema_Validator(context_backend_schema)(self.context)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @classmethod
    def insert_or_update_error(cls, category, error_message, traceback, context):
        if getattr(settings, "DEVELOPER_MODE", False):
            logger.info(
                "ErrorReports: Database not updated, as DEVELOPER_MODE is True."
            )
            return
        error_report = cls.objects.filter(
            category=category, error_message=error_message, traceback=traceback
        ).first()
        if error_report is not None:
            error_report.events += 1
            error_report.last_occurred = timezone.now()
            if error_report.context.get("avg_request_time_to_error", None):
                context["avg_request_time_to_error"] = (
                    error_report.context["avg_request_time_to_error"]
                    * (error_report.events - 1)
                    + context["avg_request_time_to_error"]
                ) / error_report.events
                error_report.context = context
            error_report.save()
        else:
            error_report = cls.objects.create(
                category=category,
                error_message=error_message,
                traceback=traceback,
                context=context,
            )
        logger.error("ErrorReports: Database updated.")
        return error_report

    @classmethod
    def get_unreported_errors(cls):
        return cls.objects.filter(reported=False)

    @classmethod
    def delete_error(cls):
        pass
