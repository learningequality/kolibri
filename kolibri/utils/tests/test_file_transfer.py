import hashlib
import math
import os
import shutil
import tempfile
import unittest

from mock import call
from mock import MagicMock
from mock import patch
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from kolibri.utils.file_transfer import BLOCK_SIZE
from kolibri.utils.file_transfer import ChunkedFile
from kolibri.utils.file_transfer import FileCopy
from kolibri.utils.file_transfer import FileDownload
from kolibri.utils.file_transfer import RemoteFile
from kolibri.utils.file_transfer import retry_import
from kolibri.utils.file_transfer import RETRY_STATUS_CODE
from kolibri.utils.file_transfer import SSLERROR
from kolibri.utils.file_transfer import TransferFailed
from kolibri.utils.filesystem import mkdirp


class BaseTestTransfer(unittest.TestCase):
    def set_test_data(self, partial=False):
        self.dest = self.destdir + "/test_file_{}".format(self.num_files)
        self.file_size = (1024 * 1024) + 731

        # Create dummy chunks
        self.chunks_count = int(math.ceil(float(self.file_size) / float(BLOCK_SIZE)))

        mkdirp(self.dest + ".chunks", exist_ok=True)

        hash = hashlib.md5()

        self.content = b""
        for i in range(self.chunks_count):
            size = (
                BLOCK_SIZE
                if i < self.chunks_count - 1
                else (self.file_size % BLOCK_SIZE)
            )
            to_write = os.urandom(size)
            if partial and (i % 3) == 0:
                with open(
                    os.path.join(self.dest + ".chunks", ".chunk_{}".format(i)), "wb"
                ) as f:
                    f.write(to_write)
            self.content += to_write
            hash.update(to_write)

        self.checksum = hash.hexdigest()
        self.num_files += 1

    def setUp(self):
        self.destdir = tempfile.mkdtemp()
        self.num_files = 0
        self.set_test_data()

    def tearDown(self):
        shutil.rmtree(self.destdir, ignore_errors=True)


