import io
import struct

import pytest

from kolibri.plugins.zim_viewer.test.fixtures import BLOB_BODY
from kolibri.plugins.zim_viewer.test.fixtures import build_minimal_zim
from kolibri.plugins.zim_viewer.test.fixtures import build_zim_with_redirect
from kolibri.plugins.zim_viewer.zim_format import CorruptZimError
from kolibri.plugins.zim_viewer.zim_format import HEADER_FORMAT
from kolibri.plugins.zim_viewer.zim_format import HEADER_SIZE
from kolibri.plugins.zim_viewer.zim_format import NotZimError
from kolibri.plugins.zim_viewer.zim_format import ZIM_MAGIC
from kolibri.plugins.zim_viewer.zim_format import ZimReader

# https://wiki.openzim.org/wiki/ZIM_file_format#Header
CHECKSUM_POS_FIELD = 72


def open_minimal():
    return ZimReader(io.BytesIO(build_minimal_zim()))


def test_header_magic_and_counts():
    reader = open_minimal()
    header = reader.header
    assert header.magic == ZIM_MAGIC
    assert header.article_count == 1
    assert header.cluster_count == 1
    assert header.main_page == 0


def test_header_offsets_match_layout():
    reader = open_minimal()
    header = reader.header
    assert header.mime_list_pos == 80
    assert header.url_ptr_pos > header.mime_list_pos
    assert header.cluster_ptr_pos > header.url_ptr_pos


def test_rejects_non_zim_file():
    with pytest.raises(NotZimError):
        ZimReader(io.BytesIO(b"NOT A ZIM FILE" + b"\x00" * 100))


def test_mime_list_returns_single_text_html():
    reader = open_minimal()
    assert reader.mime_list() == ["text/html"]


def test_directory_entry_for_index_path():
    reader = open_minimal()
    entry = reader.find_entry("C/Index")
    assert entry is not None
    assert entry.namespace == "C"
    assert entry.cluster_number == 0
    assert entry.blob_number == 0
    assert entry.url == "Index"
    assert entry.mimetype == "text/html"
    assert entry.is_redirect is False


def test_find_entry_missing_returns_none():
    reader = open_minimal()
    assert reader.find_entry("C/Missing") is None


def test_find_entry_needs_a_namespace():
    reader = open_minimal()
    assert reader.find_entry("Index") is None


def test_rejects_an_old_namespace_zim():
    data = bytearray(build_minimal_zim())
    struct.pack_into("<H", data, 6, 0)
    with pytest.raises(NotZimError):
        ZimReader(io.BytesIO(bytes(data)))


def test_follow_redirect_resolves_to_target_article():
    reader = ZimReader(io.BytesIO(build_zim_with_redirect()))
    redirect_entry = reader.find_entry("C/Redirect")
    assert redirect_entry.is_redirect is True
    resolved = reader.follow_redirect(redirect_entry)
    assert resolved.url == "Index"
    assert resolved.is_redirect is False


def test_follow_redirect_returns_non_redirect_unchanged():
    reader = ZimReader(io.BytesIO(build_zim_with_redirect()))
    article_entry = reader.find_entry("C/Index")
    assert reader.follow_redirect(article_entry) is article_entry


def test_follow_redirect_caps_chain_depth():
    reader = ZimReader(io.BytesIO(build_zim_with_redirect()))
    original_cap = reader.MAX_REDIRECT_DEPTH
    try:
        reader.MAX_REDIRECT_DEPTH = 0
        redirect_entry = reader.find_entry("C/Redirect")
        with pytest.raises(CorruptZimError):
            reader.follow_redirect(redirect_entry)
    finally:
        reader.MAX_REDIRECT_DEPTH = original_cap


def test_follow_redirect_rejects_a_target_past_the_entry_list():
    data = bytearray(build_zim_with_redirect())
    struct.pack_into("<I", data, data.index(b"Redirect\x00") - 4, 2)
    reader = ZimReader(io.BytesIO(bytes(data)))
    with pytest.raises(CorruptZimError):
        reader.follow_redirect(reader.find_entry("C/Redirect"))


def test_mime_list_without_terminator_raises_corrupt():
    header = struct.pack(
        HEADER_FORMAT,
        0x044D495A,
        6,
        1,
        b"\x00" * 16,
        1,
        1,
        HEADER_SIZE,
        HEADER_SIZE,
        HEADER_SIZE,
        HEADER_SIZE,
        0,
        0,
        HEADER_SIZE,
    )
    data = header + b"\x01" * 64
    reader = ZimReader(io.BytesIO(data))
    with pytest.raises(CorruptZimError):
        reader.mime_list()


def test_mime_list_that_is_not_utf8_raises_corrupt():
    data = bytearray(build_minimal_zim())
    data[HEADER_SIZE] = 0xFF
    reader = ZimReader(io.BytesIO(bytes(data)))
    with pytest.raises(CorruptZimError):
        reader.mime_list()


def test_find_entry_on_truncated_body_raises_corrupt():
    data = build_minimal_zim()[: HEADER_SIZE + 5]
    reader = ZimReader(io.BytesIO(data))
    with pytest.raises(CorruptZimError):
        reader.find_entry("C/Index")


class OneByteReads(io.BytesIO):
    def read(self, size=-1):
        return super().read(min(size, 1) if size >= 0 else 1)


def test_reads_entries_from_a_stream_that_returns_short_reads():
    data = build_minimal_zim()
    reader = ZimReader(OneByteReads(data))
    entry = reader.find_entry("C/Index")
    assert entry.url == "Index"
    assert reader.blob_range(entry) == (data.index(BLOB_BODY), len(BLOB_BODY))


def test_blob_range_rejects_a_blob_past_the_file_despite_a_corrupt_checksum_pos():
    data = bytearray(build_minimal_zim())
    struct.pack_into("<Q", data, CHECKSUM_POS_FIELD, 2**40)
    struct.pack_into("<I", data, data.index(BLOB_BODY) - 4, 2 * len(data))
    reader = ZimReader(io.BytesIO(bytes(data)))
    with pytest.raises(CorruptZimError):
        reader.blob_range(reader.find_entry("C/Index"))
