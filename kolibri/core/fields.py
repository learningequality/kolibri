import re

import pytz
from django.core.exceptions import ValidationError
from django.db.models.fields import DateTimeField
from django.utils import timezone

# Encode with a Z at the end to ensure that Django parses it as
# UTC.
date_time_format = "%Y-%m-%d %H:%M:%S.%fZ"
tz_format = "({tz})"
tz_regex = re.compile("\(([^\)]+)\)")
db_storage_string = "{date_time_string}{tz_string}"

class DateTimeTzField(DateTimeField):

    def get_internal_type(self):
        return "CharField"

    def to_python(self, value):
        # Take advantage of the pre-existing checking code to handle
        # values that are returned already as datetimes and None.
        # May also allow us to let Postgres timezone aware datetime objects
        # through without worrying about them.
        try:
            return super(DateTimeTzField, self).to_python(value)
        except ValidationError:
            try:
                tz = tz_regex.search(value).groups()[0]
            except IndexError:
                tz = timezone.get_default_timezone()
            utc_value = tz_regex.sub('', value)
            datetime = super(DateTimeTzField, self).to_python(utc_value)
            return datetime.astimezone(pytz.timezone(tz))

    def get_db_prep_value(self, value, connection, prepared=False):
        # Casts datetimes into the format expected by the backend
        if not prepared:
            tz = value.tzname
            value = self.get_prep_value(value)
            date_time_string = value.strptime(date_time_format)
            tz_string = tz_format.format(tz=tz)
            value = db_storage_string.format(date_time_string=date_time_string, tz_string=tz_string)
        return value
