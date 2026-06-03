import unittest

from django.core.exceptions import ValidationError

from kolibri.core.utils.validators import NoRepeatedValueJSONArrayValidator


class TestNoRepeatedValueJSONArrayValidator(unittest.TestCase):
    def setUp(self):
        self.validator = NoRepeatedValueJSONArrayValidator()

    def test_unique_simple_values(self):
        self.assertEqual(self.validator([1, 2, 3]), [1, 2, 3])

    def test_duplicate_simple_values_raises_error(self):
        with self.assertRaises(ValidationError):
            self.validator([1, 2, 2])

    def test_unique_object_keys(self):
        v = NoRepeatedValueJSONArrayValidator(object_key="id")
        data = [{"id": 1}, {"id": 2}]
        self.assertEqual(v(data), data)

    def test_empty_list_passes(self):
        self.assertEqual(self.validator([]), [])

    def test_array_key_parameter(self):
        v = NoRepeatedValueJSONArrayValidator(array_key="items")
        data = {"items": [1, 2, 3]}
        self.assertEqual(v(data), data)

    def test_array_key_duplicate_values_raises_error(self):
        v = NoRepeatedValueJSONArrayValidator(array_key="items")
        with self.assertRaises(ValidationError):
            v({"items": [1, 2, 2]})

    def test_non_list_input_raises_error(self):
        with self.assertRaises(ValidationError):
            self.validator("not a list")

        with self.assertRaises(ValidationError):
            self.validator(123)

    def test_duplicate_values_with_object_key_raises_error(self):
        v = NoRepeatedValueJSONArrayValidator(object_key="id")
        data = [{"id": 1}, {"id": 1}]
        with self.assertRaises(ValidationError):
            v(data)

    def test_duplicate_string_values_raises_error(self):
        with self.assertRaises(ValidationError):
            self.validator(["a", "b", "a"])
