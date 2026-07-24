from build_tools.i18n.generate_mapping import get_installer_language_mapping
from build_tools.i18n.generate_mapping import get_language_mapping


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
