import hashlib
import logging
import time
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db import router
from django.db import transaction
from django.db.models import F

import kolibri
from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import JSONField
from kolibri.utils.time_utils import local_now

from .constants import BACKEND
from .constants import POSSIBLE_ERRORS
from .constants import TASK
from .serializers import CONTEXT_SERIALIZERS

logger = logging.getLogger(__name__)

# Cap on locally stored reports - deduplication bounds growth for organic
# errors, but distinct messages can otherwise grow the table without limit.
MAX_STORED_REPORTS = 1000

MAX_RECORDED_SUBMISSIONS = 1000


def _url_path(url):
    try:
        return urlsplit(url or "").path
    except ValueError:
        return url


def _uptime_clock():
    # CLOCK_BOOTTIME (Linux, Android) keeps counting while the device is
    # suspended; time.monotonic() stops on Linux and macOS.
    if hasattr(time, "CLOCK_BOOTTIME"):
        return time.clock_gettime(time.CLOCK_BOOTTIME)
    return time.monotonic()


class ServerRun(models.Model):
    """
    One row per Kolibri server run. The auto-incrementing primary key
    provides a device-local, monotonically increasing run counter that is
    immune to wall clock changes, and start_monotonic records the system
    boot clock at run start, so that error occurrence times can be
    expressed as uptime relative to the run start. Together these allow
    the telemetry server to reconstruct occurrence times and ordering
    even when the device wall clock is unreliable. On macOS the uptime
    excludes time the device spent asleep.
    """

    start_monotonic = models.FloatField()

    @classmethod
    def start_new_run(cls):
        run = cls.objects.create(start_monotonic=_uptime_clock())
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
        uptime = _uptime_clock() - run.start_monotonic
        if uptime < 0:
            # The boot clock is behind the recorded run start, so the run
            # row must be from a previous boot of the system.
            return None, None
        return run.id, uptime


