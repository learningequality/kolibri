import json
import logging
import re
from datetime import datetime
from urllib.parse import unquote
from urllib.parse import urlparse

from kolibri_client import missing_paths

logger = logging.getLogger(__name__)

CONTENT_ORIGIN_PREFIXES = ("/content/zipcontent/", "/content/static/")
STATIC_PREFIXES = ("/static/", "/content/static/")


def _origin(url):
    parsed = urlparse(url)
    return f"{parsed.scheme}://{parsed.netloc}"


def _har_origins(entries):
    # Extract the original server URL from the first Kolibri API request in the HAR
    server = None
    for entry in entries:
        url = entry["request"]["url"]
        if "/api/" in url or urlparse(url).path.startswith("/static/"):
            server = _origin(url)
            break
    if not server:
        raise ValueError("Could not determine original server URL from HAR file")
    content = None
    for entry in entries:
        url = entry["request"]["url"]
        if _origin(url) != server and urlparse(url).path.startswith(
            CONTENT_ORIGIN_PREFIXES
        ):
            content = _origin(url)
            break
    return server, content


def parse_har(har_path, static_version):
    """
    Load and parse HAR file into request list.

    Requests to the HTML5 content origin (zipcontent, sandbox) are marked
    "content", to be replayed against the target server's content origin.

    Args:
        har_path: Path to HAR file
        static_version: Version to put into static bundle filenames

    Returns:
        list: Parsed request list ready for replay
    """
    with open(har_path) as f:
        har = json.load(f)

    entries = har["log"]["entries"]
    server, content = _har_origins(entries)

    # Build request list with delays
    # HAR spec: https://w3c.github.io/web-performance/specs/HAR/Overview.html
    requests = []
    for i, req in enumerate(entries):
        har_request = req["request"]
        full_url = har_request["url"]
        delay = _delay_to_next(entries, i)

        # Filter to requests to the Kolibri server and its content origin only
        if full_url.startswith(server + "/"):
            is_content = False
        elif content and full_url.startswith(content + "/"):
            is_content = True
        else:
            if requests and delay is not None:
                _add_delay(requests[-1], delay * 0.8, delay * 1.2)
            continue

        request_info = _request_info(har_request, static_version, is_content)
        if delay is not None:
            # Apply jitter (±20%)
            _add_delay(request_info, delay * 0.8, delay * 1.2)

        requests.append(request_info)

    return requests


def _request_info(har_request, static_version, is_content):
    # Parse URL to extract path
    parsed = urlparse(har_request["url"])
    url_path = parsed.path or "/"

    # Decode URL-encoded characters (e.g., %2B → +) for easier pattern matching
    url_path = unquote(url_path)

    # Replace version strings in static file filenames to match target Kolibri version
    # Webpack generates filenames like:
    # - JS files: filename-0.18.4.js (with dash)
    # - CSS files: filename0.19.0b1.dev0+git.27.g9908774d.css (NO dash before version)
    # Pattern matches version like: 0.18.4, 0.19.0b0.dev0+git.70.gb72619fc, etc.
    if url_path.startswith("/static/"):
        url_path = re.sub(
            r"\d+\.\d+\.\d+[a-zA-Z0-9+.]*\.(js|css)",
            rf"{static_version}.\1",
            url_path,
        )

    request_info = {"method": har_request["method"].lower(), "path": url_path}
    if is_content:
        request_info["content"] = True

    # Extract POST/PUT/PATCH body if present (HAR spec: postData object)
    post_data = har_request.get("postData", {})
    if post_data.get("mimeType") == "application/json" and post_data.get("text"):
        try:
            body = json.loads(post_data["text"])
            request_info["body"] = body
        except (json.JSONDecodeError, KeyError):
            pass

    # Extract query parameters (HAR spec: queryString is array of {name, value})
    query_string = har_request.get("queryString", [])
    if query_string:
        request_info["params"] = {item["name"]: item["value"] for item in query_string}

    return request_info


def _delay_to_next(entries, i):
    # Calculate delay until next request
    if i == len(entries) - 1:
        return None
    curr_time = datetime.fromisoformat(
        entries[i]["startedDateTime"].replace("Z", "+00:00")
    )
    next_time = datetime.fromisoformat(
        entries[i + 1]["startedDateTime"].replace("Z", "+00:00")
    )
    return (next_time - curr_time).total_seconds()


def _add_delay(request, delay_min, delay_max):
    request["delay_min"] = request.get("delay_min", 0) + delay_min
    request["delay_max"] = request.get("delay_max", 0) + delay_max


def _without(har_requests, dropped):
    kept = []
    for request in har_requests:
        if not dropped(request):
            kept.append(dict(request))
        elif kept and "delay_min" in request:
            _add_delay(kept[-1], request["delay_min"], request["delay_max"])
    return kept


def drop_unreplayable(har_requests, server_url, content_origin):
    if content_origin is None and any(r.get("content") for r in har_requests):
        logger.warning("Not replaying content-origin requests: no content origin found")
        har_requests = _without(har_requests, lambda r: r.get("content"))
    missing = set()
    for is_content, base in ((False, server_url), (True, content_origin)):
        static = {
            r["path"]
            for r in har_requests
            if r.get("content", False) == is_content
            and r["path"].startswith(STATIC_PREFIXES)
        }
        if static:
            for path in missing_paths(base, static):
                logger.warning(
                    "Not replaying %s%s: it does not exist there", base, path
                )
                missing.add((is_content, path))
    return _without(
        har_requests, lambda r: (r.get("content", False), r["path"]) in missing
    )
