import importlib
from importlib.resources import files
from unittest import mock

import pytest
from definitions import LANG_DEFINITIONS
from django.utils.translation import to_language

import kolibri_app.i18n
from kolibri_app.i18n import catalogue_language
from kolibri_app.i18n import language_candidates


@pytest.fixture(autouse=True)
def os_locale():
    with (
        mock.patch("locale.getlocale", return_value=("fr_FR", "UTF-8")),
        mock.patch("locale.getdefaultlocale", return_value=("fr_FR", "UTF-8")),
    ):
        yield


def test_no_installer_language_uses_the_os_locale():
    assert language_candidates(None)[0].startswith("fr_FR")


def test_os_locale_remains_a_candidate():
    assert "fr_FR" in language_candidates("es-419")


@pytest.mark.parametrize("installer_language", sorted(LANG_DEFINITIONS))
def test_installer_language_selects_its_own_catalogue(installer_language):
    catalogues = {d.name for d in (files("kolibri_app") / "locales").iterdir()}
    catalogue = catalogue_language(language_candidates(installer_language), catalogues)
    assert to_language(catalogue) == installer_language


def test_import_without_compiled_catalogues_falls_back_to_english(tmp_path):
    try:
        with mock.patch("importlib.resources.files", return_value=tmp_path):
            language = importlib.reload(kolibri_app.i18n).language
    finally:
        importlib.reload(kolibri_app.i18n)
    assert language == "en"
