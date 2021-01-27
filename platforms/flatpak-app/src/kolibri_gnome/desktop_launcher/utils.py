import os
from pathlib import Path

from ..globals import get_current_language


def get_localized_file(file_path_template, file_path_fallback):
    language = get_current_language()

    if not language:
        return file_path_fallback

    file_path = Path(file_path_template.format(language))

    if not file_path.exists():
        # TODO: Removing the country code like this isn't the same behaviour as
        #       gettext. Ideally our translated asset files should either be
        #       generated or should use the same language codes as the provided
        #       translations.
        language_base = language.split("_", 1)[0]
        file_path = Path(file_path_template.format(language_base))

    if not file_path.exists():
        file_path = Path(file_path_fallback)

    return file_path
