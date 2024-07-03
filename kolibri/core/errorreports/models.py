import logging

from django.conf import settings
from django.db import models
from django.utils import timezone

from .constants import POSSIBLE_ERRORS
from .schemas import context_backend_schema
from .schemas import context_frontend_schema
from .schemas import default_context_backend_schema
from .schemas import default_context_frontend_schema
from kolibri import VERSION
from kolibri.core.fields import JSONField
from kolibri.core.utils.validators import JSON_Schema_Validator
from kolibri.deployment.default.sqlite_db_names import ERROR_REPORTS
from kolibri.utils.server import installation_type


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
    release_version = models.CharField(
        max_length=64, default=".".join(map(str, VERSION[:2]))
    )
    installation_type = models.CharField(max_length=64, blank=True)
    context_frontend = JSONField(
        null=True,
        blank=True,
        validators=[JSON_Schema_Validator(context_frontend_schema)],
        default=default_context_frontend_schema,
    )
    context_backend = JSONField(
        null=True,
        blank=True,
        validators=[JSON_Schema_Validator(context_backend_schema)],
        default=default_context_backend_schema,
    )

    def __str__(self):
        return f"{self.error_message} ({self.category})"

    def mark_reported(self):
        self.reported = True
        self.save()

    @classmethod
    def insert_or_update_error(
        cls,
        category,
        error_message,
        traceback,
        context_frontend=None,
        context_backend=None,
    ):
        if getattr(settings, "DEVELOPER_MODE", None):
            error, created = cls.objects.get_or_create(
                category=category,
                error_message=error_message,
                traceback=traceback,
                context_frontend=context_frontend,
                context_backend=context_backend,
                release_version=".".join(map(str, VERSION[:2])),
                installation_type=installation_type(),
            )
            if not created:
                error.events += 1
                error.last_occurred = timezone.now()
                error.save()
            logger.error("ErrorReports: Database updated.")
            return error
        logger.error("ErrorReports: Database not updated, as DEVELOPER_MODE is True.")
        return None

    @classmethod
    def get_unreported_errors(cls):
        return cls.objects.filter(reported=False)

    @classmethod
    def delete_error(cls):
        pass
