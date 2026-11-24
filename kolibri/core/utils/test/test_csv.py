from django.test import SimpleTestCase

from kolibri.core.utils.csv import sanitize


class SanitizeTestCase(SimpleTestCase):
    def test_escapes_leading_formula_characters(self):
        for value in ("=1+1", "+1+1", "-1+1", "@SUM(A1)", "%1", "\t=1+1", "\r=2+2"):
            with self.subTest(value=value):
                self.assertEqual(sanitize(value), "'" + value)

    def test_escapes_pipe_in_escaped_value(self):
        self.assertEqual(sanitize("=cmd|' /C calc'!A0"), "'=cmd\\|' /C calc'!A0")

    def test_leaves_plain_values_unchanged(self):
        for value in ("learner", "a=1", "a\tb", "", "-12", "-1,000.5"):
            with self.subTest(value=value):
                self.assertEqual(sanitize(value), value)

    def test_leaves_numbers_and_none_unchanged(self):
        for value in (None, 0, -1, 1.5):
            with self.subTest(value=value):
                self.assertEqual(sanitize(value), value)
