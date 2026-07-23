import hashlib
import math
import os
import shutil
import tempfile
import threading
import unittest

from mock import call
from mock import MagicMock
from mock import patch
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import RequestException
from requests.exceptions import Timeout

from kolibri.utils.file_transfer import ChunkedFile
from kolibri.utils.file_transfer import FileCopy
from kolibri.utils.file_transfer import FileDownload
from kolibri.utils.file_transfer import RemoteFile
from kolibri.utils.file_transfer import retry_import
from kolibri.utils.file_transfer import RETRY_STATUS_CODE
from kolibri.utils.file_transfer import SSLERROR
from kolibri.utils.file_transfer import TransferFailed


class BaseTestTransfer(unittest.TestCase):
    def set_test_data(self, partial=False, incomplete=False, finished=False):
        self.dest = self.destdir + "/test_file_{}".format(self.num_files)

        chunked_file = ChunkedFile(self.dest)

        chunked_file.file_size = self.file_size = (1024 * 1024) + 731

        # Create dummy chunks
        self.chunks_count = int(
            math.ceil(float(self.file_size) / float(ChunkedFile.chunk_size))
        )

        os.makedirs(self.dest + ".chunks", exist_ok=True)

        hash = hashlib.md5()

        self.chunks_to_download = []

        self.content = b""
        for i in range(self.chunks_count):
            size = (
                ChunkedFile.chunk_size
                if i < self.chunks_count - 1
                else (self.file_size % ChunkedFile.chunk_size)
            )
            to_write = os.urandom(size)
            if (partial and (i % 3) == 0) or finished:
                # Write all but the last byte if incomplete, to ensure that we have our
                # file size checking exactly correct, and not off by one!
                if incomplete and (i % 6) == 0:
                    to_file_data = to_write[:-1]
                    self.chunks_to_download.append(i)
                else:
                    to_file_data = to_write
                with open(
                    os.path.join(self.dest + ".chunks", ".chunk_{}".format(i)), "wb"
                ) as f:
                    f.write(to_file_data)
            else:
                self.chunks_to_download.append(i)
            self.content += to_write
            hash.update(to_write)

        self.incomplete = incomplete
        self.partial = partial
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

    @property
    def full_ranges(self):
        return True

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
        mock_response.url = url

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
        mock_response.url = url
        return mock_response

    def set_session_mock(self):
        self.mock_session = MagicMock()
        self.mock_session.get.side_effect = self.mock_get_request
        self.mock_session.head.side_effect = self.mock_head_request

    def setUp(self):
        super().setUp()
        self.source = "http://example.com/testfile"
        self.set_session_mock()

    def _assert_request_calls(
        self, start_range=0, end_range=None, chunked_file_exists=True
    ):
        end_range = end_range or self.file_size - 1
        first_download_chunk = start_range // ChunkedFile.chunk_size
        last_download_chunk = end_range // ChunkedFile.chunk_size
        download_chunks = [
            (i, i + 1)
            for i in self.chunks_to_download
            if i >= first_download_chunk and i <= last_download_chunk
        ]
        # Default to the calls for byte range support
        if self.full_ranges:
            collapsed_chunks = []
            start = download_chunks[0][0]
            end = download_chunks[0][1]
            for i, j in download_chunks[1:]:
                if end != i:
                    collapsed_chunks.append((start, end))
                    start = i
                end = j
            if start is not None:
                collapsed_chunks.append((start, end))
            download_chunks = collapsed_chunks

        calls = []

        unchunked_download = (
            self.full_ranges
            and len(download_chunks) == 1
            and download_chunks[0] == (0, last_download_chunk + 1)
        )

        for i, j in download_chunks:
            if unchunked_download and not chunked_file_exists:
                download_call = call(
                    self.source,
                    stream=True,
                    timeout=60,
                )
            else:
                download_call = call(
                    self.source,
                    headers={
                        "Range": "bytes={}-{}".format(
                            i * ChunkedFile.chunk_size,
                            min(j * ChunkedFile.chunk_size, self.file_size) - 1,
                        )
                    },
                    stream=True,
                    timeout=60,
                )
            calls.append(download_call)

        if not self.byte_range_support:
            if self.attempt_byte_range:
                # If the server doesn't support byte range, but we attempted it,
                # we should have only made the first call, which would have returned
                # the whole file.
                calls = [calls[0]]
            else:
                calls = [
                    call(self.source, stream=True, timeout=60),
                ]

        self.mock_session.get.assert_has_calls(calls)

    def _assert_downloaded_content(self):
        with open(self.dest, "rb") as f:
            self.assertEqual(f.read(), self.content)

    def test_download_run(self):
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()
        self._assert_downloaded_content()
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count
            if self.byte_range_support and not self.full_ranges
            else 1,
        )
        self._assert_request_calls()

    def test_download_run_fully_downloaded_not_finalized(self):
        self.set_test_data(finished=True)
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()
        self._assert_downloaded_content()
        self.assertEqual(self.mock_session.head.call_count, 0)
        self.assertEqual(self.mock_session.get.call_count, 0)

    def test_download_run_no_existing_chunked_file(self):
        """Test downloading entire file when no chunked file exists"""
        # Create a fresh destination without any chunked file setup
        fresh_dest = self.destdir + "/fresh_file_{}".format(self.num_files + 100)

        with FileDownload(
            self.source,
            fresh_dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        # Verify file was downloaded correctly
        with open(fresh_dest, "rb") as f:
            downloaded_content = f.read()
        self.assertEqual(downloaded_content, self.content)

        # For entire file download with no existing chunked file,
        # and full ranges set should skip HEAD request and download directly
        self.assertEqual(
            self.mock_session.head.call_count, 0 if self.full_ranges else 1
        )
        self._assert_request_calls(chunked_file_exists=False)

    def test_download_checksum_validation(self):
        # Test FileDownload checksum validation
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()
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
        self.iter_content_exhausted = False

        def iter_content(chunk_size=1):
            remaining = len(self.content)
            if not self.iter_content_exhausted:
                while remaining > 0:
                    start = len(self.content) - remaining
                    yield self.content[start : start + chunk_size]
                    remaining -= chunk_size

        mock_response_2.iter_content = iter_content
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
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        self.assertTrue(os.path.isfile(self.dest))
        self.assertEqual(self.mock_session.get.call_count, 2)

        if self.attempt_byte_range:
            size = (self.file_size if self.full_ranges else ChunkedFile.chunk_size) - 1
            calls = [
                call(
                    self.source,
                    headers={"Range": "bytes=0-{}".format(size)},
                    stream=True,
                    timeout=60,
                ),
                call(
                    self.source,
                    headers={"Range": "bytes=0-{}".format(size)},
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

    def test_file_download_500_raise(self):
        mock_response = MagicMock()
        mock_response.status_code = 500
        exception_500 = HTTPError("Internal Server Error", response=mock_response)
        mock_response.raise_for_status.side_effect = exception_500

        self.mock_session.get.side_effect = [
            mock_response,  # First call to requests.get
        ]

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            retry_wait=0,
            full_ranges=self.full_ranges,
        ) as fd:
            with self.assertRaises(HTTPError):
                fd.run()

    def test_file_download_redirect(self):
        mock_response = MagicMock()
        mock_response.status_code = 302
        mock_response.url = "https://example.com/testfile"

        def mock_head_request_redirect(url, **kwargs):
            mock_response = self.mock_head_request(url, **kwargs)
            mock_response.status_code = 302
            mock_response.url = "https://example.com/testfile"
            return mock_response

        self.mock_session.head.side_effect = mock_head_request_redirect

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            retry_wait=0,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        self.source = "https://example.com/testfile"
        self._assert_downloaded_content()

    def test_file_download_request_exception(self):
        mock_session = MagicMock()
        mock_session.head.side_effect = RequestException

        # Test various exceptions during file downloads
        with self.assertRaises(RequestException):
            with FileDownload(
                self.source,
                self.dest,
                self.checksum,
                session=mock_session,
                full_ranges=self.full_ranges,
            ) as fd:
                fd.run()
        self.assertFalse(os.path.isfile(self.dest))

    def test_file_download_checksum_exception(self):
        with self.assertRaises(TransferFailed):
            with FileDownload(
                self.source,
                self.dest,
                "invalid_checksum",
                session=self.mock_session,
                full_ranges=self.full_ranges,
            ) as fd:
                fd.run()
        self.assertFalse(os.path.isfile(self.dest))

    def test_partial_download_run(self):
        self.set_test_data(partial=True)

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        self._assert_downloaded_content()
        self._assert_request_calls()

    def test_partial_download_run_incomplete_chunk(self):
        self.set_test_data(partial=True, incomplete=True)

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        self._assert_downloaded_content()
        self._assert_request_calls()

    def test_range_request_download_run(self):
        start_range = self.file_size // 3
        end_range = self.file_size // 3 * 2

        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            start_range=start_range,
            end_range=end_range,
            full_ranges=self.full_ranges,
        ) as fd:
            fd.run()

        self._assert_request_calls(start_range, end_range)

        chunked_file = ChunkedFile(self.dest)
        chunked_file.seek(start_range)
        self.assertEqual(
            chunked_file.read(end_range - start_range + 1),
            self.content[start_range : end_range + 1],
            "Content does not match chunked_file content",
        )

    def test_download_run_simultaneous(self):
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
        ) as fd2:
            # Once the file download has been opened,
            # its ChunkedFile object has already been initialized.
            # We then run another FileDownload with the same destination
            # to test that we can open the same file for simultaneous downloads.
            with FileDownload(
                self.source,
                self.dest,
                self.checksum,
                session=self.mock_session,
                full_ranges=self.full_ranges,
            ) as fd1:
                chunked_file_download = fd1.chunked_file_download
                fd1.run()
            fd2.run()
        self._assert_downloaded_content()
        if self.byte_range_support and not self.full_ranges and chunked_file_download:
            expected_calls = self.chunks_count
        elif (
            not self.byte_range_support
            and self.full_ranges
            and not chunked_file_download
        ):
            expected_calls = 2
        else:
            expected_calls = 1
        self.assertEqual(
            self.mock_session.get.call_count,
            expected_calls,
        )
        self._assert_request_calls()

    def test_download_run_cleaned_up_after_open_retry(self):
        with FileDownload(
            self.source,
            self.dest,
            self.checksum,
            session=self.mock_session,
            full_ranges=self.full_ranges,
            retry_wait=0,
        ) as fd:
            fd.dest_file_obj.delete()
            fd.dest_file_obj.close()
            fd.run()
        self._assert_downloaded_content()
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count
            if self.byte_range_support and not self.full_ranges
            else 1,
        )
        self._assert_request_calls(chunked_file_exists=False)


