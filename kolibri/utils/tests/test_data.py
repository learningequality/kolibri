from django.test import TestCase

from kolibri.utils.data import bytes_for_humans
from kolibri.utils.data import bytes_from_humans
from kolibri.utils.data import ChoicesEnum


class BytesForHumans(TestCase):
    def test_bytes(self):
        self.assertEqual("132B", bytes_for_humans(132))

    def test_kilobytes(self):
        self.assertEqual("242.10KB", bytes_for_humans(242.1 * 1000))

    def test_megabytes(self):
        self.assertEqual("377.10MB", bytes_for_humans(377.1 * 1000 * 1000))

    def test_gigabytes(self):
        self.assertEqual("421.50GB", bytes_for_humans(421.5 * 1000 * 1000 * 1000))

    def test_terabytes(self):
        self.assertEqual("555.00TB", bytes_for_humans(555 * 1000 * 1000 * 1000 * 1000))

    def test_petabytes(self):
        self.assertEqual(
            "611.77PB", bytes_for_humans(611.77 * 1000 * 1000 * 1000 * 1000 * 1000)
        )


class BytesFromHumans(TestCase):
    def test_integer(self):
        self.assertEqual(bytes_from_humans(132), 132)

    def test_no_units_bytes(self):
        self.assertEqual(bytes_from_humans("132"), 132)

    def test_bytes(self):
        self.assertEqual(bytes_from_humans("132B"), 132)

    def test_kilobytes(self):
        self.assertEqual(bytes_from_humans("242.10KB"), 242.1 * 1000)

    def test_megabytes(self):
        self.assertEqual(bytes_from_humans("377.10MB"), 377.1 * 1000 * 1000)

    def test_gigabytes(self):
        self.assertEqual(bytes_from_humans("421.50GB"), 421.5 * 1000 * 1000 * 1000)

    def test_terabytes(self):
        self.assertEqual(bytes_from_humans("555.00TB"), 555 * 1000 * 1000 * 1000 * 1000)

    def test_petabytes(self):
        self.assertEqual(
            bytes_from_humans("611.77PB"), 611.77 * 1000 * 1000 * 1000 * 1000 * 1000
        )

    def test_bytes_lower_case(self):
        self.assertEqual(bytes_from_humans("132B".lower()), 132)

    def test_kilobytes_lower_case(self):
        self.assertEqual(bytes_from_humans("242.10KB".lower()), 242.1 * 1000)

    def test_megabytes_lower_case(self):
        self.assertEqual(bytes_from_humans("377.10MB".lower()), 377.1 * 1000 * 1000)

    def test_gigabytes_lower_case(self):
        self.assertEqual(
            bytes_from_humans("421.50GB".lower()), 421.5 * 1000 * 1000 * 1000
        )

    def test_terabytes_lower_case(self):
        self.assertEqual(
            bytes_from_humans("555.00TB".lower()), 555 * 1000 * 1000 * 1000 * 1000
        )

    def test_petabytes_lower_case(self):
        self.assertEqual(
            bytes_from_humans("611.77PB".lower()),
            611.77 * 1000 * 1000 * 1000 * 1000 * 1000,
        )


class IntegerChoices(ChoicesEnum):
    ONE = 1
    TWO = 2
    THREE = 3


def test_choices_enum():
    assert IntegerChoices.choices() == ((1, "ONE"), (2, "TWO"), (3, "THREE"))
    assert IntegerChoices.max_length() == 1
