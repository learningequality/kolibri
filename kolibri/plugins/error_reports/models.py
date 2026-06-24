import hashlib
import logging
import time

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F
from django.utils import timezone

import kolibri
from kolibri.core.fields import JSONField
from kolibri.core.utils.validators import JSON_Schema_Validator

from .constants import POSSIBLE_ERRORS
from .schemas import SCHEMA_MAP

logger = logging.getLogger(__name__)

# Cap on locally stored reports - deduplication bounds growth for organic
# errors, but distinct messages can otherwise grow the table without limit.
MAX_STORED_REPORTS = 1000

# Cap on the traceback text carried in a report's context - the report
# endpoint is unauthenticated, and the row cap above bounds the number of
# reports but not their size.
MAX_TRACEBACK_LENGTH = 65536

# Cap on the exception message carried in a report's context, for the same
# reason and to keep the identity fingerprint computed over a bounded value.
MAX_ERROR_MESSAGE_LENGTH = 1024


class ServerRun(models.Model):
    """
    One row per Kolibri server run. The auto-incrementing primary key
    provides a device-local, monotonically increasing run counter that is
    immune to wall clock changes, and start_monotonic records the system
    monotonic clock at run start, so that error occurrence times can be
    expressed as uptime relative to the run start. Together these allow
    the telemetry server to reconstruct occurrence times and ordering
    even when the device wall clock is unreliable.
    """

    start_monotonic = models.FloatField()
    started_at = models.DateTimeField(default=timezone.now)

    @classmethod
    def start_new_run(cls):
        run = cls.objects.create(start_monotonic=time.monotonic())
        # Only the most recent run is ever read, so prune older rows.
        # The new run is created first so that the highest id stays in the
        # table, preserving the monotonicity of the run counter.
        cls.objects.filter(id__lt=run.id).delete()
        return run

    @classmethod
    def get_current_anchor(cls):
        """
        Returns a (run_counter, run_uptime) tuple anchoring the current
        moment to the most recent server run, or (None, None) if no run
        has been recorded, or the recorded run is from a different boot
        of the system.
        """
        run = cls.objects.order_by("-id").first()
        if run is None:
            return None, None
        uptime = time.monotonic() - run.start_monotonic
        if uptime < 0:
            # The monotonic clock is behind the recorded run start, so the
            # run row must be from a previous boot of the system.
            return None, None
        return run.id, uptime


