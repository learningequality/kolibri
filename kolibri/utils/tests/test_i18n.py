import unittest
from unittest import mock

from kolibri.utils import i18n


@mock.patch("locale.getdefaultlocale", return_value=("es_ES", "UTF-8"))
@mock.patch("locale.getlocale", return_value=("es_ES", "UTF-8"))
class GetDefaultLanguageTestCase(unittest.TestCase):
    def test_default_language_beats_system_language(self, *_):
        self.assertEqual(
            i18n.get_default_language("fr-fr", ["en", "es-es", "fr-fr"]), "fr-fr"
        )

    def test_blank_default_language_uses_system_language(self, *_):
        self.assertEqual(
            i18n.get_default_language("", ["en", "es-es", "fr-fr"]), "es-es"
        )

    def test_default_language_outside_languages_uses_system_language(self, *_):
        self.assertEqual(i18n.get_default_language("fr-fr", ["en", "es-es"]), "es-es")

    def test_no_language_in_languages_uses_first_language(self, *_):
        self.assertEqual(i18n.get_default_language("fr-fr", ["sw-tz", "en"]), "sw-tz")
