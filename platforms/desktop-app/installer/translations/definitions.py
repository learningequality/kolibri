# Map functionality:
# Key: The ISO locale code (used for filenames, e.g., 'es_ES.isl', 'es_ES.po')
# inno_name: The filename of the standard Inno Setup translation (e.g., 'Spanish.isl')
# or just use the name you want to display in the installer's language selection.
# id: The Microsoft Language ID required by Windows, can be found here:
# MS IDs: https://learn.microsoft.com/en-us/openspecs/windows_protocols/ms-lcid/a9eac961-e77d-41a6-90a5-ce1a8b0cdb9c

LANG_DEFINITIONS = {
    "en": {"inno_name": "English", "id": "$0409"},  # Exists in Inno Languages
    "es_ES": {"inno_name": "Spanish", "id": "$040A"},  # Exists in Inno Languages
    "de_DE": {"inno_name": "German", "id": "$0407"},  # Exists in Inno Languages
    "ar_SA": {"inno_name": "Arabic", "id": "$0401"},  # Exists in Inno Languages
    "fr_FR": {"inno_name": "French", "id": "$040C"},  # Exists in Inno Languages
    "ko_KR": {"inno_name": "Korean", "id": "$0412"},  # Exists in Inno Languages
    "yo_NG": {"inno_name": "Yoruba", "id": "$0438"},  # Does NOT exist in Inno Languages
}
