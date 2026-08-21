import os

import pytest

from build_tools.i18n.generate_mapping import get_installer_excluded_languages
from build_tools.i18n.generate_mapping import get_installer_language_mapping
from build_tools.i18n.generate_mapping import get_language_mapping

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _crowdin_files():
    # PyYAML rides in transitively via drf-yasg, which is gated to
    # python_version >= '3.8'; skip the config-consistency checks on the
    # 3.6/3.7 no-uv CI where it isn't installed.
    yaml = pytest.importorskip("yaml")
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
    e = _entry("/installer/translations/locale/en/custom.isl")
    assert e["translation"] == (
        "/platforms/desktop-app/installer/translations/locale/%locale%/custom.isl"
    )
    assert e["languages_mapping"]["locale"] == get_installer_language_mapping()


def test_installer_messages_exclusions_track_definitions():
    # definitions.py decides whether Inno or Crowdin supplies a language's [Messages];
    # crowdin.yml has to be told separately, and a stale list either bills translators
    # for 281 strings Inno already covers or leaves a language without any.
    e = _entry("/installer/translations/locale/en/messages.isl")
    assert sorted(e["excluded_target_languages"]) == get_installer_excluded_languages()