class TestTransferDownloadByteRangeSupport(BaseTestTransfer):
    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content)), "accept-ranges": "bytes"}

    @property
    def byte_range_support(self):
        return (
            "accept-ranges" in self.HEADERS
            and "content-length" in self.HEADERS
            and "content-encoding" not in self.HEADERS
        )

    @property
    def attempt_byte_range(self):
        return (
            "content-length" in self.HEADERS and "content-encoding" not in self.HEADERS
        )

    def get_headers(self, data, start, end):
        headers = self.HEADERS.copy()
        if "content-length" in headers:
            headers["content-length"] = len(data)
        if "x-goog-stored-content-length" in headers:
            headers["x-goog-stored-content-length"] = len(data)
        if end is not None:
            headers["content-range"] = "bytes {}-{}/{}".format(
                # have to take 1 away as it has been coerced to fit an exclusive
                # range for a Python list slice.
                start,
                end - 1,
                self.file_size,
            )
        return headers

    def mock_get_request(self, url, headers=None, **kwargs):
        start, end = 0, None
        if headers and "Range" in headers and self.byte_range_support:
            range_header = headers["Range"]
            start, end = map(int, range_header.replace("bytes=", "").split("-"))
            if end:
                end += 1  # Make the end range inclusive
            else:
                end = None

        range_data = self.content[start:end]

        range_headers = self.get_headers(range_data, start, end)
        mock_response = MagicMock()

        # Because of the way that requests iterates over the content, we need to
        # keep track of whether the content has been exhausted, so that we can
        # yield nothing from the iter_content method, if the content has
        # already been read from the content property.

        self.iter_content_exhausted = False

        def iter_content(chunk_size=1):
            remaining = len(range_data)
            if not self.iter_content_exhausted:
                while remaining > 0:
                    start = len(range_data) - remaining
                    yield range_data[start : start + chunk_size]
                    remaining -= chunk_size

        mock_response.iter_content = iter_content
        mock_response.headers = range_headers

        @property
        def content(other):
            self.iter_content_exhausted = True
            return range_data

        type(mock_response).content = content
        return mock_response

    def mock_head_request(self, url, **kwargs):
        mock_response = MagicMock()
        mock_response.headers = self.get_headers(self.content, None, None)
        return mock_response

    def set_session_mock(self):
        self.mock_session = MagicMock()
        self.mock_session.get.side_effect = self.mock_get_request
        self.mock_session.head.side_effect = self.mock_head_request

    def setUp(self):
        super(TestTransferDownloadByteRangeSupport, self).setUp()
        self.source = "http://example.com/testfile"
        self.set_session_mock()

    def test_download_iterator(self):
        output = b""
        with FileDownload(
            self.source, self.dest, self.checksum, session=self.mock_session
        ) as fd:
            for chunk in fd:
                output += chunk
        self.assertEqual(output, self.content)
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count if self.byte_range_support else 1,
        )

    def test_download_checksum_validation(self):
        # Test FileDownload checksum validation
        with FileDownload(
            self.source, self.dest, self.checksum, session=self.mock_session
        ) as fd:
            for chunk in fd:
                pass
        self.assertTrue(os.path.isfile(self.dest))
        with open(self.dest, "rb") as f:
            data = f.read()
            self.assertEqual(data, self.content)
            hasher = hashlib.md5()
            hasher.update(data)
            self.assertEqual(hasher.hexdigest(), self.checksum)

    def test_file_download_retry_resume(self):
        mock_response_1 = MagicMock()
        mock_response_1.raise_for_status.side_effect = ConnectionError
        mock_response_2 = MagicMock()
        mock_response_2.iter_content.return_value = iter([self.content])
        mock_response_2.headers = self.HEADERS
        mock_response_2.content = self.content
        self.mock_session.get.side_effect = [
            mock_response_1,  # First call to requests.get
            mock_response_2,  # Second call to requests.get
        ]

        # Test retry and resume functionality in the FileDownload class
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            retry_wait=0,
        ) as fd:
            for chunk in fd:
                pass

        self.assertTrue(os.path.isfile(self.dest))
        self.assertEqual(self.mock_session.get.call_count, 2)

        if self.attempt_byte_range:
            calls = [
                call(
                    self.source,
                    headers={"Range": "bytes=0-{}".format(BLOCK_SIZE - 1)},
                    stream=True,
                    timeout=60,
                ),
                call(
                    self.source,
                    headers={"Range": "bytes=0-{}".format(BLOCK_SIZE - 1)},
                    stream=True,
                    timeout=60,
                ),
            ]
        else:
            calls = [
                call(self.source, stream=True, timeout=60),
                call(self.source, stream=True, timeout=60),
            ]

        self.mock_session.get.assert_has_calls(calls)

        with open(self.dest, "rb") as f:
            downloaded_content = f.read()
        self.assertEqual(downloaded_content, self.content)

    def test_file_download_request_exception(self):
        mock_session = MagicMock()
        mock_session.head.side_effect = RequestException

        # Test various exceptions during file downloads
        with self.assertRaises(RequestException):
            with FileDownload(
                self.source, self.dest, self.checksum, session=mock_session
            ) as fd:
                for chunk in fd:
                    pass
        self.assertFalse(os.path.isfile(self.dest))

    def test_file_download_checksum_exception(self):
        with self.assertRaises(TransferFailed):
            with FileDownload(
                self.source, self.dest, "invalid_checksum", session=self.mock_session
            ) as fd:
                for chunk in fd:
                    pass
        self.assertFalse(os.path.isfile(self.dest))

    def test_partial_download_iterator(self):
        self.set_test_data(partial=True)

        data_out = b""

        with FileDownload(
            self.source, self.dest, self.checksum, session=self.mock_session
        ) as fd:
            for chunk in fd:
                data_out += chunk

        self.assertEqual(self.content, data_out)

    def test_range_request_download_iterator(self):
        data_out = b""

        start_range = self.file_size // 3
        end_range = self.file_size // 3 * 2

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            start_range=start_range,
            end_range=end_range,
        ) as fd:
            for chunk in fd:
                data_out += chunk

        if self.byte_range_support:
            first_download_chunk = start_range // BLOCK_SIZE
            last_download_chunk = end_range // BLOCK_SIZE
            calls = [
                call(
                    self.source,
                    headers={
                        "Range": "bytes={}-{}".format(
                            i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE - 1
                        )
                    },
                    stream=True,
                    timeout=60,
                )
                for i in range(first_download_chunk, last_download_chunk)
            ]

        elif self.attempt_byte_range:
            calls = [
                call(
                    self.source,
                    headers={"Range": "bytes=262144-393215"},
                    stream=True,
                    timeout=60,
                ),
            ]
        else:
            calls = [
                call(self.source, stream=True, timeout=60),
            ]

        self.mock_session.get.assert_has_calls(calls)

        self.assertEqual(len(data_out), end_range - start_range + 1)
        self.assertEqual(self.content[start_range : end_range + 1], data_out)

        chunked_file = ChunkedFile(self.dest)
        chunked_file.seek(start_range)
        self.assertEqual(
            chunked_file.read(end_range - start_range + 1),
            self.content[start_range : end_range + 1],
        )

    def test_remote_file_iterator(self):
        output = b""
        with patch(
            "kolibri.utils.file_transfer.requests.Session",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(BLOCK_SIZE)
            while chunk:
                output += chunk
                chunk = rf.read(BLOCK_SIZE)
        self.assertEqual(output, self.content)
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count if self.byte_range_support else 1,
        )

    def test_partial_remote_file_iterator(self):
        self.set_test_data(partial=True)

        data_out = b""

        with patch(
            "kolibri.utils.file_transfer.requests.Session",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(BLOCK_SIZE)
            while chunk:
                data_out += chunk
                chunk = rf.read(BLOCK_SIZE)
        self.assertEqual(self.content, data_out)

    def test_range_request_remote_file_iterator(self):
        data_out = b""

        start_range = self.file_size // 3
        end_range = self.file_size // 3 * 2

        with patch(
            "kolibri.utils.file_transfer.requests.Session",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            rf.set_range(start_range, end_range)
            chunk = rf.read(BLOCK_SIZE)
            while chunk:
                data_out += chunk
                chunk = rf.read(BLOCK_SIZE)

        if self.byte_range_support:
            first_download_chunk = start_range // BLOCK_SIZE
            last_download_chunk = end_range // BLOCK_SIZE
            calls = [
                call(
                    self.source,
                    headers={
                        "Range": "bytes={}-{}".format(
                            i * BLOCK_SIZE, (i + 1) * BLOCK_SIZE - 1
                        )
                    },
                    stream=True,
                    timeout=60,
                )
                for i in range(first_download_chunk, last_download_chunk)
            ]
        elif self.attempt_byte_range:
            calls = [
                call(
                    self.source,
                    headers={"Range": "bytes=262144-393215"},
                    stream=True,
                    timeout=60,
                ),
            ]
        else:
            calls = [
                call(self.source, stream=True, timeout=60),
            ]

        self.mock_session.get.assert_has_calls(calls)

        self.assertEqual(len(data_out), end_range - start_range + 1)
        self.assertEqual(self.content[start_range : end_range + 1], data_out)

        chunked_file = ChunkedFile(self.dest)
        chunked_file.seek(start_range)
        self.assertEqual(
            chunked_file.read(end_range - start_range + 1),
            self.content[start_range : end_range + 1],
        )


class TestTransferDownloadByteRangeSupportGCS(TestTransferDownloadByteRangeSupport):
    @property
    def HEADERS(self):
        return {
            "content-length": str(len(self.content)),
            "accept-ranges": "bytes",
            "x-goog-stored-content-length": "4",
        }


class TestTransferDownloadByteRangeSupportCompressed(
    TestTransferDownloadByteRangeSupport
):
    @property
    def HEADERS(self):
        return {
            "content-length": str(len(self.content)),
            "accept-ranges": "bytes",
            "content-encoding": "gzip",
        }


class TestTransferDownloadByteRangeSupportCompressedGCS(
    TestTransferDownloadByteRangeSupport
):
    @property
    def HEADERS(self):
        return {
            "accept-ranges": "bytes",
            "content-encoding": "gzip",
            "x-goog-stored-content-length": "3",
        }


class TestTransferDownloadNoByteRangeSupportCompressed(
    TestTransferDownloadByteRangeSupport
):
    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content)), "content-encoding": "gzip"}


