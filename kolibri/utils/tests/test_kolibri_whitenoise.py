import os
import re
import tempfile
from gzip import compress
from gzip import GzipFile
from http import HTTPStatus
from io import BytesIO
from unittest.mock import MagicMock
from unittest.mock import mock_open
from unittest.mock import patch

import pytest
from whitenoise.responders import Response

from kolibri.utils.kolibri_whitenoise import COMPRESSED_FILE_FOR_REGULAR_PATH
from kolibri.utils.kolibri_whitenoise import DynamicWhiteNoise
from kolibri.utils.kolibri_whitenoise import EndRangeStaticFile
from kolibri.utils.kolibri_whitenoise import FileFinder
from kolibri.utils.kolibri_whitenoise import MAX_RANGES_HEADER
from kolibri.utils.kolibri_whitenoise import MULTIPART_MAX_RANGES
from kolibri.utils.kolibri_whitenoise import NOT_FOUND
from kolibri.utils.kolibri_whitenoise import SlicedFile
from kolibri.utils.kolibri_whitenoise import StreamingStaticFile


def test_file_finder():
    tempdir1 = tempfile.mkdtemp()
    tempdir2 = tempfile.mkdtemp()
    prefix = "/test"
    tempdir1tempfile, tempdir1tempfilepath = tempfile.mkstemp(dir=tempdir1)
    tempdir2tempfile, tempdir2tempfilepath = tempfile.mkstemp(dir=tempdir2)
    tempdir1tempfilename = os.path.basename(tempdir1tempfilepath)
    tempdir2tempfilename = os.path.basename(tempdir2tempfilepath)
    file_finder = FileFinder([(prefix, tempdir1), (prefix, tempdir2)])
    assert tempdir1tempfilepath == file_finder.find(prefix + "/" + tempdir1tempfilename)
    assert tempdir2tempfilepath == file_finder.find(prefix + "/" + tempdir2tempfilename)
    assert file_finder.find("notafile") == []
    os.close(tempdir1tempfile)
    os.remove(tempdir1tempfilepath)
    os.close(tempdir2tempfile)
    os.remove(tempdir2tempfilepath)
    os.removedirs(tempdir1)
    os.removedirs(tempdir2)


def test_dynamic_whitenoise():
    tempdir11 = tempfile.mkdtemp()
    tempdir12 = tempfile.mkdtemp()
    prefix1 = "/test"
    tempdir11tempfile, tempdir11tempfilepath = tempfile.mkstemp(dir=tempdir11)
    tempdir12tempfile, tempdir12tempfilepath = tempfile.mkstemp(dir=tempdir12)
    tempdir11tempfilename = os.path.basename(tempdir11tempfilepath)
    tempdir12tempfilename = os.path.basename(tempdir12tempfilepath)
    tempdir21 = tempfile.mkdtemp()
    tempdir22 = tempfile.mkdtemp()
    prefix2 = "/notatest"
    tempdir21tempfile, tempdir21tempfilepath = tempfile.mkstemp(dir=tempdir21)
    tempdir22tempfile, tempdir22tempfilepath = tempfile.mkstemp(dir=tempdir22)
    tempdir21tempfilename = os.path.basename(tempdir21tempfilepath)
    tempdir22tempfilename = os.path.basename(tempdir22tempfilepath)
    dynamic_whitenoise = DynamicWhiteNoise(
        MagicMock(),
        dynamic_locations=[
            (prefix1, tempdir11),
            (prefix1, tempdir12),
            (prefix2, tempdir21),
            (prefix2, tempdir22),
        ],
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix1 + "/" + tempdir11tempfilename, None
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix1 + "/" + tempdir12tempfilename, None
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix2 + "/" + tempdir21tempfilename, None
        )
        is not None
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix2 + "/" + tempdir22tempfilename, None
        )
        is not None
    )
    assert dynamic_whitenoise.find_and_cache_dynamic_file("notafile", None) is None
    os.close(tempdir11tempfile)
    os.remove(tempdir11tempfilepath)
    os.close(tempdir12tempfile)
    os.remove(tempdir12tempfilepath)
    os.close(tempdir21tempfile)
    os.remove(tempdir21tempfilepath)
    os.close(tempdir22tempfile)
    os.remove(tempdir22tempfilepath)
    os.removedirs(tempdir11)
    os.removedirs(tempdir12)


