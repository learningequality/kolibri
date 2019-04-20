from django.core.exceptions import ValidationError


class KolibriError(Exception):
    pass


class KolibriValidationError(ValidationError, KolibriError):
    pass


class KolibriUpgradeError(KolibriError):
    """
    Should be used whenever an error arises that is due to an anticipated future incompatible change,
    for example: change in content database schemas, change in content that is not supported by old versions
    of Kolibri.
    """

    pass
