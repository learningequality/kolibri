import datetime
import re

import pytz
from django.db.models.fields import Field
from django.utils import timezone

date_time_format = "%Y-%m-%d %H:%M:%S.%f"
tz_format = "({tz})"
tz_regex = re.compile("\(([^\)]+)\)")
db_storage_string = "{date_time_string}{tz_string}"

def parse_timezonestamp(value):
    if tz_regex.search(value):
        tz = pytz.timezone(tz_regex.search(value).groups()[0])
    else:
        tz = timezone.get_current_timezone()
    utc_value = tz_regex.sub('', value)
    value = datetime.datetime.strptime(utc_value, date_time_format)
    value = timezone.make_aware(value, pytz.utc)
    return value.astimezone(tz)

def create_timezonestamp(value):
    tz = value.tzinfo.zone
    date_time_string = value.strftime(date_time_format)
    tz_string = tz_format.format(tz=tz)
    value = db_storage_string.format(date_time_string=date_time_string, tz_string=tz_string)
    return value

class DateTimeTzField(Field):

    def db_type(self, connection):
        return "char"

    def from_db_value(self, value, expression, connection, context):
        if value is None:
            return value
        return parse_timezonestamp(value)

    def to_python(self, value):
        if isinstance(value, datetime.datetime):
            return value

        if value is None:
            return value

        return parse_timezonestamp(value)

    def get_prep_value(self, value):
        # Casts datetimes into the format expected by the backend
        if value is None:
            return value
        return create_timezonestamp(value)

    def get_db_prep_value(self, value, connection, prepared=False):
        if not prepared:
            value = self.get_prep_value(value)
        return value
