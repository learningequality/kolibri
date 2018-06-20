import pytz

from django.utils import timezone
from rest_framework.serializers import DateTimeField, ModelSerializer
from .fields import DateTimeTzField as DjangoDateTimeTzField

class DateTimeTzField(DateTimeField):

    def to_internal_value(self, data):
        data = super(DateTimeTzField, self).to_internal_value(data)
        tz = timezone.get_current_timezone()
        if not data.tzinfo:
            data = timezone.make_aware(data, pytz.utc)
        return data.astimezone(tz)


serializer_field_mapping = {
    DjangoDateTimeTzField: DateTimeTzField,
}

serializer_field_mapping.update(ModelSerializer.serializer_field_mapping)

class KolibriModelSerializer(ModelSerializer):

    serializer_field_mapping = serializer_field_mapping

    def update(self, instance, validated_data):
        skipped_fields = ['user', 'start_timestamp']
        for attr, value in validated_data.items():

            if attr not in skipped_fields and self.data[attr] != validated_data[attr]:
                setattr(instance, attr, value)
        instance.save()

        return instance