import os

from ..globals import get_current_language


APP_INITIALIZE_URL = "/app/api/initialize/{key}"


def get_localized_file(file_path_template, file_path_fallback):
    language = get_current_language()

    if not language:
        return file_path_fallback

    file_path = file_path_template.format(language)

    if not os.path.exists(file_path):
        # TODO: Removing the country code like this isn't the same behaviour as
        #       gettext. Ideally our translated asset files should either be
        #       generated or should use the same language codes as the provided
        #       translations.
        language_base = language.split("_", 1)[0]
        file_path = file_path_template.format(language_base)

    if not os.path.exists(file_path):
        file_path = file_path_fallback

    return file_path


def get_kolibri_initialize_url(base_url, app_key, next_url=None):
    url = APP_INITIALIZE_URL.format(key=app_key)
    if next_url:
        url += "?next={next_url}".format(next_url=next_url)
    return base_url + url.lstrip("/")