def test_dynamic_whitenoise_suspicious_file():
    tempdir11 = tempfile.mkdtemp()
    tempdir12 = tempfile.mkdtemp()
    prefix1 = "/test"
    dynamic_whitenoise = DynamicWhiteNoise(
        MagicMock(),
        dynamic_locations=[
            (prefix1, tempdir11),
            (prefix1, tempdir12),
        ],
    )
    assert (
        dynamic_whitenoise.find_and_cache_dynamic_file(
            prefix1 + "/" + tempdir11 + "../../../leet_haxx0r.js", None
        )
        is not NOT_FOUND
    )
    os.removedirs(tempdir11)
    os.removedirs(tempdir12)


@pytest.fixture
def mock_stat():
    with patch("os.stat") as mock_stat:
        mock_stat.return_value = MagicMock(st_size=1000, st_mode=33188)
        yield mock_stat


@pytest.fixture
def mock_file():
    with patch("builtins.open", new_callable=mock_open, read_data=b"data") as mock_file:
        yield mock_file


def test_get_response_non_gzipped_from_gzip(mock_stat, mock_file):
    headers = [("Content-Length", "1000")]
    static_file = EndRangeStaticFile("dummy_path", headers)
    static_file.alternatives = [
        (re.compile(r""), "dummy_path.gz" + COMPRESSED_FILE_FOR_REGULAR_PATH, headers)
    ]

    request_headers = {"HTTP_ACCEPT_ENCODING": ""}
    response = static_file.get_response("GET", request_headers)

    assert isinstance(response, Response)
    assert response.status == HTTPStatus.OK

    # Ensure GzipFile was used to read the file
    assert isinstance(response.file, GzipFile)


def test_get_response_gzipped(mock_stat, mock_file):
    headers = [("Content-Length", "1000")]
    static_file = EndRangeStaticFile("dummy_path", headers)
    static_file.alternatives = [(re.compile("gz"), "dummy_path.gz", headers)]

    request_headers = {"HTTP_ACCEPT_ENCODING": "gzip"}
    response = static_file.get_response("GET", request_headers)

    assert isinstance(response, Response)
    assert response.status == HTTPStatus.OK
    assert response.file is not None
    assert not isinstance(response.file, GzipFile)


def test_get_response_non_gzipped(mock_stat, mock_file):
    headers = [("Content-Length", "1000")]
    static_file = EndRangeStaticFile("dummy_path", headers)
    static_file.alternatives = [(re.compile(""), "dummy_path", headers)]

    request_headers = {"HTTP_ACCEPT_ENCODING": "*"}
    response = static_file.get_response("GET", request_headers)

    assert isinstance(response, Response)
    assert response.status == HTTPStatus.OK
    assert response.file is not None
    assert not isinstance(response.file, GzipFile)


def test_get_range_response(mock_stat, mock_file):
    headers = [("Content-Length", "1000")]
    static_file = EndRangeStaticFile("dummy_path", headers)
    static_file.alternatives = [(re.compile(""), "dummy_path", headers)]

    request_headers = {"HTTP_RANGE": "bytes=0-499"}
    path, headers = static_file.get_path_and_headers(request_headers)
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response("bytes=0-499", headers, file_handle)

    assert isinstance(response, Response)
    assert response.status == HTTPStatus.PARTIAL_CONTENT
    assert "Content-Range" in dict(response.headers)
    assert dict(response.headers)["Content-Range"] == "bytes 0-499/1000"
    assert response.file is not None
    assert isinstance(response.file, SlicedFile)


def _read_all(fileobj):
    chunks = []
    while True:
        chunk = fileobj.read(64)
        if not chunk:
            break
        chunks.append(chunk)
    return b"".join(chunks)


