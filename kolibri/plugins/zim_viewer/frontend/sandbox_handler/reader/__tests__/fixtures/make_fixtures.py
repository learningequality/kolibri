"""
Writes the ZIM fixtures read by the reader's specs.

    uv run --no-project --with libzim python kolibri/plugins/zim_viewer/frontend/sandbox_handler/reader/__tests__/fixtures/make_fixtures.py

minimal.zim is packed by hand with the pointer lists before the clusters.
libzim.zim is written by libzim, which puts the dirents and pointer lists
after the clusters; libzim.json records where it put each entry.
"""

import hashlib
import json
import os
import struct

from libzim.writer import Creator
from libzim.writer import Hint
from libzim.writer import Item
from libzim.writer import StringProvider

FIXTURES_DIR = os.path.dirname(os.path.abspath(__file__))
MINIMAL_ZIM_PATH = os.path.join(
    FIXTURES_DIR, "..", "..", "..", "..", "..", "test", "data", "minimal.zim"
)
LIBZIM_ZIM_PATH = os.path.join(FIXTURES_DIR, "libzim.zim")
LIBZIM_JSON_PATH = os.path.join(FIXTURES_DIR, "libzim.json")

HEADER_FORMAT = "<IHH16sIIQQQQIIQ"
ZIM_MAGIC = 0x044D495A
NO_PAGE = 0xFFFFFFFF
REDIRECT_MIMETYPE = 0xFFFF
UNCOMPRESSED_CLUSTER = 1
INDEX_BODY = "<html><body>Hello, ZIM</body></html>"


def build_minimal_zim():
    mime_list = b"text/html\x00\x00"
    mime_list_pos = struct.calcsize(HEADER_FORMAT)
    url_ptr_pos = mime_list_pos + len(mime_list)
    title_ptr_pos = url_ptr_pos + 8
    cluster_ptr_pos = title_ptr_pos + 4
    dirent_pos = cluster_ptr_pos + 8
    dirent = struct.pack("<HBcIII", 0, 0, b"C", 0, 0, 0) + b"Index\x00Index\x00"
    cluster_pos = dirent_pos + len(dirent)
    blob = INDEX_BODY.encode()
    cluster = (
        bytes([UNCOMPRESSED_CLUSTER]) + struct.pack("<II", 8, 8 + len(blob)) + blob
    )
    checksum_pos = cluster_pos + len(cluster)
    header = struct.pack(
        HEADER_FORMAT,
        ZIM_MAGIC,
        6,
        1,
        b"\x00" * 16,
        1,
        1,
        url_ptr_pos,
        title_ptr_pos,
        cluster_ptr_pos,
        mime_list_pos,
        0,
        NO_PAGE,
        checksum_pos,
    )
    body = (
        mime_list
        + struct.pack("<Q", dirent_pos)
        + struct.pack("<I", 0)
        + struct.pack("<Q", cluster_pos)
        + dirent
        + cluster
    )
    return header + body + hashlib.md5(header + body).digest()


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
    # libzim closes a cluster once its content passes this size.
    creator = Creator(LIBZIM_ZIM_PATH).config_indexing(False, "eng")
    with creator.config_clustersize(10) as c:
        c.set_mainpath("Index")
        for page in pages():
            c.add_item(page)
        c.add_redirection("Redirect", "Redirect", "Index", {Hint.FRONT_ARTICLE: False})
    with open(LIBZIM_ZIM_PATH, "rb") as fh:
        return fh.read()


def read_dirent(data, offset, mimetypes):
    mimetype, _, namespace = struct.unpack_from("<HBc", data, offset)
    if mimetype == REDIRECT_MIMETYPE:
        (target,) = struct.unpack_from("<I", data, offset + 8)
        path_pos = offset + 12
        dirent = {"redirectIndex": target}
    else:
        cluster, blob = struct.unpack_from("<II", data, offset + 8)
        path_pos = offset + 16
        dirent = {
            "clusterNumber": cluster,
            "blobNumber": blob,
            "mimetype": mimetypes[mimetype],
        }
    path = data[path_pos : data.index(b"\x00", path_pos)].decode()
    dirent.update(namespace=namespace.decode(), path=f"{namespace.decode()}/{path}")
    return dirent


def describe_libzim_zim(data):
    fields = struct.unpack_from(HEADER_FORMAT, data)
    article_count, cluster_count, url_ptr_pos = fields[4], fields[5], fields[6]
    cluster_ptr_pos, mime_list_pos = fields[8], fields[9]
    mimetypes = data[mime_list_pos : data.index(b"\x00\x00", mime_list_pos)]
    mimetypes = mimetypes.decode().split("\x00")
    url_ptrs = struct.unpack_from(f"<{article_count}Q", data, url_ptr_pos)
    dirents = [read_dirent(data, ptr, mimetypes) for ptr in url_ptrs]
    descriptors = {}
    for dirent in dirents:
        resolved = dirent
        while "redirectIndex" in resolved:
            resolved = dirents[resolved["redirectIndex"]]
        descriptors[dirent["path"]] = resolved
    cluster_starts = struct.unpack_from(f"<{cluster_count}Q", data, cluster_ptr_pos)
    cluster_ends = [*cluster_starts[1:], min(url_ptrs)]
    return {
        "descriptors": descriptors,
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
