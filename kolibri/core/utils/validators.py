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
