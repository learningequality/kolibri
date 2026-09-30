from django.test import SimpleTestCase

from kolibri.core.serializers import set_value


class SetValueTestCase(SimpleTestCase):
    def test_no_keys_merges_value_into_dictionary(self):
        dictionary = {"a": 1}
        set_value(dictionary, [], {"b": 2})
        self.assertEqual(dictionary, {"a": 1, "b": 2})

    def test_single_key_sets_value(self):
        dictionary = {"a": 1}
        set_value(dictionary, ["x"], 2)
        self.assertEqual(dictionary, {"a": 1, "x": 2})

    def test_nested_keys_create_intermediate_dictionaries(self):
        dictionary = {"a": 1}
        set_value(dictionary, ["x", "y"], 2)
        self.assertEqual(dictionary, {"a": 1, "x": {"y": 2}})

    def test_nested_keys_keep_existing_siblings(self):
        dictionary = {"x": {"z": 3}}
        set_value(dictionary, ["x", "y"], 2)
        self.assertEqual(dictionary, {"x": {"z": 3, "y": 2}})
