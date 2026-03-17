# Map functionality:
# inno_name: The filename of the standard Inno Setup translation (e.g., 'Spanish.isl')
# or just use the name you want to display in the installer's language selection.
# id: The Microsoft Language ID required by Windows, can be found here:
# MS IDs: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/a9eac961-e77d-41a6-90a5-ce1a8b0cdb9c
# font: (Optional) Only required if Segoe UI (Inno 6.6 default) does not support the language.
# International fonts: https://learn.microsoft.com/en-us/windows/apps/design/globalizing/loc-international-fonts
# rtl: (Optional) Set to True for Right-to-Left languages.

LANG_DEFINITIONS = {
    # --- Official Inno Setup Languages ---
    "ar": {
        "inno_name": "Arabic",
        "id": "$0401",
        "rtl": True,
        "display_name": "العَرَبِيَّة",
    },
    "bg-bg": {
        "inno_name": "Bulgarian",
        "id": "$0402",
        "display_name": "Български",
    },
    "de": {
        "inno_name": "German",
        "id": "$0407",
        "display_name": "Deutsch",
    },
    "en": {
        "inno_name": "English",
        "id": "$0409",
        "display_name": "English",
    },
    "es-es": {
        "inno_name": "Spanish",
        "id": "$040A",
        "display_name": "Español (España)",
    },
    "fr-fr": {
        "inno_name": "French",
        "id": "$040C",
        "display_name": "Français",
    },
    "it": {
        "inno_name": "Italian",
        "id": "$0410",
        "display_name": "Italiano",
    },
    "ko": {
        "inno_name": "Korean",
        "id": "$0412",
        "display_name": "한국어",
    },
    "pt-br": {
        "inno_name": "BrazilianPortuguese",
        "id": "$0416",
        "display_name": "Português (Brazil)",
    },
    "uk": {
        "inno_name": "Ukrainian",
        "id": "$0422",
        "display_name": "Украї́нська мо́ва",
    },
    # --- Unofficial Inno Languages ---
    "bn-bd": {
        "inno_name": "Bengali",
        "id": "$0845",
        "font": "Nirmala UI",
        "display_name": "বাংলা",
    },
    "el": {
        "inno_name": "Greek",
        "id": "$0408",
        "display_name": "Ελληνικά",
    },
    "fa": {
        "inno_name": "Persian",
        "id": "$0429",
        "rtl": True,
        "display_name": "فارسی",
    },
    "hi-in": {
        "inno_name": "Hindi",
        "id": "$0439",
        "font": "Nirmala UI",
        "display_name": "हिंदी (भारत)",
    },
    "id": {
        "inno_name": "Indonesian",
        "id": "$0421",
        "display_name": "Bahasa Indonesia",
    },
    "ka": {
        "inno_name": "Georgian",
        "id": "$0437",
        "display_name": "ქართული",
    },
    "mr": {
        "inno_name": "Marathi",
        "id": "$044E",
        "font": "Nirmala UI",
        "display_name": "मराठी",
    },
    "ur-pk": {
        "inno_name": "Urdu",
        "id": "$0420",
        "font": "Nirmala UI",
        "rtl": True,
        "display_name": "اُردو (پاکستان)",
    },
    "vi": {
        "inno_name": "Vietnamese",
        "id": "$042A",
        "display_name": "Tiếng Việt",
    },
    "zh-hans": {
        "inno_name": "ChineseSimplified",
        "id": "$0804",
        "font": "Microsoft YaHei UI",
        "display_name": "简体中文",
    },
    # --- No Inno Translations ---
    "es-419": {
        "inno_name": "Spanish (Latin America)",
        "id": "$580A",
        "display_name": "Español",
    },
    "ff-cm": {
        "inno_name": "Fulah",
        "id": "$0467",
        "display_name": "Fulfulde Mbororoore",
    },
    "gu-in": {
        "inno_name": "Gujarati",
        "id": "$0447",
        "font": "Nirmala UI",
        "display_name": "ગુજરાતી",
    },
    "ha": {
        "inno_name": "Hausa",
        "id": "$0468",
        "display_name": "Hausa",
    },
    "ht": {
        "inno_name": "Haitian Creole",
        "id": "$1000",
        "display_name": "Kreyòl Ayisyen",
    },
    "km": {
        "inno_name": "Khmer",
        "id": "$0453",
        "font": "Leelawadee UI",
        "display_name": "ភាសាខ្មែរ",
    },
    "my": {
        "inno_name": "Burmese",
        "id": "$0455",
        "font": "Myanmar Text",
        "display_name": "ဗမာစာ",
    },
    "ny": {
        "inno_name": "Chichewa",
        "id": "$1000",
        "display_name": "Chinyanja",
    },
    "pa": {
        "inno_name": "Punjabi",
        "id": "$0446",
        "font": "Nirmala UI",
        "display_name": "ਪੰਜਾਬੀ",
    },
    "pt-mz": {
        "inno_name": "Portuguese (Mozambique)",
        "id": "$0816",
        "display_name": "Português (Moçambique)",
    },
    "sw-tz": {
        "inno_name": "Swahili",
        "id": "$1000",
        "display_name": "Kiswahili",
    },
    "te": {
        "inno_name": "Telugu",
        "id": "$044A",
        "font": "Nirmala UI",
        "display_name": "తెలుగు",
    },
    "yo": {
        "inno_name": "Yoruba",
        "id": "$046A",
        "display_name": "Yorùbá",
    },
}
