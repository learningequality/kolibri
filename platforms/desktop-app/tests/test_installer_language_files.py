import pytest
from definitions import LANG_DEFINITIONS
from write_language_files import messages_files


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
