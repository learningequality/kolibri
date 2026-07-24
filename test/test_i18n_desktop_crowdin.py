import os

import yaml

from build_tools.i18n.generate_mapping import get_installer_language_mapping
from build_tools.i18n.generate_mapping import get_language_mapping

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _crowdin_files():
    with open(os.path.join(REPO_ROOT, "crowdin.yml")) as f:
        return yaml.safe_load(f)["files"]


def _entry(source_suffix):
    return next(e for e in _crowdin_files() if e["source"].endswith(source_suffix))


def test_installer_mapping_is_raw_intl_code():
    m = get_installer_language_mapping()
    # short crowdin code -> hyphen-lowercase folder (NOT region-suffixed)
    assert m["bg"] == "bg-bg"
    assert m["bn"] == "bn-bd"
    assert m["fr"] == "fr-fr"
    assert m["hi"] == "hi-in"
    # custom + script codes
    assert m["la"] == "es-419"
    assert m["zh-CN"] == "zh-hans"
    assert m["fv"] == "ff-cm"
    # every value is hyphen-lowercase (installer folder convention)
    assert all(v == v.lower() and "_" not in v for v in m.values())


def test_installer_and_underscore_share_keys():
    # same crowdin-code key set; only the value convention differs
    assert set(get_installer_language_mapping()) == set(get_language_mapping())


def test_wxapp_entry_uses_underscore_anchor():
    e = _entry("/src/kolibri_app/locales/en/LC_MESSAGES/wxapp.po")
    assert e["translation"] == (
        "/platforms/desktop-app/src/kolibri_app/locales/"
        "%locale_with_underscore%/LC_MESSAGES/wxapp.po"
    )
    # reuses the shared underscore anchor
    assert e["languages_mapping"]["locale_with_underscore"] == get_language_mapping()


def test_installer_entry_maps_to_intl_code_folders():
    e = _entry("/installer/translations/locale/en/messages.po")
    assert e["translation"] == (
        "/platforms/desktop-app/installer/translations/locale/%locale%/messages.po"
    )
    assert e["languages_mapping"]["locale"] == get_installer_language_mapping()
