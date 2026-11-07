import hashlib
import struct

HEADER_SIZE = 80
ZIM_MAGIC = 0x044D495A
NO_LAYOUT_PAGE = 0xFFFFFFFF
UNCOMPRESSED_CLUSTER = 1
ZSTD_CLUSTER = 5
EXTENDED_OFFSETS = 0x10
MIME_LIST = b"text/html\x00\x00"
ARTICLE_URL = b"Index"
ARTICLE_TITLE = b"Index"
BLOB_BODY = b"<html><body>Hello, ZIM</body></html>"


def build_minimal_zim():
    return build_zim([(b"C", ARTICLE_URL, "text/html", BLOB_BODY)])


def build_zim(entries, compression=UNCOMPRESSED_CLUSTER, extended=False):
    entries = sorted(entries, key=lambda e: e[0] + b"/" + e[1])
    mimetypes = sorted({e[2] for e in entries})
    mime_list = b"".join(m.encode() + b"\x00" for m in mimetypes) + b"\x00"
    count = len(entries)
    mime_list_pos = HEADER_SIZE
    url_ptr_pos = mime_list_pos + len(mime_list)
    title_ptr_pos = url_ptr_pos + 8 * count
    cluster_ptr_pos = title_ptr_pos + 4 * count
    dir_entries_pos = cluster_ptr_pos + 8

    dir_entries = b""
    url_ptrs = []
    for blob_number, (namespace, url, mimetype, _body) in enumerate(entries):
        url_ptrs.append(dir_entries_pos + len(dir_entries))
        dir_entries += (
            struct.pack(
                "<HBcIII", mimetypes.index(mimetype), 0, namespace, 0, 0, blob_number
            )
            + url
            + b"\x00"
            + url
            + b"\x00"
        )
    clusters_pos = dir_entries_pos + len(dir_entries)

    offset_format = "Q" if extended else "I"
    offsets = [struct.calcsize(offset_format) * (count + 1)]
    for *_rest, body in entries:
        offsets.append(offsets[-1] + len(body))
    cluster = (
        bytes([compression | (EXTENDED_OFFSETS if extended else 0)])
        + struct.pack(f"<{count + 1}{offset_format}", *offsets)
        + b"".join(e[3] for e in entries)
    )
    checksum_pos = clusters_pos + len(cluster)

    header = struct.pack(
        "<IHH16sIIQQQQIIQ",
        ZIM_MAGIC,
        6,
        1,
        b"\x00" * 16,
        count,
        1,
        url_ptr_pos,
        title_ptr_pos,
        cluster_ptr_pos,
        mime_list_pos,
        0,
        NO_LAYOUT_PAGE,
        checksum_pos,
    )
    body = (
        mime_list
        + struct.pack(f"<{count}Q", *url_ptrs)
        + struct.pack(f"<{count}I", *range(count))
        + struct.pack("<Q", clusters_pos)
        + dir_entries
        + cluster
    )
    return header + body + hashlib.md5(header + body).digest()


def build_zim_with_redirect():
    mime_list_pos = HEADER_SIZE
    url_ptr_pos = mime_list_pos + len(MIME_LIST)
    title_ptr_pos = url_ptr_pos + 16
    cluster_ptr_pos = title_ptr_pos + 8
    dir_entries_pos = cluster_ptr_pos + 8

    article = (
        struct.pack("<HBcIII", 0, 0, b"C", 0, 0, 0)
        + ARTICLE_URL
        + b"\x00"
        + ARTICLE_TITLE
        + b"\x00"
    )
    article_offset = dir_entries_pos

    redirect_url = b"Redirect"
    redirect_title = b"Redirect"
    redirect_target_index = 0
    redirect = (
        struct.pack("<HBcII", 0xFFFF, 0, b"C", 0, redirect_target_index)
        + redirect_url
        + b"\x00"
        + redirect_title
        + b"\x00"
    )
    redirect_offset = article_offset + len(article)

    clusters_pos = redirect_offset + len(redirect)
    cluster_body = struct.pack("<II", 8, 8 + len(BLOB_BODY)) + BLOB_BODY
    cluster = bytes([UNCOMPRESSED_CLUSTER]) + cluster_body
    checksum_pos = clusters_pos + len(cluster)

    header = struct.pack(
        "<IHH16sIIQQQQIIQ",
        ZIM_MAGIC,
        6,
        1,
        b"\x00" * 16,
        2,
        1,
        url_ptr_pos,
        title_ptr_pos,
        cluster_ptr_pos,
        mime_list_pos,
        0,
        NO_LAYOUT_PAGE,
        checksum_pos,
    )
    url_ptr_list = struct.pack("<QQ", article_offset, redirect_offset)
    title_ptr_list = struct.pack("<II", 0, 1)
    cluster_ptr_list = struct.pack("<Q", clusters_pos)

    body = (
        MIME_LIST
        + url_ptr_list
        + title_ptr_list
        + cluster_ptr_list
        + article
        + redirect
        + cluster
    )
    checksum = hashlib.md5(header + body).digest()
    return header + body + checksum
