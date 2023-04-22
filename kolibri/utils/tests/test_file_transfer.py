import hashlib
import math
import os
import shutil
import tempfile
import unittest

from mock import call
from mock import MagicMock
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from kolibri.utils.file_transfer import BLOCK_SIZE
from kolibri.utils.file_transfer import FileCopy
from kolibri.utils.file_transfer import FileDownload
from kolibri.utils.file_transfer import retry_import
from kolibri.utils.file_transfer import RETRY_STATUS_CODE
from kolibri.utils.file_transfer import SSLERROR
from kolibri.utils.file_transfer import TransferFailed


class BaseTestTransfer(unittest.TestCase):
    def set_test_data(self, partial=False):
        self.dest = self.destdir + "/test_file_{}".format(self.num_files)
        self.file_size = (1024 * 1024) + 731

        # Create dummy chunks
        chunks_count = int(math.ceil(float(self.file_size) / float(BLOCK_SIZE)))

        os.makedirs(self.dest + ".chunks", exist_ok=True)

        hash = hashlib.md5()

        self.content = b""
        for i in range(chunks_count):
            size = BLOCK_SIZE if i < chunks_count - 1 else (self.file_size % BLOCK_SIZE)
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

    def get_headers(self, data):
        headers = self.HEADERS.copy()
        if "content-length" in headers:
            headers["content-length"] = len(data)
        if "x-goog-stored-content-length" in headers:
            headers["x-goog-stored-content-length"] = len(data)
        return headers

    def mock_get_request(self, url, headers=None, **kwargs):
        start, end = 0, None
        if headers and "Range" in headers:
            range_header = headers["Range"]
            start, end = map(int, range_header.replace("bytes=", "").split("-"))
            if end:
                end += 1  # Make the end range inclusive
            else:
                end = None

        range_data = self.content[start:end]

        range_headers = self.get_headers(range_data)
        mock_response = MagicMock()
        mock_response.iter_content.return_value = iter([range_data])
        mock_response.headers = range_headers
        mock_response.content = range_data
        return mock_response

    def mock_head_request(self, url, **kwargs):
        mock_response = MagicMock()
        mock_response.headers = self.get_headers(self.content)
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

    def test_download_checksum_validation(self):
        # Test FileDownload checksum validation
        with FileDownload(
            self.source, self.dest, self.checksum, session=self.mock_session
        ) as fd:
            for chunk in fd:
                pass
        self.assertTrue(os.path.isfile(self.dest))

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

        if self.byte_range_support:
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