class TestTransferNoFullRangesDownloadByteRangeSupport(
    TestTransferDownloadByteRangeSupport
):
    @property
    def full_ranges(self):
        return False

    def test_remote_file_iterator(self):
        output = b""
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(ChunkedFile.chunk_size)
            while chunk:
                output += chunk
                chunk = rf.read(ChunkedFile.chunk_size)
        self.assertEqual(output, self.content, "Content does not match")
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count if self.byte_range_support else 1,
        )
        self._assert_request_calls()

    def test_remote_file_iterator_repeated(self):
        output = b""
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(ChunkedFile.chunk_size)
            while chunk:
                output += chunk
                chunk = rf.read(ChunkedFile.chunk_size)
        self.assertEqual(output, self.content, "Content does not match")
        self.assertEqual(
            self.mock_session.get.call_count,
            self.chunks_count if self.byte_range_support else 1,
        )
        self._assert_request_calls()

        output = b""
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(ChunkedFile.chunk_size)
            while chunk:
                output += chunk
                chunk = rf.read(ChunkedFile.chunk_size)

        self.mock_session.head.assert_called_once()

    def test_partial_remote_file_iterator(self):
        self.set_test_data(partial=True)

        data_out = b""

        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            chunk = rf.read(ChunkedFile.chunk_size)
            while chunk:
                data_out += chunk
                chunk = rf.read(ChunkedFile.chunk_size)
        self.assertEqual(self.content, data_out, "Content does not match")
        self._assert_request_calls()

    def test_range_request_remote_file_iterator(self):
        data_out = b""

        start_range = self.file_size // 3
        end_range = self.file_size // 3 * 2

        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            rf.seek(start_range)
            chunk = rf.read(ChunkedFile.chunk_size)
            while chunk:
                data_out += chunk
                read_length = min(
                    ChunkedFile.chunk_size,
                    end_range - (start_range + len(data_out)) + 1,
                )
                chunk = rf.read(read_length)

        self._assert_request_calls(start_range, end_range)

        self.assertEqual(len(data_out), end_range - start_range + 1)
        self.assertEqual(
            self.content[start_range : end_range + 1], data_out, "Content mismatch"
        )

        chunked_file = ChunkedFile(self.dest)
        chunked_file.seek(start_range)
        self.assertEqual(
            chunked_file.read(end_range - start_range + 1),
            self.content[start_range : end_range + 1],
            "Chunked file content mismatch",
        )

    def test_range_request_remote_file_read(self):
        start_range = self.file_size // 3
        end_range = self.file_size // 3 * 2

        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            rf.seek(start_range)
            data_out = rf.read(end_range - start_range + 1)

        self._assert_request_calls(start_range, end_range)

        self.assertEqual(len(data_out), end_range - start_range + 1)
        self.assertEqual(
            self.content[start_range : end_range + 1], data_out, "Content mismatch"
        )

        chunked_file = ChunkedFile(self.dest)
        chunked_file.seek(start_range)
        self.assertEqual(
            chunked_file.read(end_range - start_range + 1),
            self.content[start_range : end_range + 1],
            "Chunked file content mismatch",
        )

    def test_random_access_remote_file_read(self):
        ranges = [
            (self.file_size // 3, self.file_size // 3 * 2),
            (0, self.file_size // 2),
            (self.file_size // 5 * 2, self.file_size * 2),
        ]

        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            for start_range, end_range in ranges:
                rf = RemoteFile(self.dest, self.source)
                rf.seek(start_range)
                data_out = rf.read(end_range - start_range + 1)

                capped_end_rage = min(end_range, self.file_size - 1)

                self.assertEqual(len(data_out), capped_end_rage - start_range + 1)
                self.assertEqual(
                    self.content[start_range : capped_end_rage + 1],
                    data_out,
                    "Content mismatch: {}-{}".format(start_range, end_range),
                )

                chunked_file = ChunkedFile(self.dest)
                chunked_file.seek(start_range)
                self.assertEqual(
                    chunked_file.read(end_range - start_range + 1),
                    self.content[start_range : capped_end_rage + 1],
                    "Chunked file content mismatch: {}-{}".format(
                        start_range, end_range
                    ),
                )
                self.mock_session.get.reset_mock()

    def test_random_access_remote_file_iterator(self):
        ranges = [
            (self.file_size // 3, self.file_size // 3 * 2),
            (0, self.file_size // 2),
            (self.file_size // 5 * 2, self.file_size * 2),
        ]

        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            for start_range, end_range in ranges:
                data_out = b""
                rf = RemoteFile(self.dest, self.source)
                rf.seek(start_range)
                chunk = rf.read(ChunkedFile.chunk_size)
                while chunk:
                    data_out += chunk
                    read_length = min(
                        ChunkedFile.chunk_size,
                        end_range - (start_range + len(data_out)) + 1,
                    )
                    chunk = rf.read(read_length)

                capped_end_rage = min(end_range, self.file_size - 1)
                self.assertEqual(len(data_out), capped_end_rage - start_range + 1)
                self.assertEqual(
                    self.content[start_range : capped_end_rage + 1],
                    data_out,
                    "Content mismatch: {}-{}".format(start_range, end_range),
                )

                chunked_file = ChunkedFile(self.dest)
                chunked_file.seek(start_range)
                self.assertEqual(
                    chunked_file.read(end_range - start_range + 1),
                    self.content[start_range : capped_end_rage + 1],
                    "Chunked file content mismatch: {}-{}".format(
                        start_range, end_range
                    ),
                )

    def test_remote_file_seek_and_tell(self):
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            rf.seek(0, os.SEEK_END)
            self.assertEqual(rf.tell(), self.file_size)

    def test_remote_file_finalized_during_read(self):
        self.set_test_data(finished=True)
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            data = rf.read(size=self.file_size // 3)
            rf.finalize_file()
            rf.delete()
            data += rf.read()
        self.assertEqual(data, self.content)

    def test_remote_file_cleaned_up_during_read(self):
        self.set_test_data(finished=True)
        with patch(
            "kolibri.utils.file_transfer.SameHostSession",
            return_value=self.mock_session,
        ):
            rf = RemoteFile(self.dest, self.source)
            data = rf.read(size=self.file_size // 3)
            rf.delete()
            data += rf.read()
        self.assertEqual(data, self.content)


class TestTransferDownloadByteRangeSupportGCS(TestTransferDownloadByteRangeSupport):
    @property
    def HEADERS(self):
        return {
            "content-length": str(len(self.content)),
            "accept-ranges": "bytes",
            "x-goog-stored-content-length": "4",
        }


class TestTransferNoFullRangesDownloadByteRangeSupportGCS(
    TestTransferNoFullRangesDownloadByteRangeSupport
):
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


class TestTransferNoFullRangesDownloadByteRangeSupportCompressed(
    TestTransferNoFullRangesDownloadByteRangeSupport
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


class TestTransferNoFullRangesDownloadByteRangeSupportCompressedGCS(
    TestTransferNoFullRangesDownloadByteRangeSupport
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


class TestTransferNoFullRangesDownloadNoByteRangeSupportCompressed(
    TestTransferNoFullRangesDownloadByteRangeSupport
):
    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content)), "content-encoding": "gzip"}


class TestTransferDownloadNoByteRangeSupport(TestTransferDownloadByteRangeSupport):
    @property
    def HEADERS(self):
        return {"content-length": str(len(self.content))}


class TestTransferNoFullRangesDownloadNoByteRangeSupport(
    TestTransferNoFullRangesDownloadByteRangeSupport
):
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


class TestTransferNoFullRangesDownloadByteRangeSupportNotReported(
    TestTransferNoFullRangesDownloadByteRangeSupport
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
        super().setUp()
        self.copy_source = tempfile.NamedTemporaryFile(delete=False).name
        # Test FileCopy iterator
        with open(self.copy_source, "wb") as testfile:
            testfile.write(self.content)

    def test_copy_run(self):
        with FileCopy(self.copy_source, self.dest, self.checksum) as fc:
            fc.run()
        with open(self.dest, "rb") as f:
            output = f.read()
        self.assertEqual(output, self.content)

    def test_copy_checksum_validation(self):
        with FileCopy(self.copy_source, self.dest, self.checksum) as fc:
            fc.run()
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


class _ThreadSafeRangeSession(object):
    """
    A minimal, thread-safe stand-in for a requests Session serving a fixed
    byte string with HTTP range support. Unlike the MagicMock-based harness
    above it keeps no shared per-response mutable state, so it can be used by
    several threads at once (e.g. simulating multiple users streaming the same
    remote file concurrently). Each response is built fresh per call.
    """

    def __init__(self, content):
        self.content = content

    def head(self, url, timeout=None, allow_redirects=False):
        response = MagicMock()
        response.url = url
        response.status_code = 200
        response.headers = {
            "content-length": str(len(self.content)),
            "accept-ranges": "bytes",
        }
        return response

    def get(self, url, headers=None, stream=False, timeout=None):
        start, end = 0, None
        ranged = bool(headers and "Range" in headers)
        if ranged:
            start_s, end_s = headers["Range"].replace("bytes=", "").split("-")
            start = int(start_s)
            end = int(end_s) + 1 if end_s else None
        data = self.content[start:end]
        response_headers = {
            "content-length": str(len(data)),
            "accept-ranges": "bytes",
        }
        if end is not None:
            response_headers["content-range"] = "bytes {}-{}/{}".format(
                start, end - 1, len(self.content)
            )
        response = MagicMock()
        response.url = url
        response.status_code = 206 if ranged else 200
        response.headers = response_headers
        response.content = data

        def iter_content(chunk_size=1):
            for i in range(0, len(data), chunk_size):
                yield data[i : i + chunk_size]

        response.iter_content = iter_content
        return response


class TestRemoteFileDiskCacheReuse(unittest.TestCase):
    """
    Regression tests for the per-file chunk diskcache being reopened on every
    read block while streaming a proxied remote file (see the SD-card slowness
    issue). Serving a remote file must reuse a single diskcache handle for the
    request rather than constructing a fresh ``diskcache.Cache`` per chunk.
    """

    source = "http://testserver/remote_video.mp4"

    def setUp(self):
        self.destdir = tempfile.mkdtemp()
        self.dest = os.path.join(self.destdir, "remote_video.mp4")

    def tearDown(self):
        shutil.rmtree(self.destdir, ignore_errors=True)

    def _make_content(self, num_chunks):
        # A file spanning ``num_chunks`` chunks, with a partial final chunk so
        # the file-size / last-chunk handling is exercised exactly.
        return os.urandom((num_chunks - 1) * ChunkedFile.chunk_size + 731)

    def _read_all(self, remote_file):
        output = b""
        chunk = remote_file.read(ChunkedFile.chunk_size)
        while chunk:
            output += chunk
            chunk = remote_file.read(ChunkedFile.chunk_size)
        return output

    def test_diskcache_not_reopened_per_chunk_when_streaming(self):
        num_chunks = 40
        content = self._make_content(num_chunks)
        session = _ThreadSafeRangeSession(content)

        import kolibri.utils.file_transfer as file_transfer

        real_cache = file_transfer.Cache
        constructions = []

        def counting_cache(*args, **kwargs):
            constructions.append(args[0] if args else None)
            return real_cache(*args, **kwargs)

        with patch(
            "kolibri.utils.file_transfer.SameHostSession", return_value=session
        ), patch("kolibri.utils.file_transfer.Cache", side_effect=counting_cache):
            remote_file = RemoteFile(self.dest, self.source)
            output = self._read_all(remote_file)
            remote_file.close()

        self.assertEqual(output, content, "Streamed content does not match")
        # Before the fix the diskcache is reconstructed several times per chunk,
        # so this count scales with num_chunks (~3-4x). The per-file cache must
        # instead be reused for the request, giving a small bound that does not
        # grow with file size.
        self.assertLessEqual(
            len(constructions),
            5,
            "diskcache Cache was constructed {} times while streaming a "
            "{}-chunk file; it must be reused across reads, not reopened per "
            "chunk".format(len(constructions), num_chunks),
        )

    def test_concurrent_reads_of_same_remote_file(self):
        # Simulates multiple users streaming the same remote video at once:
        # several threads read the SAME dest/source concurrently, contending on
        # the shared per-file chunk diskcache and chunk locks. This must remain
        # correct (and must stay correct after the cache-reuse fix).
        num_chunks = 20
        content = self._make_content(num_chunks)
        session = _ThreadSafeRangeSession(content)

        results = {}
        errors = {}

        def reader(tid):
            try:
                remote_file = RemoteFile(self.dest, self.source)
                results[tid] = self._read_all(remote_file)
                remote_file.close()
            except Exception as e:  # noqa: B902
                errors[tid] = e

        with patch("kolibri.utils.file_transfer.SameHostSession", return_value=session):
            threads = [threading.Thread(target=reader, args=(i,)) for i in range(6)]
            for thread in threads:
                thread.start()
            for thread in threads:
                thread.join()

        self.assertEqual(errors, {}, "Concurrent reads raised: {}".format(errors))
        self.assertEqual(len(results), 6)
        for tid, output in results.items():
            self.assertEqual(
                output, content, "Thread {} read incorrect content".format(tid)
            )

        # The on-disk chunks must be complete and correct after concurrent
        # downloads of the same file.
        chunked_file = ChunkedFile(self.dest)
        self.assertTrue(chunked_file.is_complete())
        chunked_file.seek(0)
        self.assertEqual(chunked_file.read(), content)

    def test_single_read_content_correct(self):
        # Baseline correctness guard for the streaming read path used above.
        num_chunks = 5
        content = self._make_content(num_chunks)
        session = _ThreadSafeRangeSession(content)
        with patch("kolibri.utils.file_transfer.SameHostSession", return_value=session):
            remote_file = RemoteFile(self.dest, self.source)
            output = self._read_all(remote_file)
            remote_file.close()
        self.assertEqual(output, content)

    @unittest.skipIf(
        os.name == "nt",
        "This end-to-end flavor deletes a directory whose diskcache is held "
        "open, which Windows forbids - so the stale-handle race cannot occur "
        "there (delete() releases the handle first, and external eviction is "
        "skipped when the file is blocked). The self-heal mechanism itself and "
        "that safety invariant are covered cross-platform by "
        "test_open_cache_reopens_when_incarnation_changes and "
        "test_delete_releases_cache_handle.",
    )
    def test_cache_handle_self_heals_after_directory_recreated(self):
        # A stale diskcache handle (pointing at a deleted, recreated chunk dir)
        # must be detected and reopened, or chunk-lock coordination silently
        # breaks (locks live as rows in the on-disk SQLite DB). This is the
        # streamed-cache-eviction-mid-stream race.
        from diskcache import Cache

        dest = os.path.join(self.destdir, "self_heal.bin")
        chunked_file = ChunkedFile(dest)
        chunked_file.file_size = 5 * ChunkedFile.chunk_size
        stale_handle = chunked_file.get_cache()

        # Another process evicts and recreates this file's chunk dir.
        shutil.rmtree(chunked_file.chunk_dir)
        os.makedirs(chunked_file.chunk_dir)
        fresh = Cache(chunked_file.cache_dir)
        fresh.set("probe", 42)

        healed_handle = chunked_file.get_cache()
        self.assertIsNot(healed_handle, stale_handle, "stale handle was not dropped")
        self.assertEqual(
            healed_handle.get("probe"),
            42,
            "reopened handle does not see the live diskcache",
        )
        fresh.close()
        chunked_file.close()

    def test_chunk_dir_incarnation_falls_back_to_marker_without_inode(self):
        # On filesystems that do not report a usable inode (st_ino == 0, e.g.
        # FAT/exFAT, some Android storage), a marker file provides the same
        # deletion/recreation signal.
        dest = os.path.join(self.destdir, "marker.bin")
        chunked_file = ChunkedFile(dest)
        marker_path = os.path.join(chunked_file.chunk_dir, ".incarnation")

        with patch(
            "kolibri.utils.file_transfer.os.stat",
            return_value=MagicMock(st_ino=0),
        ):
            token1 = chunked_file._chunk_dir_incarnation()
            token2 = chunked_file._chunk_dir_incarnation()
        # Same directory incarnation -> stable token from the marker file.
        self.assertEqual(token1, token2)
        self.assertTrue(os.path.exists(marker_path))

        # Recreated directory -> marker gone -> different token.
        shutil.rmtree(chunked_file.chunk_dir)
        os.makedirs(chunked_file.chunk_dir)
        with patch(
            "kolibri.utils.file_transfer.os.stat",
            return_value=MagicMock(st_ino=0),
        ):
            token3 = chunked_file._chunk_dir_incarnation()
        self.assertNotEqual(token1, token3)

    @unittest.skipIf(
        os.name == "nt",
        "This end-to-end flavor deletes a directory whose diskcache is held "
        "open, which Windows forbids - so the stale-handle race cannot occur "
        "there (delete() releases the handle first, and external eviction is "
        "skipped when the file is blocked). The self-heal mechanism itself and "
        "that safety invariant are covered cross-platform by "
        "test_open_cache_reopens_when_incarnation_changes and "
        "test_delete_releases_cache_handle.",
    )
    def test_stale_injected_cache_handle_is_dropped_not_closed(self):
        # A borrowed (injected) handle that has gone stale must be dropped
        # WITHOUT being closed - its owner may still use it - and the borrower
        # must then take ownership of the fresh handle it opens. This is the
        # FileDownload-re-injects-RemoteFile's-handle path at the heart of the
        # eviction race.
        dest = os.path.join(self.destdir, "injected.bin")
        owner = ChunkedFile(dest)
        owner.file_size = 3 * ChunkedFile.chunk_size
        shared = owner.get_cache()

        borrower = ChunkedFile(dest, cache=shared)
        self.assertFalse(borrower._owns_cache)

        # The directory is evicted and recreated underneath both objects.
        shutil.rmtree(owner.chunk_dir)
        os.makedirs(owner.chunk_dir)

        healed = borrower.get_cache()
        self.assertIsNot(healed, shared, "stale borrowed handle was not dropped")
        self.assertTrue(
            borrower._owns_cache, "borrower did not take ownership of new handle"
        )
        # The borrowed handle must not have been closed by the borrower; a
        # closed diskcache raises on access.
        try:
            shared.get("probe")
        except Exception as e:  # noqa: B902
            self.fail("borrowed handle was closed by the borrower: {!r}".format(e))
        owner.close()
        borrower.close()

    def test_open_cache_reopens_when_incarnation_changes(self):
        # The self-heal mechanism, tested independently of a real deletion so it
        # also runs on Windows: when the chunk-dir incarnation token changes
        # (a deleted+recreated directory), _open_cache must drop the memoized
        # handle and reopen, re-stamping the new incarnation.
        dest = os.path.join(self.destdir, "reopen.bin")
        chunked_file = ChunkedFile(dest)
        chunked_file.file_size = 2 * ChunkedFile.chunk_size
        first = chunked_file.get_cache()

        with patch.object(
            chunked_file, "_chunk_dir_incarnation", return_value="changed-token"
        ):
            second = chunked_file.get_cache()

        self.assertIsNot(second, first, "handle was not reopened on incarnation change")
        self.assertEqual(second._kolibri_chunk_incarnation, "changed-token")
        chunked_file.close()

    def test_delete_releases_cache_handle(self):
        # Deleting a chunked file must release the diskcache handle before
        # removing the directory - on Windows an open SQLite file would block
        # removal (WinError 32). This invariant is what keeps the memoized
        # handle safe there, so it is asserted on every platform.
        dest = os.path.join(self.destdir, "del.bin")
        chunked_file = ChunkedFile(dest)
        chunked_file.file_size = ChunkedFile.chunk_size
        chunked_file.get_cache()
        self.assertIsNotNone(chunked_file._cache)

        chunked_file.delete()

        self.assertIsNone(
            chunked_file._cache, "delete() did not release the cache handle"
        )
        self.assertFalse(os.path.exists(chunked_file.chunk_dir))
