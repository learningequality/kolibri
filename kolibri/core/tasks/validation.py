from datetime import timedelta

from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError

from kolibri.core.tasks.constants import Priority


def validate_repeat(value):
    if value is not None and (not isinstance(value, int) or value < 0):
        raise ValueError(
            "Must specify repeat greater than equal to 0 or None (repeat forever)"
        )


def validate_interval(value):
    if not isinstance(value, int) or value <= 0:
        raise ValueError("intervals must be a positive integer number of seconds")


def validate_priority(value):
    if value not in Priority.Priorities:
        raise ValueError(
            "priority must be one of {}".format(
                ", ".join(str(pri) for pri in Priority.Priorities)
            )
        )


def validate_timedelay(value):
    if not isinstance(value, timedelta):
        raise TypeError("time delay must be a datetime.timedelta object")


class EnqueueArgsSerializer(serializers.Serializer):
    """
    A serializer for `enqueue_args` object of incoming user request data.
    """

    enqueue_at = serializers.DateTimeField(required=False)
    enqueue_in = serializers.DurationField(required=False)
    repeat = serializers.IntegerField(required=False, allow_null=True, min_value=1)
    repeat_interval = serializers.IntegerField(required=False, min_value=1)
    retry_interval = serializers.IntegerField(
        required=False, allow_null=True, min_value=0
    )
    priority = serializers.ChoiceField(choices=Priority.Priorities, required=False)

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
        return {
            "args": (),
            "kwargs": data,
            "extra_metadata": {},
        }

    def _verify_args(self, value):
        args = value.get("args")
        if args is None:
            value["args"] = ()
        elif not isinstance(args, (list, tuple)):
            raise TypeError("'args' must be a list or tuple.")

    def _verify_kwargs(self, value):
        kwargs = value.get("kwargs")
        if kwargs is None:
            value["kwargs"] = {}
        elif not isinstance(kwargs, dict):
            raise TypeError("'kwargs' must be a dict.")

    def run_validation(self, data):
        """
        Vendored and modified from rest_framework/serializers.py to allow removing
        the type argument and enqueue_args before passing to the validate method.
        This means that the validate method will only be concerned with additional
        validation of the data set by the subclasses.
        """
        (is_empty_value, data) = self.validate_empty_values(data)
        if is_empty_value:
            return data

        value = self.to_internal_value(data)
        try:
            self.run_validators(value)
            value.pop("type")
            enqueue_args = value.pop("enqueue_args", {})
            value = self.validate(value)
            value["enqueue_args"] = enqueue_args
        except (ValidationError, DjangoValidationError) as exc:
            raise ValidationError(detail=serializers.as_serializer_error(exc))

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

        self._verify_args(value)

        self._verify_kwargs(value)

        return value
