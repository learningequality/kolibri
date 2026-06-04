import pytest
from grouping import group_name


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
    ],
)
def test_group_name(path, expected):
    assert group_name(path) == expected
