import pytest
from grouping import group_name
from grouping import not_found_key


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        (
            "/api/content/contentnode/0123456789abcdef0123456789abcdef/",
            "/api/content/contentnode/{id}/",
        ),
        ("/api/logger/userprogress/?user_id=1", "/api/logger/userprogress/"),
        (
            "/content/storage/a/b/ab0123456789abcdef0123456789abcd.mp4?v=1",
            "/content/storage/{file}.mp4",
        ),
        ("/static/kolibri.core.default_frontend-0.19.4.js", "/static/{file}"),
        ("/api/public/info/", "/api/public/info/"),
        (
            "/content/zipcontent/ca476c08d8ecdeea1a07a18740162370.zip/index.html",
            "/content/zipcontent/{file}.html",
        ),
        (
            "/content/zipcontent/71356527b572917a6f89d2380c434c85.h5p/content/audios/files-626a",
            "/content/zipcontent/{file}",
        ),
        (
            "/content/static/sandbox/sandbox-18a478c1aa12b651ae09.js",
            "/content/static/{file}",
        ),
    ],
)
def test_group_name(path, expected):
    assert group_name(path) == expected


def test_content_origin_requests_are_named_apart_from_the_servers():
    path = "/content/storage/a/b/ab0123456789abcdef0123456789abcd.mp4"
    assert group_name(path, content=True) == "zip /content/storage/{file}.mp4"


@pytest.mark.parametrize(
    ("path", "expected"),
    [
        (
            "/api/content/contentnode/0123456789abcdef0123456789abcdef/",
            "/api/content/contentnode/{id}/",
        ),
        (
            "/static/assets/fonts/noto-common-3120aa39.css",
            "/static/assets/fonts/noto-common-3120aa39.css",
        ),
    ],
)
def test_not_found_key_names_the_failing_file(path, expected):
    assert not_found_key(path) == expected