class ErrorReport(models.Model):
    category = models.CharField(max_length=10, choices=POSSIBLE_ERRORS)
    kolibri_version = models.CharField(max_length=100)
    # A hash of the report identity (category, version, the exception type,
    # value (frontend/frameless only), and a stack signature) used to fold
    # repeat occurrences into one row. The message, type and stack themselves
    # live in the Sentry-shaped context; only this fixed-length digest is
    # indexed, so the uniqueness constraint is safe on every database - a raw
    # traceback is too large to index on some.
    fingerprint = models.CharField(max_length=64, unique=True)
    first_occurred = DateTimeTzField(default=local_now)
    last_occurred = DateTimeTzField(default=local_now)
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

    @staticmethod
    def _validated_context(category, context):
        serializer_class = CONTEXT_SERIALIZERS.get(category)
        if serializer_class is None:
            raise ValidationError("Unknown error report category.")
        serializer = serializer_class(data=context)
        if not serializer.is_valid():
            raise ValidationError(str(serializer.errors))
        return serializer.validated_data

    def clean(self):
        self.context = self._validated_context(self.category, self.context)

    def save(self, *args, **kwargs):
        # get_or_create recovers from a concurrent insert's IntegrityError, but
        # not from the ValidationError validate_unique raises for it.
        self.full_clean(validate_unique=False)
        super().save(*args, **kwargs)

    @staticmethod
    def _identity_signature(category, context):
        """
        Extract the stable parts of a Sentry-shaped context that identify the
        error: the exception type and value, and a signature of the stack.
        The signature is built from the structured frames where present, using
        only the path of each frame's filename so the same frontend error is
        not split by the origin the client reached the server on; without
        frames, it falls back to the raw traceback text in the context.
        Backend and task frames carry real file and line numbers, so, as in
        Sentry, the value is left out there; frontend frames come from minified
        bundles, where nearly every frame is on line 1, so the column and the
        value are needed to tell errors apart.
        """
        context = context or {}
        values = (context.get("exception") or {}).get("values") or []
        exception = values[0] if values else {}
        exception_type = exception.get("type") or ""
        frames = (exception.get("stacktrace") or {}).get("frames") or []
        value = (
            ""
            if frames and category in (BACKEND, TASK)
            else exception.get("value") or ""
        )
        if frames:
            stack = "\n".join(
                f"{_url_path(frame.get('filename'))}|{frame.get('function')}"
                f"|{frame.get('lineno')}|{frame.get('colno')}"
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
        exception_type, value, stack = cls._identity_signature(category, context)
        # NUL-separated so the parts cannot run together to form a collision.
        identity = (
            f"{category}\0{kolibri.__version__}\0{exception_type}\0{value}\0{stack}"
        )
        return hashlib.sha256(identity.encode("utf-8")).hexdigest()

    @classmethod
    def insert_or_update_error(
        cls, category, context, occurrences=1, submission_id=None
    ):
        if getattr(settings, "DEVELOPER_MODE", False) or getattr(
            settings, "TESTING", False
        ):
            logger.info(
                "ErrorReport: Database not updated, as Kolibri is running in "
                "developer or test mode."
            )
            return None
        with transaction.atomic(using=router.db_for_write(cls)):
            if submission_id is not None:
                occurrences = ErrorReportSubmission.record(submission_id, occurrences)
                if not occurrences:
                    return None
            return cls._record_occurrence(category, context, occurrences)

    @classmethod
    def _record_occurrence(cls, category, context, occurrences):
        context = cls._validated_context(category, context)
        # Seed the count of occurrences that carried a request time, so
        # the running average stays a mean over only those occurrences -
        # independent of the total event count.
        if context.get("avg_request_time_to_error") is not None:
            context["request_time_samples"] = 1
        fingerprint = cls.fingerprint_for(category, context)
        run_counter, run_uptime = ServerRun.get_current_anchor()
        error_report, created = cls.objects.get_or_create(
            fingerprint=fingerprint,
            defaults={
                "category": category,
                "kolibri_version": kolibri.__version__,
                "context": context,
                "events": occurrences,
                "events_since_reported": occurrences,
                "first_occurred_run": run_counter,
                "first_occurred_uptime": run_uptime,
                "last_occurred_run": run_counter,
                "last_occurred_uptime": run_uptime,
            },
        )
        if not created:
            stored_context = error_report.context or {}
            stored_avg = stored_context.get("avg_request_time_to_error")
            stored_samples = stored_context.get("request_time_samples", 0)
            new_time = context.get("avg_request_time_to_error")
            if new_time is not None or stored_avg is not None:
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
            cls.objects.filter(pk=error_report.pk).update(
                events=F("events") + occurrences,
                events_since_reported=F("events_since_reported") + occurrences,
                reported=False,
                last_occurred=local_now(),
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


class ErrorReportSubmission(models.Model):
    """
    The ids of recently accepted frontend submissions, so that the same queued
    report sent again - by another tab sharing the queue, or as a retry after
    a lost response - is not counted twice.
    """

    submission_id = models.UUIDField(unique=True)
    occurrences = models.IntegerField(default=0)

    @classmethod
    def record(cls, submission_id, occurrences):
        """
        Returns how many of the submitted occurrences were not already recorded
        under the same submission id.
        """
        submission, created = cls.objects.select_for_update().get_or_create(
            submission_id=submission_id, defaults={"occurrences": occurrences}
        )
        if created:
            excess_ids = list(
                cls.objects.order_by("-id").values_list("id", flat=True)[
                    MAX_RECORDED_SUBMISSIONS:
                ]
            )
            cls.objects.filter(id__in=excess_ids).delete()
            return occurrences
        unrecorded = max(occurrences - submission.occurrences, 0)
        if unrecorded:
            submission.occurrences = occurrences
            submission.save(update_fields=["occurrences"])
        return unrecorded
