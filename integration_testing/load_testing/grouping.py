import posixpath
import re

HEX_ID_RE = re.compile(r"^[0-9a-f]{32}$")


def group_name(path):
    path = path.partition("?")[0]
    if path.startswith("/content/storage/"):
        extension = posixpath.splitext(path)[1]
        return "/content/storage/{file}" + extension
    if path.startswith("/static/"):
        return "/static/{file}"
    return "/".join(
        "{id}" if HEX_ID_RE.match(segment) else segment for segment in path.split("/")
    )
