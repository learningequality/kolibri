"""
Writes the ZIM fixtures read by the reader's specs.

    uv run --with libzim==3.13.1 python kolibri/plugins/zim_viewer/frontend/sandbox_handler/reader/__tests__/fixtures/make_fixtures.py

minimal.zim is the Python tests' hand-packed ZIM, with the pointer lists before
the clusters. libzim.zim is written by libzim, which puts the dirents and pointer
lists after the clusters; libzim.json records what the resolver returns for each
entry.
"""

import io
import json
import os
import struct

from libzim.writer import Creator
from libzim.writer import Hint
from libzim.writer import Item
from libzim.writer import StringProvider

from kolibri.plugins.zim_viewer.test.fixtures import build_minimal_zim
from kolibri.plugins.zim_viewer.views import resolve_paths
from kolibri.plugins.zim_viewer.zim_format import ZimReader

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))
MINIMAL_ZIM_PATH = os.path.join(FIXTURES_DIR, "minimal.zim")
LIBZIM_ZIM_PATH = os.path.join(FIXTURES_DIR, "libzim.zim")
LIBZIM_JSON_PATH = os.path.join(FIXTURES_DIR, "libzim.json")

# https://wiki.openzim.org/wiki/ZIM_file_format#Header
HEADER_FORMAT = "<IHH16sIIQQQQIIQ"
# https://wiki.openzim.org/wiki/ZIM_file_format#Redirect_Entry
REDIRECT_MIMETYPE = 0xFFFF
INDEX_BODY = "<html><body>Hello, ZIM</body></html>"


class Page(Item):
    def __init__(self, path, body, compress):
        super().__init__()
        self.path = path
        self.body = body
        self.compress = compress

    def get_path(self):
        return self.path

    def get_title(self):
        return self.path

    def get_mimetype(self):
        return "text/html"

    def get_contentprovider(self):
        return StringProvider(self.body)

    def get_hints(self):
        return {Hint.FRONT_ARTICLE: False, Hint.COMPRESS: self.compress}


def pages():
    yield Page("Index", INDEX_BODY, True)
    for i in range(4):
        yield Page(f"page{i}", f"<p>page {i}</p>", i % 2 == 0)


def write_libzim_zim():
    if os.path.exists(LIBZIM_ZIM_PATH):
        os.remove(LIBZIM_ZIM_PATH)
    creator = Creator(LIBZIM_ZIM_PATH).config_indexing(False, "eng")
    # libzim closes a cluster once its content passes this size.
    with creator.config_clustersize(10) as c:
        c.set_mainpath("Index")
        for page in pages():
            c.add_item(page)
        c.add_redirection("Redirect", "Redirect", "Index", {Hint.FRONT_ARTICLE: False})
    with open(LIBZIM_ZIM_PATH, "rb") as fh:
        return fh.read()


def dirent_path(data, offset):
    mimetype, _, namespace = struct.unpack_from("<HBc", data, offset)
    path_pos = offset + (12 if mimetype == REDIRECT_MIMETYPE else 16)
    path = data[path_pos : data.index(b"\x00", path_pos)].decode()
    return f"{namespace.decode()}/{path}"


def describe_libzim_zim(data):
    fields = struct.unpack_from(HEADER_FORMAT, data)
    article_count, cluster_count, url_ptr_pos = fields[4], fields[5], fields[6]
    cluster_ptr_pos = fields[8]
    url_ptrs = struct.unpack_from(f"<{article_count}Q", data, url_ptr_pos)
    paths = [dirent_path(data, ptr) for ptr in url_ptrs]
    cluster_starts = struct.unpack_from(f"<{cluster_count}Q", data, cluster_ptr_pos)
    cluster_ends = [*cluster_starts[1:], min(url_ptrs)]
    return {
        "descriptors": resolve_paths(ZimReader(io.BytesIO(data)), paths),
        "bodies": {f"C/{page.path}": page.body for page in pages()},
        "clusterRanges": [
            f"{start}-{end - 1}" for start, end in zip(cluster_starts, cluster_ends)
        ],
    }


def main():
    with open(MINIMAL_ZIM_PATH, "wb") as fh:
        fh.write(build_minimal_zim())
    description = describe_libzim_zim(write_libzim_zim())
    with open(LIBZIM_JSON_PATH, "w") as fh:
        json.dump(description, fh, indent=2, sort_keys=True)
        fh.write("\n")


if __name__ == "__main__":
    main()
