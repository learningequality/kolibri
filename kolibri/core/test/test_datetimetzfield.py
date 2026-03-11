import pytz
from django.test import override_settings
from django.test import TestCase
from django.utils import timezone

from kolibri.core.fields import create_timezonestamp
from kolibri.core.fields import DateTimeTzField as DateTimeTzModelField
from kolibri.core.fields import parse_timezonestamp
from kolibri.core.serializers import DateTimeTzField as DateTimeTzSerializerField
from kolibri.core.test.test_app.models import aware_datetime
from kolibri.core.test.test_app.models import DateTimeTzModel


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

    def test_create_timezonestamp_with_non_utc_fixed_offset(self):
        """
        Regression test for pytz.FixedOffset with non-zero offset.

        pytz.FixedOffset(180).zone is None (only FixedOffset(0) returns
        pytz.UTC with zone='UTC'). If a datetime with a non-UTC FixedOffset
        tzinfo reaches create_timezonestamp, the stored suffix must not
        become '(None)'.
        """
        # A datetime with a non-UTC FixedOffset (e.g., +03:00)
        tz = pytz.FixedOffset(180)
        dt = timezone.now().astimezone(tz)

        # Round-trip through create → parse
        stored = create_timezonestamp(dt)

        # Should fall back to UTC storage since FixedOffset has no named zone
        self.assertTrue(stored.endswith("(UTC)"))

        # Must be parseable back to the same instant
        parsed = parse_timezonestamp(stored)
        self.assertEqual(dt, parsed)

    def test_get_prep_value_roundtrips_str_datetime_format(self):
        """
        Regression test for cursor pagination with DateTimeTzField.

        DRF CursorPagination extracts cursor positions by calling str() on
        datetime values returned by from_db_value. These str(datetime) strings
        (e.g. "2024-01-15 10:30:00+00:00") are then used in queryset filter
        expressions, which pass through get_prep_value to produce the varchar
        storage format for comparison.

        When the server TIME_ZONE differs from the stored timezone, the
        round-trip through str(datetime) -> get_prep_value must still produce
        the same storage string, otherwise varchar comparisons in the database
        will use mismatched timezone suffixes.
        """
        field = DateTimeTzModelField()

        # Step 1: Store a UTC timestamp (Kolibri uses timezone.now() which is UTC)
        timezone.activate(pytz.utc)
        try:
            utc_dt = timezone.now()
            stored_value = field.get_prep_value(utc_dt)
        finally:
            timezone.deactivate()

        # Step 2: Read from DB via from_db_value
        read_back = field.from_db_value(stored_value, None, None)

        # Step 3: CursorPagination calls str() on the datetime
        position = str(read_back)

        # Step 4: Simulate a production server with non-UTC TIME_ZONE
        # (Kolibri sets TIME_ZONE = get_localzone_name() in settings)
        tz = pytz.timezone("Africa/Nairobi")
        timezone.activate(tz)
        try:
            # Step 5: The cursor filter calls get_prep_value on the position
            roundtripped = field.get_prep_value(position)
        finally:
            timezone.deactivate()

        # The round-tripped value must be identical to the original stored
        # value for correct varchar comparison in the database.
        self.assertEqual(stored_value, roundtripped)


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
