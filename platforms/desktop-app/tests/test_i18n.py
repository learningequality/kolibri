import importlib
import struct
from importlib.resources import files
from unittest import mock

import pytest
from definitions import LANG_DEFINITIONS

import kolibri_app.i18n
from kolibri_app import constants

pytestmark = pytest.mark.usefixtures("display_languages")

EMPTY_MO = struct.pack("<7I", 0x950412DE, 0, 0, 28, 28, 0, 0)


@pytest.fixture(autouse=True)
def os_locale():
    with (
        mock.patch("locale.getlocale", return_value=("fr_FR", "UTF-8")),
        mock.patch("locale.getdefaultlocale", return_value=("fr_FR", "UTF-8")),
    ):
        yield


@pytest.fixture
def package_root(tmp_path):
    for catalogue in (files("kolibri_app") / "locales").iterdir():
        mo_file = tmp_path / "locales" / catalogue.name / "LC_MESSAGES" / "wxapp.mo"
        mo_file.parent.mkdir(parents=True)
        mo_file.write_bytes(EMPTY_MO)
    return tmp_path


@pytest.fixture
def recorded_language(winreg):
    yield winreg.QueryValueEx
    importlib.reload(kolibri_app.i18n)


def windows_language(package_root):
    with (
        mock.patch.object(constants, "WINDOWS", True),
        mock.patch("importlib.resources.files", return_value=package_root),
    ):
        return importlib.reload(kolibri_app.i18n).language


@pytest.mark.parametrize("installer_language", sorted(LANG_DEFINITIONS))
def test_display_language_without_a_catalogue_falls_back_to_the_installer_language(
    recorded_language, display_languages, package_root, installer_language
):
    display_languages.languages = ["cy-GB"]
    recorded_language.return_value = (installer_language, 1)
    assert windows_language(package_root) == installer_language


@pytest.mark.parametrize(
    ("display", "expected"), [(["ar-SA", "en-US"], "ar"), (["en-US"], "en")]
)
def test_display_language_comes_before_the_installer_language(
    recorded_language, display_languages, package_root, display, expected
):
    display_languages.languages = display
    recorded_language.return_value = ("es-419", 1)
    assert windows_language(package_root) == expected


@pytest.mark.parametrize(
    ("display", "expected"),
    [
        ("zh-CN", "zh-hans"),
        ("es-MX", "es-419"),
        ("es-ES", "es-es"),
        ("fr-CA", "fr-fr"),
        ("pt-PT", "pt-mz"),
        ("pt-MZ", "pt-mz"),
        ("ff-Latn-SN", "ff-cm"),
        ("ha-Latn-NG", "ha"),
    ],
)
def test_display_language_loads_the_catalogue_for_its_language_and_script(
    recorded_language, display_languages, package_root, display, expected
):
    display_languages.languages = [display]
    recorded_language.return_value = ("en", 1)
    assert windows_language(package_root) == expected


@pytest.mark.parametrize(
    ("display", "installer", "expected"),
    [
        ("pt-PT", "pt-br", "pt-br"),
        ("pt-BR", "pt-mz", "pt-br"),
        ("es-US", "es-es", "es-es"),
        ("es-MX", "es-es", "es-es"),
        ("es-ES", "es-419", "es-es"),
    ],
)
def test_installer_language_outranks_another_region_of_the_display_language(
    recorded_language, display_languages, package_root, display, installer, expected
):
    display_languages.languages = [display]
    recorded_language.return_value = (installer, 1)
    assert windows_language(package_root) == expected


@pytest.mark.parametrize("display", ["pa-Arab-PK", "zh-TW", "ff-Adlm-SN"])
def test_display_language_skips_a_catalogue_in_another_script(
    recorded_language, display_languages, package_root, display
):
    display_languages.languages = [display]
    recorded_language.side_effect = FileNotFoundError
    assert windows_language(package_root) == "fr-fr"


def test_other_preferred_languages_come_after_the_installer_language(
    recorded_language, display_languages, package_root
):
    display_languages.languages = ["cy-GB", "en-US"]
    recorded_language.return_value = ("es-419", 1)
    assert windows_language(package_root) == "es-419"


def test_other_preferred_languages_come_before_the_os_locale(
    recorded_language, display_languages, package_root
):
    display_languages.languages = ["cy-GB", "ar-SA"]
    recorded_language.side_effect = FileNotFoundError
    assert windows_language(package_root) == "ar"


@pytest.mark.parametrize("failing_call", ["size", "fill"])
def test_failed_display_language_query_uses_the_os_locale(
    recorded_language, display_languages, package_root, failing_call
):
    display_languages.languages = ["ar-SA"]
    display_languages.failing_call = failing_call
    recorded_language.side_effect = FileNotFoundError
    assert windows_language(package_root) == "fr-fr"


def test_no_recorded_language_uses_the_os_locale(recorded_language, package_root):
    recorded_language.side_effect = FileNotFoundError
    assert windows_language(package_root) == "fr-fr"


def test_import_without_compiled_catalogues_falls_back_to_english(tmp_path):
    try:
        with mock.patch("importlib.resources.files", return_value=tmp_path):
            language = importlib.reload(kolibri_app.i18n).language
    finally:
        importlib.reload(kolibri_app.i18n)
    assert language == "en"


def test_windows_import_without_compiled_catalogues_falls_back_to_english(
    recorded_language, display_languages, tmp_path
):
    display_languages.languages = ["ar-SA"]
    recorded_language.return_value = ("es-419", 1)
    assert windows_language(tmp_path) == "en"
