import hashlib
import struct

HEADER_SIZE = 80
ZIM_MAGIC = 0x044D495A
NO_LAYOUT_PAGE = 0xFFFFFFFF
REDIRECT_MIMETYPE = 0xFFFF
UNCOMPRESSED_CLUSTER = 1
ZSTD_CLUSTER = 5
EXTENDED_OFFSETS = 0x10
ARTICLE_URL = b"Index"
BLOB_BODY = b"<html><body>Hello, ZIM</body></html>"


def build_minimal_zim():
    return build_zim([(b"C", ARTICLE_URL, "text/html", BLOB_BODY)])


def build_zim_with_redirect():
    return build_zim(
        [(b"C", ARTICLE_URL, "text/html", BLOB_BODY)],
        redirects=[(b"C", b"Redirect", b"C/" + ARTICLE_URL)],
    )


def build_zim(entries, compression=UNCOMPRESSED_CLUSTER, extended=False, redirects=()):
    entries = sorted(entries, key=lambda e: e[0] + b"/" + e[1])
    mimetypes = sorted({e[2] for e in entries})
    mime_list = b"".join(m.encode() + b"\x00" for m in mimetypes) + b"\x00"
    articles = {
        namespace + b"/" + url: (mimetypes.index(mimetype), blob_number)
        for blob_number, (namespace, url, mimetype, _body) in enumerate(entries)
    }
    redirect_targets = {
        namespace + b"/" + url: target for namespace, url, target in redirects
    }
    keys = sorted([*articles, *redirect_targets])
    count = len(keys)
    mime_list_pos = HEADER_SIZE
    url_ptr_pos = mime_list_pos + len(mime_list)
    title_ptr_pos = url_ptr_pos + 8 * count
    cluster_ptr_pos = title_ptr_pos + 4 * count
    dir_entries_pos = cluster_ptr_pos + 8

    dir_entries = b""
    url_ptrs = []
    for key in keys:
        namespace, url = key.split(b"/", 1)
        url_ptrs.append(dir_entries_pos + len(dir_entries))
        if key in redirect_targets:
            fixed = struct.pack(
                "<HBcII",
                REDIRECT_MIMETYPE,
                0,
                namespace,
                0,
                keys.index(redirect_targets[key]),
            )
        else:
            mime_index, blob_number = articles[key]
            fixed = struct.pack("<HBcIII", mime_index, 0, namespace, 0, 0, blob_number)
        dir_entries += fixed + url + b"\x00" + url + b"\x00"
    clusters_pos = dir_entries_pos + len(dir_entries)

    offset_format = "Q" if extended else "I"
    offsets = [struct.calcsize(offset_format) * (len(entries) + 1)]
    for *_rest, body in entries:
        offsets.append(offsets[-1] + len(body))
    cluster = (
        bytes([compression | (EXTENDED_OFFSETS if extended else 0)])
        + struct.pack(f"<{len(entries) + 1}{offset_format}", *offsets)
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