class ErrorReport(models.Model):
    category = models.CharField(max_length=10, choices=POSSIBLE_ERRORS)
    kolibri_version = models.CharField(max_length=100)
    # A hash of the report identity (category, version, the exception type and
    # value, and a stack signature) used to fold repeat occurrences into one
    # row. The message, type and stack themselves live in the Sentry-shaped
    # context; only this fixed-length digest is indexed, so the uniqueness
    # constraint is safe on every database - a raw traceback is too large to
    # index on some.
    fingerprint = models.CharField(max_length=64, unique=True)
    first_occurred = models.DateTimeField(default=timezone.now)
    last_occurred = models.DateTimeField(default=timezone.now)
    # Anchors expressing the first and last occurrence as uptime relative
    # to a ServerRun, for reconstructing occurrence times independently
    # of the device wall clock.
    first_occurred_run = models.IntegerField(null=True, blank=True)
    first_occurred_uptime = models.FloatField(null=True, blank=True)
    last_occurred_run = models.IntegerField(null=True, blank=True)
    last_occurred_uptime = models.FloatField(null=True, blank=True)
    reported = models.BooleanField(default=False)
    events = models.IntegerField(default=1)
    # The number of occurrences not yet included in a submission - the
    # delta the next submission carries, so that recurrences of an
    # already-reported error are re-reported without double-counting the
    # occurrences the telemetry server has already seen.
    events_since_reported = models.IntegerField(default=1)
    context = JSONField(
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"{self.category} {self.fingerprint[:12]}"

    def clean(self):
        schema = SCHEMA_MAP.get(self.category, None)
        if schema is None:
            raise ValidationError("Category not found in SCHEMA_MAP")
        JSON_Schema_Validator(schema)(self.context)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    @staticmethod
    def _identity_signature(context):
        """
        Extract the stable parts of a Sentry-shaped context that identify the
        error: the exception type and value, and a signature of the stack.
        The signature is built from the structured frames where present
        (stable across browsers and installations); tasks carry no frames, so
        it falls back to the raw traceback text in the context.
        """
        context = context or {}
        values = (context.get("exception") or {}).get("values") or []
        exception = values[0] if values else {}
        exception_type = exception.get("type") or ""
        value = exception.get("value") or ""
        frames = (exception.get("stacktrace") or {}).get("frames") or []
        if frames:
            stack = "\n".join(
                "{}|{}|{}".format(
                    frame.get("filename"), frame.get("function"), frame.get("lineno")
                )
                for frame in frames
            )
        else:
            stack = context.get("traceback") or ""
        return exception_type, value, stack

    @classmethod
    def fingerprint_for(cls, category, context):
        """
        The identity hash that folds repeat occurrences into one row. The
        version is part of it, so the same error before and after an upgrade
        is recorded separately.
        """
        exception_type, value, stack = cls._identity_signature(context)
        # NUL-separated so the parts cannot run together to form a collision.
        identity = "\0".join(
            [category, kolibri.__version__, exception_type, value, stack]
        )
        return hashlib.sha256(identity.encode("utf-8")).hexdigest()

    @classmethod
    def insert_or_update_error(cls, category, context):
        if getattr(settings, "DEVELOPER_MODE", False) or getattr(
            settings, "TESTING", False
        ):
            logger.info(
                "ErrorReport: Database not updated, as Kolibri is running in "
                "developer or test mode."
            )
            return
        # Copy so the caller's dict is never mutated by the running-average
        # bookkeeping below or by the sample-count seeding.
        if isinstance(context, dict):
            context = dict(context)
            # Seed the count of occurrences that carried a request time, so
            # the running average stays a mean over only those occurrences -
            # independent of the total event count. Only the backend path
            # records a time.
            if context.get("avg_request_time_to_error") is not None:
                context["request_time_samples"] = 1
        fingerprint = cls.fingerprint_for(category, context)
        run_counter, run_uptime = ServerRun.get_current_anchor()
        # The fingerprint is unique, so this get-or-create is atomic against
        # concurrent duplicate inserts - a recurrence updates the existing row
        # rather than creating a second.
        error_report, created = cls.objects.get_or_create(
            fingerprint=fingerprint,
            defaults={
                "category": category,
                "kolibri_version": kolibri.__version__,
                "context": context,
                "first_occurred_run": run_counter,
                "first_occurred_uptime": run_uptime,
                "last_occurred_run": run_counter,
                "last_occurred_uptime": run_uptime,
            },
        )
        if not created:
            # Carry the running average across before the context is replaced.
            # It lives in context, and the recurrence's context overwrites the
            # stored one last-write-wins below, so the accumulated mean - over
            # the occurrences that carried a time (request_time_samples), not
            # over all events - must be folded in here. The stored context is
            # read from the row as get_or_create fetched it.
            stored_context = error_report.context or {}
            stored_avg = stored_context.get("avg_request_time_to_error")
            stored_samples = stored_context.get("request_time_samples", 0)
            new_time = context.get("avg_request_time_to_error") if context else None
            if isinstance(context, dict) and (
                new_time is not None or stored_avg is not None
            ):
                if new_time is None:
                    # No time this occurrence; keep the accumulated average.
                    context["avg_request_time_to_error"] = stored_avg
                    context["request_time_samples"] = stored_samples
                else:
                    if stored_avg is not None and stored_samples:
                        new_time = (stored_avg * stored_samples + new_time) / (
                            stored_samples + 1
                        )
                    context["avg_request_time_to_error"] = new_time
                    context["request_time_samples"] = stored_samples + 1
            # A single atomic UPDATE records the recurrence. The event counts
            # are incremented in the database (F expressions) so concurrent
            # occurrences are not lost to a stale read; reported is reset so a
            # recurrence of an already-reported error is re-submitted, carrying
            # events_since_reported as the delta the telemetry server has not
            # yet seen. last_occurred and context are last-write-wins - the
            # recurrence's context replaces the stored one so breadcrumbs etc.
            # reflect the most recent occurrence. Going through the queryset
            # rather than save() deliberately skips full_clean(): this is the
            # error-storm hot path, and validating (including the validate_unique
            # fingerprint query) on every recurrence is needless work - the
            # context shape was already validated when the row was created.
            cls.objects.filter(pk=error_report.pk).update(
                events=F("events") + 1,
                events_since_reported=F("events_since_reported") + 1,
                reported=False,
                last_occurred=timezone.now(),
                last_occurred_run=run_counter,
                last_occurred_uptime=run_uptime,
                context=context,
            )
            # Refresh so the returned object reflects the incremented counts.
            error_report.refresh_from_db()
        else:
            cls.prune()
        logger.info("ErrorReport: Database updated.")
        return error_report

    @classmethod
    def prune(cls):
        """
        Keep the number of stored reports at or below MAX_STORED_REPORTS,
        deleting already-reported reports first, oldest first.
        """
        # Order the reports to keep first - unreported, then most recent -
        # and delete everything beyond the cap.
        excess_ids = list(
            cls.objects.order_by("reported", "-last_occurred").values_list(
                "id", flat=True
            )[MAX_STORED_REPORTS:]
        )
        if excess_ids:
            cls.objects.filter(id__in=excess_ids).delete()

    @classmethod
    def get_unreported_errors(cls):
        return cls.objects.filter(reported=False)
