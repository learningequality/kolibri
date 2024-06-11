import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from kolibri.deployment.default.sqlite_db_names import ERROR_REPORTS


logger = logging.getLogger(__name__)


class ErrorReportsRouter(object):
    """
    Determine how to route database calls for the ErrorReports app.
    ref: https://docs.djangoproject.com/en/5.0/topics/db/multi-db/

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
    FRONTEND = "frontend"
    BACKEND = "backend"
    POSSIBLE_ERRORS = [
        (FRONTEND, "Frontend"),
        (BACKEND, "Backend"),
    ]

    error_from = models.CharField(max_length=10, choices=POSSIBLE_ERRORS)
    error_message = models.CharField(max_length=255)
    traceback = models.TextField()
    first_occurred = models.DateTimeField(default=timezone.now)
    last_occurred = models.DateTimeField(default=timezone.now)
    sent = models.BooleanField(default=False)
    no_of_errors = models.IntegerField(default=1)

    def __str__(self):
        return f"{self.error_message} ({self.error_from})"

    def mark_as_sent(self):
        self.sent = True
        self.save()

    @classmethod
    def insert_or_update_error(cls, error_from, error_message, traceback):
        if not getattr(settings, "DEVELOPER_MODE", None):
            error, created = cls.objects.get_or_create(
                error_from=error_from, error_message=error_message, traceback=traceback
            )
            if not created:
                error.no_of_errors += 1
                error.last_occurred = timezone.now()
                error.save()
            logger.error("ErrorReports: Database updated.")
            return error
        logger.error("ErrorReports: Database not updated, as DEVELOPER_MODE is True.")
        return None

    @classmethod
    def get_unsent_errors(cls):
        return cls.objects.filter(sent=False)

    @classmethod
    def delete_error(cls):
        pass
