try:
    from strings import i18n_strings
except ImportError:
    i18n_strings = {}


def get_string(name, language):
    try:
        return i18n_strings[language][name]
    except KeyError:
        return name
