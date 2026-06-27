import posixpath
import re

HEX_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def group_name(path, content=False):
    return "zip " + _path_group(path) if content else _path_group(path)


def _path_group(path):
    path = path.partition("?")[0]
    for prefix in ("/content/storage/", "/content/zipcontent/"):
        if path.startswith(prefix):
            return prefix + "{file}" + posixpath.splitext(path)[1]
    for prefix in ("/static/", "/content/static/"):
        if path.startswith(prefix):
            return prefix + "{file}"
    return "/".join(
        "{id}" if HEX_ID_RE.match(segment) else segment for segment in path.split("/")
    )


def not_found_key(path):
    return group_name(path) if "/api/" in path else path.partition("?")[0]
