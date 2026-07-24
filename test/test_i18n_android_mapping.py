from build_tools.i18n.generate_mapping import get_android_language_mapping
from build_tools.i18n.generate_mapping import to_android_locale


def test_to_android_locale_overrides():
    assert to_android_locale("es-419") == "b+es+419"
    assert to_android_locale("zh-hans") == "zh"


def test_to_android_locale_region_suffix():
    assert to_android_locale("pt-br") == "pt-rBR"
    assert to_android_locale("gu-in") == "gu-rIN"


def test_to_android_locale_single_part():
    assert to_android_locale("de") == "de"
    assert to_android_locale("en") == "en"


def test_android_mapping_keyed_by_crowdin_code():
    mapping = get_android_language_mapping()
    # crowdin "la" is Kolibri's es-419; crowdin "zh-CN" is zh-hans
    assert mapping["la"] == "b+es+419"
    assert mapping["zh-CN"] == "zh"
    assert mapping["pt-BR"] == "pt-rBR"
