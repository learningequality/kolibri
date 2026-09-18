import re
from pathlib import Path

import pytest
from definitions import LANG_DEFINITIONS
from update_from_inno import INNO_TAG
from update_from_inno import vendored_files
from write_language_files import messages_files
from write_language_files import write_languages

INNO_DIR = Path(__file__).parent.parent / "installer" / "translations" / "inno"
BUILD_WORKFLOW = (
    Path(__file__).parents[3]
    / ".github"
    / "workflows"
    / "platform-windows-app-build_exe.yml"
)


@pytest.fixture
def locale_dir(tmp_path):
    """A locale tree holding only the English source, as a fresh checkout does."""
    (tmp_path / "en").mkdir()
    (tmp_path / "en" / "custom.isl").write_text("[CustomMessages]\n")
    return tmp_path


def translate(locale_dir, locale_code, name):
    (locale_dir / locale_code).mkdir(exist_ok=True)
    (locale_dir / locale_code / name).write_text("[Messages]\n")


def chain(locale_code, locale_dir):
    return messages_files(locale_code, LANG_DEFINITIONS[locale_code], locale_dir)


def test_official_inno_language_comes_from_the_compiler(locale_dir):
    assert "compiler:Languages\\German.isl" in chain("de", locale_dir)


def test_unofficial_inno_language_comes_from_the_fetched_copy(locale_dir):
    assert "translations\\inno\\Greek.isl" in chain("el", locale_dir)


def test_every_language_falls_back_to_inno_english_first(locale_dir):
    for locale_code in LANG_DEFINITIONS:
        assert chain(locale_code, locale_dir)[0] == "compiler:Default.isl"


def test_lang_options_win(locale_dir):
    assert chain("te", locale_dir)[-1] == "translations\\langoptions\\te.isl"


def test_untranslated_language_chains_only_the_english_custom_messages(locale_dir):
    assert chain("uk", locale_dir) == [
        "compiler:Default.isl",
        "compiler:Languages\\Ukrainian.isl",
        "translations\\locale\\en\\custom.isl",
        "translations\\langoptions\\uk.isl",
    ]


def test_translated_language_overrides_the_english_custom_messages(locale_dir):
    translate(locale_dir, "uk", "custom.isl")
    assert chain("uk", locale_dir) == [
        "compiler:Default.isl",
        "compiler:Languages\\Ukrainian.isl",
        "translations\\locale\\en\\custom.isl",
        "translations\\locale\\uk\\custom.isl",
        "translations\\langoptions\\uk.isl",
    ]


def test_crowdin_messages_are_chained_when_inno_has_no_translation(locale_dir):
    translate(locale_dir, "te", "messages.isl")
    assert chain("te", locale_dir) == [
        "compiler:Default.isl",
        "translations\\locale\\te\\messages.isl",
        "translations\\locale\\en\\custom.isl",
        "translations\\langoptions\\te.isl",
    ]


def test_crowdin_messages_are_ignored_where_inno_translates_them(locale_dir):
    translate(locale_dir, "uk", "messages.isl")
    assert "translations\\locale\\uk\\messages.isl" not in chain("uk", locale_dir)


def test_inno_tag_matches_the_compiler_version_the_build_installs():
    version = re.search(
        r"innosetup[^\n\d]*--version=([\d.]+)",
        BUILD_WORKFLOW.read_text(encoding="utf-8"),
    ).group(1)
    assert INNO_TAG == f"is-{version.replace('.', '_')}"


def test_every_unofficial_inno_file_is_vendored():
    # The build no longer fetches these, so a new unofficial language without a
    # committed copy fails iscc on Windows and nowhere else.
    for inno_file in vendored_files():
        assert (INNO_DIR / Path(inno_file).name).is_file()


def test_english_is_the_first_language_entry(locale_dir, tmp_path):
    languages_path = tmp_path / "out" / "languages.iss"
    languages_path.parent.mkdir()
    write_languages(languages_path, locale_dir)
    entries = [
        line
        for line in languages_path.read_text(encoding="utf-8").splitlines()
        if line.startswith("Name:")
    ]
    assert entries[0].startswith('Name: "en";')
    assert len(entries) == len(LANG_DEFINITIONS)