class TestTransferDownloadNoByteRangeSupport(TestTransferDownloadByteRangeSupport):
    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content))}


class TestTransferDownloadByteRangeSupportNotReported(
    TestTransferDownloadByteRangeSupport
):
    """
    Some versions of Kolibri do support byte range requests, but do not report an accept-ranges header.
    So we do a functional test of this behaviour by attempting the byte range request, and checking that
    it does work. This combined with the test case above should cover all cases.
    """

    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content))}

    @property
    def byte_range_support(self):
        return True


class TestTransferCopy(BaseTestTransfer):
    def setUp(self):
        super(TestTransferCopy, self).setUp()
        self.copy_source = tempfile.NamedTemporaryFile(delete=False).name
        # Test FileCopy iterator
        with open(self.copy_source, "wb") as testfile:
            testfile.write(self.content)

    def test_copy_iterator(self):
        output = b""
        with FileCopy(self.copy_source, self.dest, self.checksum) as fc:
            for chunk in fc:
                output += chunk
        self.assertEqual(output, self.content)

    def test_copy_checksum_validation(self):
        with FileCopy(self.copy_source, self.dest, self.checksum) as fc:
            for chunk in fc:
                pass
        self.assertTrue(os.path.isfile(self.dest))


class TestRetryImport(unittest.TestCase):
    def _retry_import_helper(self, exception_class, *args, **kwargs):
        e = exception_class(*args, **kwargs)
        self.assertTrue(
            retry_import(e), "Expected retry for {}".format(exception_class.__name__)
        )

    def test_retry_import_connection_error(self):
        self._retry_import_helper(ConnectionError)

    def test_retry_import_timeout(self):
        self._retry_import_helper(Timeout)

    def test_retry_import_chunked_encoding_error(self):
        self._retry_import_helper(ChunkedEncodingError)

    def test_retry_import_http_error(self):
        for status_code in RETRY_STATUS_CODE:
            self._retry_import_helper(
                HTTPError, response=MagicMock(status_code=status_code)
            )

    def test_retry_import_ssl_error(self):
        self._retry_import_helper(SSLERROR, "decryption failed or bad record mac")

    def test_retry_import_non_retry_exceptions(self):
        non_retry_exceptions = [
            (RequestException, {}),
            (HTTPError, {"response": MagicMock(status_code=400)}),
        ]
        for exception_class, kwargs in non_retry_exceptions:
            e = exception_class(**kwargs)
            self.assertFalse(
                retry_import(e),
                "Expected no retry for {}".format(exception_class.__name__),
            )
