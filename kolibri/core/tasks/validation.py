from rest_framework import serializers


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
