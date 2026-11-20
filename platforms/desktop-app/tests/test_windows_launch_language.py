from unittest.mock import MagicMock
from unittest.mock import patch
from urllib.parse import parse_qs
from urllib.parse import urlsplit

import pytest
from windows_stubs import application

from kolibri.utils.i18n import KOLIBRI_SUPPORTED_LANGUAGES

ROOT_URL = "http://localhost:8080/app/api/initialize/token?auth_token=abc"


def launch_next(saved_state, languages=KOLIBRI_SUPPORTED_LANGUAGES):
    app = application.KolibriApp.__new__(application.KolibriApp)
    app.server_start_timer = None
    app.task_bar_icon = MagicMock()
    app.windows = []
    app.tray_only = True
    with (
        patch.object(app, "get_state", return_value=saved_state),
        patch.object(application, "get_installer_language", return_value="es-419"),
        patch.dict(application.OPTIONS["Deployment"], {"LANGUAGES": list(languages)}),
    ):
        app.load_kolibri(8080, root_url=ROOT_URL)
    return parse_qs(urlsplit(app.kolibri_url).query).get("next")


@pytest.mark.parametrize(
    ("display", "expected"), [(["ar-SA", "en-US"], "/ar/"), (["zh-CN"], "/zh-hans/")]
)
def test_launch_opens_kolibri_in_the_display_language(
    display_languages, display, expected
):
    display_languages.languages = display
    assert launch_next({}) == [expected]


def test_launch_resumes_the_saved_page(display_languages):
    display_languages.languages = ["ar-SA"]
    saved = {application.URL: "http://localhost:1234/es-419/learn/"}
    assert launch_next(saved) == ["/es-419/learn/"]


@pytest.mark.parametrize(
    ("display", "languages"),
    [(["cy-GB", "ar-SA"], KOLIBRI_SUPPORTED_LANGUAGES), (["ar-SA"], ["en", "fr-fr"])],
    ids=["unsupported", "disabled"],
)
def test_launch_without_an_enabled_display_language_opens_the_root(
    display_languages, display, languages
):
    display_languages.languages = display
    assert launch_next({}, languages=languages) is None
