import importlib
import struct
from importlib.resources import files
from unittest import mock

import pytest
from definitions import LANG_DEFINITIONS

import kolibri_app.i18n
from kolibri_app import constants

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
def test_installer_language_is_the_app_language(
    recorded_language, package_root, installer_language
):
    recorded_language.return_value = (installer_language, 1)
    assert windows_language(package_root) == installer_language


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
