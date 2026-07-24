import os

import pytest

from build_tools.i18n.generate_mapping import get_android_language_mapping

REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ANDROID_SOURCE = "/platforms/android/app/src/main/res/values/strings.xml"
ANDROID_TRANSLATION = (
    "/platforms/android/app/src/main/res/values-%android_code%/strings.xml"
)


def _android_entry():
    # PyYAML rides in transitively via drf-yasg (gated to python_version >=
    # '3.8'); skip on the 3.6/3.7 no-uv CI where it isn't installed.
    yaml = pytest.importorskip("yaml")
    with open(os.path.join(REPO_ROOT, "crowdin.yml")) as f:
        config = yaml.safe_load(f)
    entries = [e for e in config["files"] if e.get("source") == ANDROID_SOURCE]
    assert len(entries) == 1
    return entries[0]


def test_android_entry_translation_path():
    assert _android_entry()["translation"] == ANDROID_TRANSLATION


def test_android_entry_language_mapping_matches_generator():
    # The mapping is a manual paste of get_android_language_mapping()'s output;
    # assert they are in sync so a regenerate-without-repaste (or vice versa)
    # drift is caught rather than silently shipping stale qualifiers.
    mapping = _android_entry()["languages_mapping"]["android_code"]
    assert mapping == get_android_language_mapping()


def test_android_entry_update_option():
    assert _android_entry()["update_option"] == "update_as_unapproved"


def test_android_entry_type_is_android():
    # Force Crowdin's Android-resource parser (do not rely on .xml auto-detect):
    # it honours translatable="false" and Android-encodes downloaded output.
    assert _android_entry()["type"] == "android"
