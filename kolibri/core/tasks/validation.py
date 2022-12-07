from rest_framework import serializers

from kolibri.core.serializers import DateTimeTzField


class EnqueueArgsSerializer(serializers.Serializer):
    """
    A serializer for `enqueue_args` object of incoming user request data.
    """

    enqueue_at = DateTimeTzField(required=False)
    enqueue_in = serializers.DurationField(required=False)
    repeat = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    repeat_interval = serializers.IntegerField(required=False, min_value=1)
    retry_interval = serializers.IntegerField(required=False, min_value=0)

    def validate(self, data):
        if data.get("enqueue_at") and data.get("enqueue_in"):
            raise serializers.ValidationError(
                "Specify either `enqueue_at` or `enqueue_in`. Cannot specify both."
            )
        elif not data.get("enqueue_at") and not data.get("enqueue_in"):
            if "repeat" in data:
                raise serializers.ValidationError(
                    "`repeat` can only be specified when either `enqueue_in` or `enqueue_at` is specified."
                )
            elif "repeat_interval" in data:
                raise serializers.ValidationError(
                    "`repeat_interval` can only be specified when either `enqueue_in` or `enqueue_at` is specified."
                )
        elif data.get("enqueue_at") or data.get("enqueue_in"):
            if "repeat" in data and "repeat_interval" not in data:
                raise serializers.ValidationError(
                    "`repeat_interval` must be specified when `repeat` is specified."
                )
            elif "repeat_interval" in data and "repeat" not in data:
                raise serializers.ValidationError(
                    "`repeat` must be specified when `repeat_interval` is specified."
                )
        return data


class JobValidator(serializers.Serializer):
    """
    A serializer class for validating and deserializing job data.
    Task is included for completeness of documentation of expected fields.
    But we will validate the existence of this before we get to this point.
    """

    type = serializers.CharField(required=True)
    enqueue_args = EnqueueArgsSerializer(required=False)

    def validate(self, data):
        kwargs = data.copy()
        kwargs.pop("type")
        kwargs.pop("enqueue_args", None)
        return {
            "args": (),
            "kwargs": kwargs,
            "extra_metadata": {},
        }

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