def _expected_multipart_body(response, content, ranges):
    ctype = dict(response.headers)["Content-Type"]
    prefix = "multipart/byteranges; boundary="
    assert ctype.startswith(prefix)
    boundary = ctype[len(prefix) :]
    body = b""
    for start, end in ranges:
        body += (
            f"--{boundary}\r\n"
            "Content-Type: application/octet-stream\r\n"
            f"Content-Range: bytes {start}-{end}/{len(content)}\r\n"
            "\r\n"
        ).encode()
        body += content[start : end + 1] + b"\r\n"
    return body + f"--{boundary}--\r\n".encode()


@pytest.fixture
def real_static_file(tmp_path):
    content = bytes(i % 256 for i in range(1000))
    path = tmp_path / "data.bin"
    path.write_bytes(content)
    headers = [("Content-Length", "1000"), ("Content-Type", "application/octet-stream")]
    static_file = EndRangeStaticFile(str(path), headers)
    return static_file, str(path), headers, content


@pytest.fixture
def gzip_sibling_static_file(tmp_path):
    content = bytes(i % 256 for i in range(1000))
    path = tmp_path / "data.bin"
    path.write_bytes(content)
    gz_path = tmp_path / "data.bin.gz"
    gz_path.write_bytes(compress(content))
    static_file = EndRangeStaticFile(
        str(path),
        [("Content-Type", "application/octet-stream")],
        encodings={"gzip": str(gz_path)},
    )
    return static_file, gz_path.read_bytes()


def test_multirange_on_gzip_alternative_serves_full_file(gzip_sibling_static_file):
    static_file, gz_content = gzip_sibling_static_file
    response = static_file.get_response(
        "GET", {"HTTP_ACCEPT_ENCODING": "gzip", "HTTP_RANGE": "bytes=0-9,50-59"}
    )
    with response.file:
        body = _read_all(response.file)
    assert response.status == HTTPStatus.OK
    assert dict(response.headers)["Content-Encoding"] == "gzip"
    assert body == gz_content


def test_single_range_on_gzip_alternative_omits_max_ranges(gzip_sibling_static_file):
    static_file, _gz_content = gzip_sibling_static_file
    response = static_file.get_response(
        "GET", {"HTTP_ACCEPT_ENCODING": "gzip", "HTTP_RANGE": "bytes=0-9"}
    )
    response.file.close()
    assert response.status == HTTPStatus.PARTIAL_CONTENT
    assert MAX_RANGES_HEADER not in dict(response.headers)


def test_get_multipart_range_response(real_static_file):
    static_file, path, headers, content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(
            "bytes=0-9,500-509", headers, file_handle
        )
        body = _read_all(response.file)

    assert response.status == HTTPStatus.PARTIAL_CONTENT
    resp_headers = dict(response.headers)
    assert int(resp_headers["Content-Length"]) == len(body)
    assert body == _expected_multipart_body(response, content, [(0, 9), (500, 509)])


@pytest.mark.parametrize("range_header", ["bytes=10-5", "bytes=10-5,20-29"])
def test_inverted_range_spec_serves_full_file(real_static_file, range_header):
    static_file, _path, _headers, content = real_static_file
    response = static_file.get_response("GET", {"HTTP_RANGE": range_header})
    with response.file:
        body = _read_all(response.file)
    assert response.status == HTTPStatus.OK
    assert body == content


def test_single_byte_range_is_satisfiable(real_static_file):
    static_file, path, headers, content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response("bytes=5-5", headers, file_handle)
        body = _read_all(response.file)
    assert response.status == HTTPStatus.PARTIAL_CONTENT
    assert dict(response.headers)["Content-Range"] == "bytes 5-5/1000"
    assert body == content[5:6]


def test_multipart_advertises_max_ranges(real_static_file):
    static_file, path, headers, _content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(
            "bytes=0-9,500-509", headers, file_handle
        )
    assert dict(response.headers)[MAX_RANGES_HEADER] == str(MULTIPART_MAX_RANGES)


