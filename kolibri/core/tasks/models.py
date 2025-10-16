from django.db import models

from kolibri.deployment.default.sqlite_db_names import JOB_STORAGE


class KolibriTasksRouter(object):
    """
    Determine how to route database calls for the kolibritasks app.
    All other models will be routed to the default database.
    """

    def db_for_read(self, model, **hints):
        """Send all read operations on kolibritasks app models to JOB_STORAGE."""
        if model._meta.app_label == "kolibritasks":
            return JOB_STORAGE
        return None

    def db_for_write(self, model, **hints):
        """Send all write operations on kolibritasks app models to JOB_STORAGE."""
        if model._meta.app_label == "kolibritasks":
            return JOB_STORAGE
        return None

    def allow_relation(self, obj1, obj2, **hints):
        """Determine if relationship is allowed between two objects."""

        if (
            obj1._meta.app_label == "kolibritasks"
            and obj2._meta.app_label == "kolibritasks"
        ):
            return True
        elif "kolibritasks" not in [obj1._meta.app_label, obj2._meta.app_label]:
            return None

        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """Ensure that the kolibritasks app's models get created on the right database."""
        if app_label == "kolibritasks":
            # The kolibritasks app should be migrated only on the JOB_STORAGE database.
            return db == JOB_STORAGE
        elif db == JOB_STORAGE:
            # Ensure that all other apps don't get migrated on the JOB_STORAGE database.
            return False

        # No opinion for all other scenarios
        return None


class Job(models.Model):
    """
    Django model corresponding to the 'jobs' table in SQLAlchemy.

    This model is not meant to be used for normal CRUD operations (yet).
    It exists solely for Django to manage the migrations
    of the 'jobs' table, which is handled by SQLAlchemy.
    """

    # The hex UUID given to the job upon first creation.
    id = models.CharField(max_length=36, primary_key=True)

    # The job's state. Inflated here for easier querying to the job's state.
    state = models.CharField(max_length=20, db_index=True)

    # The job's function string. Inflated here for easier querying of which task type it is.
    func = models.CharField(max_length=200, db_index=True)

    # The job's priority. Helps to decide which job to run next.
    priority = models.IntegerField(db_index=True)

    # The queue name passed to the client when the job is scheduled.
    queue = models.CharField(max_length=50, db_index=True)

    # The JSON string that represents the job
    saved_job = models.TextField()

    time_created = models.DateTimeField(null=True, blank=True)
    time_updated = models.DateTimeField(null=True, blank=True)

    # Repeat interval in seconds.
    interval = models.IntegerField(default=0)

    # Retry interval in seconds.
    retry_interval = models.IntegerField(null=True, blank=True)

    # Number of times to repeat - None means repeat forever.
    repeat = models.IntegerField(null=True, blank=True)

    scheduled_time = models.DateTimeField(null=True, blank=True)

    # Optional references to the worker host, process and thread that are running this job,
    # and any extra metadata that can be used by specific worker implementations.
    worker_host = models.CharField(max_length=100, null=True, blank=True)
    worker_process = models.CharField(max_length=50, null=True, blank=True)
    worker_thread = models.CharField(max_length=50, null=True, blank=True)
    worker_extra = models.TextField(null=True, blank=True)

    # Columns for retry logic
    # Number of times the job has been retried
    retries = models.IntegerField(null=True, blank=True)
    # Maximum number of retries allowed for the job
    max_retries = models.IntegerField(null=True, blank=True)

    class Meta:
        db_table = "jobs"
        indexes = [
            models.Index(
                fields=["queue", "scheduled_time"], name="queue__scheduled_time"
            ),
        ]

    def __str__(self):
        return f"Job {self.id} - {self.func} ({self.state})"
