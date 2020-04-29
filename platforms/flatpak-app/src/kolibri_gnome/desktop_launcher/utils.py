import os

from ..globals import get_current_language


def get_localized_file(file_path_template, file_path_fallback):
    language = get_current_language()
    file_path = file_path_template.format(language)
    if not os.path.exists(file_path):
        file_path = file_path_fallback
    return file_path

