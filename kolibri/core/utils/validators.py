from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from json_schema_validator import errors as jsonschema_exceptions
from json_schema_validator.schema import Schema
from json_schema_validator.validator import Validator


@deconstructible
class JSON_Schema_Validator(object):
    def __init__(self, schema):
        self.schema = Schema(schema)

    def __call__(self, value):
        try:
            Validator.validate(self.schema, value)
        except jsonschema_exceptions.ValidationError as e:
            raise ValidationError(e.message, code="invalid")
        return value

    def __eq__(self, other):
        if not hasattr(other, "deconstruct"):
            return False
        return self.deconstruct() == other.deconstruct()


@deconstructible
class NoRepeatedValueJSONArrayValidator(object):
    def __init__(self, array_key=None, object_key=None):
        """
        A validator that checks that the values of the array are unique.
        This assumes that the JSON is passed as a Python dictionary or list.
        :param array_key: the key of the object that the array is stored at.
        If None, then the array must be the passed value.
        :param object_key: the comparison key for objects in the array.
        Not needed for simple types.
        """
        self.array_key = array_key
        self.object_key = object_key

    def __call__(self, value):
        value_to_check = value
        if self.array_key:
            value_to_check = value.get(self.array_key, [])
        if not isinstance(value_to_check, list):
            raise ValidationError(
                "Value must be an array"
                + (" ({})".format(self.array_key) if self.array_key else ""),
                code="invalid",
            )
        if self.object_key is not None:
            values = [v[self.object_key] for v in value_to_check]
        else:
            values = value_to_check
        if len(values) != len(set(values)):
            raise ValidationError(
                "Array must contain unique values"
                + (" ({})".format(self.array_key) if self.array_key else ""),
                code="invalid",
            )
        return value

    def __eq__(self, other):
        if not hasattr(other, "deconstruct"):
            return False
        return self.deconstruct() == other.deconstruct()
