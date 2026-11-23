import json
import threading
from http.server import BaseHTTPRequestHandler
from http.server import ThreadingHTTPServer

import pytest
from kolibri_client import missing_paths
from kolibri_client import static_bundle_version
from kolibri_client import zip_content_origin

DIRTY_VERSION = "0.20.0a2.dev18+g81225838e.d20260814"
CLEAN_VERSION = "0.20.0a2.dev18+g81225838e"


def _bundle_path(version):
    return (
        "/static/kolibri.core.default_frontend/"
        f"kolibri.core.default_frontend-{version}.js"
    )


@pytest.fixture()
def static_server():
    served = set()

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            self.send_response(200 if self.path in served else 404)
            self.send_header("Content-Length", "0")
            self.end_headers()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}", served
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize("bundle_version", [DIRTY_VERSION, CLEAN_VERSION])
def test_static_bundle_version_matches_the_served_bundle(static_server, bundle_version):
    url, served = static_server
    served.add(_bundle_path(bundle_version))
    assert static_bundle_version(url, DIRTY_VERSION) == bundle_version


def test_release_version_is_used_as_is(static_server):
    url, _ = static_server
    assert static_bundle_version(url, "0.19.4") == "0.19.4"


def test_missing_paths_are_the_ones_the_server_404s(static_server):
    url, served = static_server
    served.add("/static/assets/fonts/noto-common-3120aa39.css")
    assert missing_paths(
        url,
        {
            "/static/assets/fonts/noto-common-3120aa39.css",
            "/static/kolibri.core.default_frontend/default_frontend-2448-0.19.4.js",
        },
    ) == {"/static/kolibri.core.default_frontend/default_frontend-2448-0.19.4.js"}


@pytest.fixture()
def page_server():
    page = {"plugin_data": {}}

    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            body = (
                '<html><template data-plugin="kolibri.core.default_frontend">'
                f"{json.dumps(page['plugin_data'], separators=(',', ':'))}"
                "</template></html>"
            ).encode()
            self.send_response(200)
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            self.wfile.write(body)

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    yield f"http://127.0.0.1:{server.server_address[1]}", page
    server.shutdown()
    server.server_close()


@pytest.mark.parametrize(
    ("origin", "port", "expected"),
    [
        ("", "53831", "http://127.0.0.1:53831"),
        ("https://zip.example.org/", "", "https://zip.example.org"),
    ],
)
def test_zip_content_origin_follows_the_page_settings(
    page_server, origin, port, expected
):
    url, page = page_server
    page["plugin_data"] = {
        "__zipContentOrigin": origin,
        "__zipContentPort": port,
    }
    assert zip_content_origin(url) == expected


def test_zip_content_origin_is_none_when_the_page_has_no_settings(page_server):
    url, _ = page_server
    assert zip_content_origin(url) is None
