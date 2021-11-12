import datetime
import json
import re

import pytz
from django.db.backends.utils import typecast_timestamp
from django.db.models.fields import Field
from django.utils import timezone
from django.utils.six import string_types
from jsonfield import JSONField as JSONFieldBase


date_time_format = "%Y-%m-%d %H:%M:%S.%f"
tz_format = "({tz})"
tz_regex = re.compile(r"\(([^\)]+)\)")
db_storage_string = "{date_time_string}{tz_string}"


def parse_timezonestamp(value):
    if tz_regex.search(value):
        tz = pytz.timezone(tz_regex.search(value).groups()[0])
    else:
        tz = timezone.get_current_timezone()
    utc_value = tz_regex.sub("", value)
    value = typecast_timestamp(utc_value)
    if value.tzinfo is None:
        # Naive datetime, make aware
        value = timezone.make_aware(value, pytz.utc)
    return value.astimezone(tz)


def create_timezonestamp(value):
    if value.tzinfo and hasattr(value.tzinfo, "zone"):
        # We have a pytz timezone, we can work with this
        tz = value.tzinfo.zone
    elif value.tzinfo:
        # Got some timezone data, but it's not a pytz timezone
        # Let's just assume someone used dateutil parser on a UTC
        # ISO format timestamp
        # Fixes https://github.com/learningequality/kolibri/issues/1824
        tz = pytz.utc
        value = value.astimezone(tz)
    else:
        tz = timezone.get_current_timezone().zone
        value = timezone.make_aware(value, timezone.get_current_timezone())
    date_time_string = value.astimezone(pytz.utc).strftime(date_time_format)
    tz_string = tz_format.format(tz=tz)
    value = db_storage_string.format(
        date_time_string=date_time_string, tz_string=tz_string
    )
    return value


class DateTimeTzField(Field):
    """
    A field that stores datetime information as a char in this format:

    %Y-%m-%d %H:%M:%S.%f(<tzinfo>)

    It reads a timezone aware datetime object, and extracts the timezone zone information
    then parses the datetime into the format above with the timezone information appended.

    As this is ISO formatted, alphabetic sorting should still allow for proper queries
    against this in the database. Mostly engineered for SQLite usage.
    """

    def db_type(self, connection):
        return "varchar"

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
        if isinstance(value, string_types):
            value = parse_timezonestamp(value)
        return create_timezonestamp(value)

    def get_db_prep_value(self, value, connection, prepared=False):
        if not prepared:
            value = self.get_prep_value(value)
        return value

    def value_from_object_json_compatible(self, obj):
        if self.value_from_object(obj):
            return create_timezonestamp(self.value_from_object(obj))


class JSONField(JSONFieldBase):
    def from_db_value(self, value, expression, connection, context):
        if isinstance(value, string_types):
            try:
                return json.loads(value, **self.load_kwargs)
            except ValueError:
                pass

        return value

    def to_python(self, value):
        if isinstance(value, string_types):
            try:
                return json.loads(value, **self.load_kwargs)
            except ValueError:
                pass

        return value
