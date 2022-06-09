import copy

from rest_framework import serializers

from kolibri.core.tasks.job import State


class JobValidator(serializers.Serializer):
    """
    A serializer class for validating and deserializing job data.
    Task is included for completeness of documentation of expected fields.
    But we will validate the existence of this before we get to this point.
    """

    type = serializers.CharField(required=True)

    def validate(self, data):
        kwargs = data.copy()
        kwargs.pop("type")
        return {
            "args": (),
            "kwargs": kwargs,
            "extra_metadata": {},
        }

    def validate_for_restart(self, job):
        """
        :param job: The job for which to restart
        :type job: kolibri.core.tasks.job.Job
        :return: A dictionary of data for instantiating a new job
        """
        if job.state not in [State.CANCELED, State.FAILED]:
            raise serializers.ValidationError(
                "Cannot restart job with state={}".format(job.state)
            )

        return {
            # default behavior is to retain the same job ID, so the existing job requires deletion
            "job_id": job.job_id,
            "args": copy.copy(job.args),
            "kwargs": copy.copy(job.kwargs),
            "track_progress": job.track_progress,
            "cancellable": job.cancellable,
            "extra_metadata": job.extra_metadata.copy(),
            "facility_id": job.facility_id,
        }

    def to_representation(self, instance):
        return self.validate_for_restart(instance or self.instance)

    def run_validation(self, data):
        value = super(JobValidator, self).run_validation(data)
        if not isinstance(value, dict):
            raise TypeError("Validator must return a dict.")
        extra_metadata = value.get("extra_metadata", {})
        if extra_metadata is not None and not isinstance(extra_metadata, dict):
            raise TypeError("'extra_metadata' must be a dict.")
        if "user" in self.context and self.context["user"].is_authenticated:
            user = self.context["user"]
            extra_metadata.update(
                {
                    "started_by": user.id,
                    "started_by_username": user.username,
                }
            )
        value["extra_metadata"] = extra_metadata
        return value
