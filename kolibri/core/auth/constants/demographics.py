from django.core.exceptions import ValidationError
from django.utils.deconstruct import deconstructible

from kolibri.core.utils.validators import JSON_Schema_Validator
from kolibri.core.utils.validators import NoRepeatedValueJSONArrayValidator
from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES


MALE = "MALE"
FEMALE = "FEMALE"
NOT_SPECIFIED = "NOT_SPECIFIED"
DEFERRED = "DEFERRED"


choices = (
    (MALE, "Male"),
    (FEMALE, "Female"),
    (NOT_SPECIFIED, "Not specified"),
    (DEFERRED, "Defers for later"),
)

DEMO_FIELDS = ("gender", "birth_year", "id_number")


# '"optional":True' is obsolete but needed while we keep using an
# old json_schema_validator version compatible with python 2.7.
# "additionalProperties": False must be avoided for backwards compatibility
translations_schema = {
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            # KOLIBRI_SUPPORTED_LANGUAGES is a set of strings, so we use sorted
            # to coerce it to a list with a consistent ordering.
            # If we don't do this, every time we initialize, Django thinks it has changed
            # and will try to create a new migration.
            "language": {"type": "string", "enum": sorted(KOLIBRI_SUPPORTED_LANGUAGES)},
            "message": {"type": "string"},
        },
    },
    "optional": True,
}


custom_demographic_field_schema = {
    "type": "object",
    "properties": {
        "id": {
            "type": "string",
        },
        "description": {"type": "string"},
        "enumValues": {
            "type": "array",
            "items": {
                "type": "object",
                "properties": {
                    "value": {"type": "string"},
                    "defaultLabel": {"type": "string"},
                    "translations": translations_schema,
                },
            },
        },
        "translations": translations_schema,
    },
}


custom_demographics_schema = {
    "type": "array",
    "items": custom_demographic_field_schema,
    "optional": True,
}


@deconstructible
class UniqueIdsValidator(NoRepeatedValueJSONArrayValidator):
    def __init__(self, custom_demographics_key):
        super(UniqueIdsValidator, self).__init__(
            array_key=custom_demographics_key, object_key="id"
        )


unique_translations_validator = NoRepeatedValueJSONArrayValidator(
    array_key="translations",
    object_key="language",
)


@deconstructible
class DescriptionTranslationValidator(object):
    def __init__(self, custom_demographics_key):
        self.custom_demographics_key = custom_demographics_key

    def __call__(self, value):
        for item in value.get(self.custom_demographics_key, []):
            try:
                unique_translations_validator(item)
            except ValidationError:
                raise ValidationError(
                    "User facing description translations for '{} ({})' must be unique by language".format(
                        item["description"], item["id"]
                    ),
                    code="invalid",
                )
        return value


unique_value_validator = NoRepeatedValueJSONArrayValidator(
    object_key="value",
)


@deconstructible
class EnumValuesValidator(object):
    def __init__(self, custom_demographics_key):
        self.custom_demographics_key = custom_demographics_key

    def __call__(self, value):
        for item in value.get(self.custom_demographics_key, []):
            enum_values = item.get("enumValues", [])
            try:
                unique_value_validator(enum_values)
            except ValidationError:
                raise ValidationError(
                    "Possible values for '{} ({})' must be unique".format(
                        item["description"], item["id"]
                    ),
                    code="invalid",
                )
        return value


@deconstructible
class LabelTranslationValidator(object):
    def __init__(self, custom_demographics_key):
        self.custom_demographics_key = custom_demographics_key

    def __call__(self, value):
        for item in value.get(self.custom_demographics_key, []):
            for enumValue in item.get("enumValues", []):
                try:
                    unique_translations_validator(enumValue)
                except ValidationError:
                    raise ValidationError(
                        "User facing label translations for value '{} ({})' in '{} ({})' must be unique by language".format(
                            enumValue["defaultLabel"],
                            enumValue["value"],
                            item["description"],
                            item["id"],
                        ),
                        code="invalid",
                    )
        return value


class FacilityUserDemographicValidator(JSON_Schema_Validator):
    def __init__(self, custom_schema):
        schema = {
            "type": "object",
            "properties": {},
        }
        for field in custom_schema:
            schema["properties"][field["id"]] = {
                "type": "string",
                "enum": [enum["value"] for enum in field["enumValues"]],
            }
        super(FacilityUserDemographicValidator, self).__init__(schema)
