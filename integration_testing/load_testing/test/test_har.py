import json
import threading
from http.server import BaseHTTPRequestHandler
from http.server import ThreadingHTTPServer

import pytest
from har import drop_unreplayable
from har import parse_har

MAIN = "http://localhost:8001"
CONTENT = "http://localhost:53831"


def _entry(url, second):
    return {
        "startedDateTime": f"2026-06-04T03:16:{second:02d}.000Z",
        "request": {"method": "GET", "url": url},
    }


@pytest.fixture()
def har_file(tmp_path):
    urls = [
        f"{MAIN}/api/public/info/",
        f"{MAIN}/static/app/app-0.19.5.dev0%2Bgit.20260604030828.js",
        f"{CONTENT}/content/zipcontent/abc.zip/jquery-1.11.3.min.js",
        f"{CONTENT}/content/static/sandbox/sandbox-18a478c1aa12b651ae09.js",
        f"blob:{CONTENT}/2f5dcdf8-d129-4441-a3e4-4a4bd149a025",
        "https://cdn.jsdelivr.net/npm/mathjax.js",
    ]
    path = tmp_path / "flow.har"
    path.write_text(
        json.dumps({"log": {"entries": [_entry(url, i) for i, url in enumerate(urls)]}})
    )
    return str(path)


def test_parse_har_replays_both_kolibri_origins(har_file):
    requests = parse_har(har_file, "0.20.0")
    assert [(r["path"], r.get("content", False)) for r in requests] == [
        ("/api/public/info/", False),
        ("/static/app/app-0.20.0.js", False),
        ("/content/zipcontent/abc.zip/jquery-1.11.3.min.js", True),
        ("/content/static/sandbox/sandbox-18a478c1aa12b651ae09.js", True),
    ]


def _total_delay(requests):
    return (
        sum(r.get("delay_min", 0) for r in requests),
        sum(r.get("delay_max", 0) for r in requests),
    )


def test_parse_har_keeps_the_delay_of_skipped_requests(har_file):
    assert _total_delay(parse_har(har_file, "0.20.0")) == (
        pytest.approx(5 * 0.8),
        pytest.approx(5 * 1.2),
    )


def _start_server(served):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *args):
            pass

        def do_GET(self):
            self.send_response(200 if self.path in served else 404)
            self.send_header("Content-Length", "0")
            self.end_headers()

    server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
    threading.Thread(target=server.serve_forever, daemon=True).start()
    return server, f"http://127.0.0.1:{server.server_address[1]}"


@pytest.fixture()
def origins():
    servers = []

    def start(served):
        server, url = _start_server(served)
        servers.append(server)
        return url

    yield start
    for server in servers:
        server.shutdown()
        server.server_close()


REQUESTS = [
    {"method": "get", "path": "/static/app/app-0.20.0.js"},
    {"method": "get", "path": "/static/app/app-2448-0.20.0.js"},
    {
        "method": "get",
        "path": "/content/zipcontent/abc.zip/index.html",
        "content": True,
    },
    {
        "method": "get",
        "path": "/content/static/sandbox/sandbox-1a2b.js",
        "content": True,
    },
    {
        "method": "get",
        "path": "/content/static/sandbox/sandbox-3c4d.js",
        "content": True,
    },
]


def test_drop_unreplayable_probes_static_files_on_their_own_origin(origins):
    server = origins({"/static/app/app-0.20.0.js"})
    content = origins({"/content/static/sandbox/sandbox-1a2b.js"})
    kept = drop_unreplayable(REQUESTS, server, content)
    assert [r["path"] for r in kept] == [
        "/static/app/app-0.20.0.js",
        "/content/zipcontent/abc.zip/index.html",
        "/content/static/sandbox/sandbox-1a2b.js",
    ]


def test_drop_unreplayable_keeps_the_delay_of_dropped_requests(origins):
    timed = [{**request, "delay_min": 0.8, "delay_max": 1.2} for request in REQUESTS]
    server = origins({"/static/app/app-0.20.0.js"})
    kept = drop_unreplayable(timed, server, None)
    assert len(kept) == 1
    assert _total_delay(kept) == pytest.approx(_total_delay(timed))


def test_drop_unreplayable_drops_content_requests_without_a_content_origin(origins):
    server = origins({"/static/app/app-0.20.0.js", "/static/app/app-2448-0.20.0.js"})
    kept = drop_unreplayable(REQUESTS, server, None)
    assert [r["path"] for r in kept] == [
        "/static/app/app-0.20.0.js",
        "/static/app/app-2448-0.20.0.js",
    ]
