# Map functionality:
# inno_file: Path under https://github.com/jrsoftware/issrc/tree/main/Files of the
# Inno Setup translation chained ahead of ours, vendored into inno/ by
# fetch_inno.py. Omit when Inno has no translation for the language.
# translate_messages: Set when Crowdin, not Inno, supplies the [Messages] section.
# id: The Microsoft Language ID required by Windows, can be found here:
# MS IDs: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/a9eac961-e77d-41a6-90a5-ce1a8b0cdb9c
# font: (Optional) Only required if Segoe UI (Inno 6.6 default) does not support the language.
# International fonts: https://learn.microsoft.com/en-us/windows/apps/design/globalizing/loc-international-fonts
# rtl: (Optional) Set to True for Right-to-Left languages.

INNO_DEFAULT = "Default.isl"

LANG_DEFINITIONS = {
    # --- Official Inno Setup Languages ---
    "ar": {
        "inno_file": "Languages/Arabic.isl",
        "id": "$0401",
        "rtl": True,
        "display_name": "العَرَبِيَّة",
    },
    "bg-bg": {
        "inno_file": "Languages/Bulgarian.isl",
        "id": "$0402",
        "display_name": "Български",
    },
    "de": {
        "inno_file": "Languages/German.isl",
        "id": "$0407",
        "display_name": "Deutsch",
    },
    "en": {
        "id": "$0409",
        "display_name": "English",
    },
    "es-es": {
        "inno_file": "Languages/Spanish.isl",
        "id": "$040A",
        "display_name": "Español (España)",
    },
    "fr-fr": {
        "inno_file": "Languages/French.isl",
        "id": "$040C",
        "display_name": "Français",
    },
    "it": {
        "inno_file": "Languages/Italian.isl",
        "id": "$0410",
        "display_name": "Italiano",
    },
    "ko": {
        "inno_file": "Languages/Korean.isl",
        "id": "$0412",
        "display_name": "한국어",
    },
    "pt-br": {
        "inno_file": "Languages/BrazilianPortuguese.isl",
        "id": "$0416",
        "display_name": "Português (Brazil)",
    },
    "uk": {
        "inno_file": "Languages/Ukrainian.isl",
        "id": "$0422",
        "display_name": "Украї́нська мо́ва",
    },
    # --- Unofficial Inno Languages ---
    "bn-bd": {
        "inno_file": "Languages/Unofficial/Bengali.islu",
        "id": "$0845",
        "font": "Nirmala UI",
        "display_name": "বাংলা",
    },
    "el": {
        "inno_file": "Languages/Unofficial/Greek.isl",
        "id": "$0408",
        "display_name": "Ελληνικά",
    },
    "fa": {
        "inno_file": "Languages/Unofficial/Farsi.isl",
        "id": "$0429",
        "rtl": True,
        "display_name": "فارسی",
    },
    "hi-in": {
        "inno_file": "Languages/Unofficial/Hindi.islu",
        "id": "$0439",
        "font": "Nirmala UI",
        "display_name": "हिंदी (भारत)",
    },
    "id": {
        "inno_file": "Languages/Unofficial/Indonesian.isl",
        "id": "$0421",
        "display_name": "Bahasa Indonesia",
    },
    "ka": {
        "inno_file": "Languages/Unofficial/Georgian.isl",
        "id": "$0437",
        "display_name": "ქართული",
    },
    "mr": {
        "inno_file": "Languages/Unofficial/Marathi.islu",
        "id": "$044E",
        "font": "Nirmala UI",
        "display_name": "मराठी",
    },
    "ur-pk": {
        "inno_file": "Languages/Unofficial/Urdu.isl",
        "id": "$0420",
        "font": "Nirmala UI",
        "rtl": True,
        "display_name": "اُردو (پاکستان)",
    },
    "vi": {
        "inno_file": "Languages/Unofficial/Vietnamese.isl",
        "id": "$042A",
        "display_name": "Tiếng Việt",
    },
    "zh-hans": {
        "inno_file": "Languages/Unofficial/ChineseSimplified.isl",
        "id": "$0804",
        "font": "Microsoft YaHei UI",
        "display_name": "简体中文",
    },
    # --- No Inno Translations ---
    "es-419": {
        "inno_file": "Languages/Spanish.isl",
        "translate_messages": True,
        "id": "$580A",
        "display_name": "Español",
    },
    "ff-cm": {
        "translate_messages": True,
        "id": "$0467",
        "display_name": "Fulfulde Mbororoore",
    },
    "gu-in": {
        "translate_messages": True,
        "id": "$0447",
        "font": "Nirmala UI",
        "display_name": "ગુજરાતી",
    },
    "ha": {
        "translate_messages": True,
        "id": "$0468",
        "display_name": "Hausa",
    },
    "ht": {
        "translate_messages": True,
        "id": "$1000",
        "display_name": "Kreyòl Ayisyen",
    },
    "km": {
        "translate_messages": True,
        "id": "$0453",
        "font": "Leelawadee UI",
        "display_name": "ភាសាខ្មែរ",
    },
    "my": {
        "translate_messages": True,
        "id": "$0455",
        "font": "Myanmar Text",
        "display_name": "ဗမာစာ",
    },
    "ny": {
        "translate_messages": True,
        "id": "$1000",
        "display_name": "Chinyanja",
    },
    "pa": {
        "translate_messages": True,
        "id": "$0446",
        "font": "Nirmala UI",
        "display_name": "ਪੰਜਾਬੀ",
    },
    "pt-mz": {
        "inno_file": "Languages/Portuguese.isl",
        "translate_messages": True,
        "id": "$0816",
        "display_name": "Português (Moçambique)",
    },
    "sw-tz": {
        "translate_messages": True,
        "id": "$1000",
        "display_name": "Kiswahili",
    },
    "te": {
        "translate_messages": True,
        "id": "$044A",
        "font": "Nirmala UI",
        "display_name": "తెలుగు",
    },
    "yo": {
        "translate_messages": True,
        "id": "$046A",
        "display_name": "Yorùbá",
    },
}
