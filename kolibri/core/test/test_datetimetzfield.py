from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import datetime

import pytz
from django.db import models
from django.test import override_settings
from django.test import TestCase
from django.utils import timezone

from kolibri.core.fields import DateTimeTzField
from kolibri.core.fields import parse_timezonestamp
from kolibri.core.serializers import DateTimeTzField as DateTimeTzSerializerField


def aware_datetime():
    return timezone.get_current_timezone().localize(
        datetime.datetime(2000, 12, 11, 10, 9, 8)
    )


class DateTimeTzModel(models.Model):
    timestamp = DateTimeTzField(null=True)
    default_timestamp = DateTimeTzField(default=aware_datetime)


@override_settings(USE_TZ=True)
class AwareDateTimeTzFieldTestCase(TestCase):
    def test_timestamp_utc_create(self):
        timezone.activate(pytz.utc)
        obj = DateTimeTzModel.objects.create(timestamp=aware_datetime())
        self.assertEqual(obj.timestamp.tzinfo, aware_datetime().tzinfo)
        timezone.deactivate()

    def test_timestamp_utc_read(self):
        # Regression test for https://github.com/learningequality/kolibri/issues/1602
        timezone.activate(pytz.utc)
        obj = DateTimeTzModel.objects.create(timestamp=aware_datetime())
        obj.refresh_from_db()
        self.assertEqual(obj.timestamp, aware_datetime())
        timezone.deactivate()

    def test_timestamp_arbitrary_create(self):
        tz = pytz.timezone("Africa/Nairobi")
        timezone.activate(tz)
        timestamp = aware_datetime()
        obj = DateTimeTzModel.objects.create(timestamp=timestamp)
        self.assertEqual(obj.timestamp.tzinfo, timestamp.tzinfo)
        timezone.deactivate()

    def test_timestamp_arbitrary_read(self):
        # Regression test for https://github.com/learningequality/kolibri/issues/1602
        tz = pytz.timezone("Africa/Nairobi")
        timezone.activate(tz)
        timestamp = aware_datetime()
        obj = DateTimeTzModel.objects.create(timestamp=timestamp)
        obj.refresh_from_db()
        self.assertEqual(obj.timestamp, timestamp)
        timezone.deactivate()

    def test_default_utc_create(self):
        timezone.activate(pytz.utc)
        obj = DateTimeTzModel.objects.create()
        self.assertEqual(obj.default_timestamp.tzinfo, pytz.utc)
        timezone.deactivate()

    def test_default_arbitrary_create(self):
        tz = pytz.timezone("Africa/Nairobi")
        timezone.activate(tz)
        timestamp = aware_datetime()
        obj = DateTimeTzModel.objects.create()
        self.assertEqual(obj.default_timestamp.tzinfo, timestamp.tzinfo)
        timezone.deactivate()

    def test_zero_second_fractions_read(self):
        # Regression test for https://github.com/learningequality/kolibri/issues/1758
        timezone.activate(pytz.utc)
        try:
            timestamp = parse_timezonestamp("2000-12-11 10:09:08")
            self.assertEqual(timestamp, aware_datetime())
        except ValueError:
            self.fail(
                "parse_timezonestamp did not parse time data missing fractions of seconds."
            )
        finally:
            timezone.deactivate()


@override_settings(USE_TZ=False)
class NaiveDateTimeTzFieldTestCase(TestCase):
    def test_timestamp_create(self):
        obj = DateTimeTzModel.objects.create(timestamp=aware_datetime())
        self.assertEqual(obj.timestamp.tzinfo, aware_datetime().tzinfo)

    def test_timestamp_utc_read(self):
        # Regression test for https://github.com/learningequality/kolibri/issues/1602
        obj = DateTimeTzModel.objects.create(timestamp=aware_datetime())
        obj.refresh_from_db()
        self.assertEqual(obj.timestamp, aware_datetime())

    def test_default_utc_create(self):
        timezone.activate(pytz.utc)
        obj = DateTimeTzModel.objects.create()
        self.assertEqual(obj.default_timestamp.tzinfo, pytz.utc)
        timezone.deactivate()


class DateTimeTzSerializerFieldTestCase(TestCase):
    def test_timestamp_utc_parse(self):
        timezone.activate(pytz.utc)
        field = DateTimeTzSerializerField()
        timestamp = aware_datetime()
        self.assertEqual(
            field.to_internal_value(timestamp.isoformat()).tzinfo,
            aware_datetime().tzinfo,
        )
        timezone.deactivate()

    def test_timestamp_arbitrary_parse(self):
        tz = pytz.timezone("Africa/Nairobi")
        timezone.activate(tz)
        field = DateTimeTzSerializerField()
        timestamp = aware_datetime()
        self.assertEqual(
            field.to_internal_value(timestamp.isoformat()).tzinfo,
            aware_datetime().tzinfo,
        )
        timezone.deactivate()
