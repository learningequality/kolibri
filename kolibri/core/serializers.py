from collections import Mapping
from collections import OrderedDict

import pytz
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from rest_framework.fields import empty
from rest_framework.fields import SkipField
from rest_framework.serializers import as_serializer_error
from rest_framework.serializers import DateTimeField
from rest_framework.serializers import get_error_detail
from rest_framework.serializers import ModelSerializer
from rest_framework.serializers import set_value
from rest_framework.settings import api_settings

from .fields import DateTimeTzField as DjangoDateTimeTzField


class DateTimeTzField(DateTimeField):
    def to_internal_value(self, data):
        data = super(DateTimeTzField, self).to_internal_value(data)
        tz = timezone.get_current_timezone()
        if not data.tzinfo:
            data = timezone.make_aware(data, pytz.utc)
        return data.astimezone(tz)


serializer_field_mapping = {DjangoDateTimeTzField: DateTimeTzField}

serializer_field_mapping.update(ModelSerializer.serializer_field_mapping)


class KolibriModelSerializer(ModelSerializer):

    serializer_field_mapping = serializer_field_mapping

    def run_validation(self, data=empty):

        """
        We override the default `run_validation`, because the validation
        performed by validators and the `.validate()` method should
        be coerced into an error dictionary with a 'non_fields_error' key.
        """
        (is_empty_value, data) = self.validate_empty_values(data)
        if is_empty_value:
            return data
        try:
            # If we are creating the object (POST) we run the ModelSerializer validation.
            # This reduced validation is executed only when updating (PATCH):
            if self.partial:
                value = self.update_to_internal_value(data)
            else:
                value = self.to_internal_value(data)
        except (ValidationError, DjangoValidationError) as exc:
            raise ValidationError(detail=as_serializer_error(exc))

        return value

    def update_to_internal_value(self, data):

        """
        Dict of native values <- Dict of primitive datatypes.
        """
        if not isinstance(data, Mapping):
            message = self.error_messages["invalid"].format(
                datatype=type(data).__name__
            )
            raise ValidationError(
                {api_settings.NON_FIELD_ERRORS_KEY: [message]}, code="invalid"
            )

        ret = OrderedDict()
        errors = OrderedDict()
        fields = [
            self.fields[field_name]
            for field_name in data
            if field_name in self.fields
            if not self.fields[field_name].read_only
        ]

        for field in fields:
            # fields that are computed methods don't need validation:
            if field.read_only:
                continue
            validate_method = getattr(self, "validate_" + field.field_name, None)
            try:
                validated_value = field.run_validation(data[field.field_name])
                if validate_method is not None:
                    validated_value = validate_method(validated_value)
            except ValidationError as exc:
                errors[field.field_name] = exc.detail
            except DjangoValidationError as exc:
                errors[field.field_name] = get_error_detail(exc)
            except (KeyError, SkipField):
                pass

            else:
                set_value(ret, field.source_attrs, validated_value)

        if errors:
            raise ValidationError(errors)

        return ret
