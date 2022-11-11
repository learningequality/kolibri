from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible
from jsonschema import exceptions as jsonschema_exceptions
from jsonschema import validate


@deconstructible
class JSON_Schema_Validator(object):
    def __init__(self, schema):
        self.schema = schema

    def __call__(self, value):
        try:
            validate(value, self.schema)
        except jsonschema_exceptions.ValidationError as e:
            raise ValidationError(e.message, code="invalid")
        return value

    def __eq__(self, other):
        if not hasattr(other, "deconstruct"):
            return False
        return self.deconstruct() == other.deconstruct()
