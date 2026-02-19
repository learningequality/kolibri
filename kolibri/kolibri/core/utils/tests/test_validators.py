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