def test_single_range_advertises_max_ranges(real_static_file):
    static_file, path, headers, _content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response("bytes=0-9", headers, file_handle)
    assert response.status == HTTPStatus.PARTIAL_CONTENT
    assert isinstance(response.file, SlicedFile)
    assert dict(response.headers)[MAX_RANGES_HEADER] == str(MULTIPART_MAX_RANGES)


def test_multipart_coalesces_overlapping_ranges(real_static_file):
    static_file, path, headers, content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(
            "bytes=0-9,5-14", headers, file_handle
        )
        body = _read_all(response.file)
    assert body == _expected_multipart_body(response, content, [(0, 14)])


def test_multipart_over_cap_returns_416_not_full_file(real_static_file):
    static_file, path, headers, _content = real_static_file
    spec = "bytes=" + ",".join(
        f"{i * 2}-{i * 2}" for i in range(MULTIPART_MAX_RANGES + 1)
    )
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(spec, headers, file_handle)
    assert response.status == HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE
    assert dict(response.headers)["Content-Range"] == "bytes */1000"


def test_multipart_all_unsatisfiable_returns_416(real_static_file):
    static_file, path, headers, _content = real_static_file
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(
            "bytes=2000-3000,4000-5000", headers, file_handle
        )
    assert response.status == HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE


class _FakeRemoteFile(BytesIO):
    def get_file_size(self):
        return len(self.getvalue())


def test_streaming_static_file_serves_full_file_for_multirange():
    content = bytes(i % 256 for i in range(1000))
    static_file = StreamingStaticFile(
        "/content/storage/a/b/data.bin",
        [("Content-Type", "application/octet-stream")],
        "http://remote.test/content/storage/a/b/data.bin",
    )
    with patch(
        "kolibri.utils.kolibri_whitenoise.RemoteFile",
        side_effect=lambda path, url: _FakeRemoteFile(content),
    ):
        response = static_file.get_response("GET", {"HTTP_RANGE": "bytes=0-9,500-509"})
    with response.file:
        body = _read_all(response.file)
    assert response.status == HTTPStatus.OK
    assert body == content


def test_multipart_from_compressed_file_for_regular_path(tmp_path):
    content = bytes(i % 256 for i in range(1000))
    path = tmp_path / "data.bin"
    path.write_bytes(b"")
    (tmp_path / "data.bin.file_size").write_text(str(len(content)))
    (tmp_path / "data.bin.gz").write_bytes(compress(content))
    static_file = EndRangeStaticFile(
        str(path),
        [("Content-Type", "application/octet-stream")],
        encodings={"gzip": str(tmp_path / "data.bin.gz")},
    )
    response = static_file.get_response(
        "GET", {"HTTP_ACCEPT_ENCODING": "", "HTTP_RANGE": "bytes=500-509,0-9"}
    )
    with response.file:
        body = _read_all(response.file)
    assert response.status == HTTPStatus.PARTIAL_CONTENT
    assert body == _expected_multipart_body(response, content, [(0, 9), (500, 509)])


def test_multipart_over_cap_rejected_before_coalescing(real_static_file):
    static_file, path, headers, _content = real_static_file
    spec = "bytes=" + ",".join(["0-9"] * (MULTIPART_MAX_RANGES + 1))
    with open(path, "rb") as file_handle:
        response = static_file.get_range_response(spec, headers, file_handle)
    assert response.status == HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE


@pytest.mark.filterwarnings("error::pytest.PytestUnraisableExceptionWarning")
def test_multipart_head_reports_full_content_length(real_static_file):
    static_file, path, headers, _content = real_static_file
    with open(path, "rb") as file_handle:
        get_resp = static_file.get_range_response(
            "bytes=0-9,500-509", headers, file_handle
        )
    head_resp = static_file.get_range_response("bytes=0-9,500-509", headers, None)
    assert head_resp.file is None
    head_length = dict(head_resp.headers)["Content-Length"]
    assert head_length == dict(get_resp.headers)["Content-Length"]
    assert int(head_length) > 0
