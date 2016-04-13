from django.core.exceptions import ValidationError


class KolibriError(Exception):
    pass


class KolibriValidationError(ValidationError, KolibriError):
    pass
