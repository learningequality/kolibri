import hashlib
import logging
import math
import os
import shutil
from abc import ABCMeta
from abc import abstractmethod
from contextlib import contextmanager
from io import BufferedIOBase
from time import sleep

import requests
from diskcache import Cache
from diskcache import Lock
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout
from six import with_metaclass

from kolibri.utils.filesystem import mkdirp


try:
    import OpenSSL

    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    SSLERROR = requests.exceptions.SSLError


try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError


RETRY_STATUS_CODE = {502, 503, 504, 521, 522, 523, 524}


logger = logging.getLogger(__name__)


class ExistingTransferInProgress(Exception):
    pass


class TransferNotYetCompleted(Exception):
    pass


class TransferCanceled(Exception):
    pass


class TransferNotYetClosed(Exception):
    pass


class TransferFailed(Exception):
    pass


def retry_import(e):
    """
    When an exception occurs during channel/content import, if
        * there is an Internet connection error or timeout error,
          or HTTPError where the error code is one of the RETRY_STATUS_CODE,
          return return True to retry the file transfer
    return value:
        * True - needs retry.
        * False - Does not need retry.
    """

    if (
        isinstance(e, ConnectionError)
        or isinstance(e, Timeout)
        or isinstance(e, ChunkedEncodingError)
        or (isinstance(e, HTTPError) and e.response.status_code in RETRY_STATUS_CODE)
        or (isinstance(e, SSLERROR) and "decryption failed or bad record mac" in str(e))
    ):
        return True

    return False


# Set block size to 128KB
# the previous value of 2MB was set to avoid frequent progress
# updates during file transfer, but since file transfers
# have been parallelized, and individual file downloads are not tracked
# except as part of overall download progress, this is no longer necessary.
# 128KB allows for small chunks of files to be transferred
# with the potential for interruption, while still allowing
# for a reasonable amount of data to be transferred in one go.
# This will also reduce memory usage when transferring large files.
BLOCK_SIZE = 128 * 1024


class ChunkedFile(BufferedIOBase):
    def __init__(self, filepath):
        self.filepath = filepath
        self.chunk_dir = filepath + ".chunks"
        mkdirp(self.chunk_dir, exist_ok=True)
        self.chunk_size = BLOCK_SIZE
        self.position = 0
        self._file_size = None

    @property
    def chunks_count(self):
        return int(math.ceil(float(self.file_size) / float(self.chunk_size)))

    @property
    def file_size(self):
        if self._file_size is not None:
            return self._file_size
        try:
            with open(os.path.join(self.chunk_dir, ".file_size"), "r") as f:
                self._file_size = int(f.read())
        except (OSError, IOError, ValueError):
            raise ValueError("file_size is not set")
        return self._file_size

    @file_size.setter
    def file_size(self, value):
        with open(os.path.join(self.chunk_dir, ".file_size"), "w") as f:
            f.write(str(value))
            self._file_size = value

    def _get_chunk_file_name(self, index):
        return os.path.join(self.chunk_dir, ".chunk_{index}".format(index=index))

    def seek(self, offset, whence=os.SEEK_SET):
        if whence == os.SEEK_SET:
            self.position = offset
        elif whence == os.SEEK_CUR:
            self.position += offset
        elif whence == os.SEEK_END:
            self.position = self.file_size + offset
        else:
            raise ValueError("Invalid whence value")

        self.position = min(self.file_size, max(0, self.position))

    def _read(self, position, size=-1):
        """
        Takes a position argument which will be modified and returned by the read operation.
        """
        if size < 0:
            size = self.file_size - position

        if size > self.file_size - position:
            size = self.file_size - position

        remaining = size
        data = b""

        while remaining > 0:
            chunk_index = position // self.chunk_size
            chunk_file = self._get_chunk_file_name(chunk_index)
            if not os.path.exists(chunk_file):
                raise ValueError("Attempting to read data that has not been stored yet")
            with open(chunk_file, "rb") as f:
                f.seek(position % self.chunk_size)
                chunk_data = f.read(min(remaining, self.chunk_size))
                data += chunk_data

                position += len(chunk_data)
                remaining -= len(chunk_data)

        return position, data

    def read(self, size=-1):
        self.position, output = self._read(self.position, size)
        return output

    def write(self, data):
        remaining = len(data)

        if self.position + remaining > self.file_size:
            raise EOFError("Cannot write past end of file")

        while remaining > 0:
            chunk_index = self.position // self.chunk_size
            chunk_file = self._get_chunk_file_name(chunk_index)
            current_chunk_file_size = (
                os.path.getsize(chunk_file) if os.path.exists(chunk_file) else 0
            )

            with open(chunk_file, "ab") as f:
                chunk_position = self.position % self.chunk_size
                amount_to_write = min(remaining, self.chunk_size - chunk_position)
                if chunk_position < current_chunk_file_size:
                    diff = current_chunk_file_size - chunk_position
                    chunk_position += diff
                    self.position += diff
                    amount_to_write -= diff
                    remaining -= diff
                f.seek(chunk_position)
                to_write = data[
                    len(data) - remaining : len(data) - remaining + amount_to_write
                ]
                # For some reason in Python 2.7 this is failing to return the number of bytes written.
                # as we know exactly how much we are writing, we can just use that value.
                f.write(to_write)
                bytes_written = len(to_write)
                self.position += bytes_written
                remaining -= bytes_written

    def read_data_until(self, end):
        """
        Generator to read data from the current position of the file until
        but not including the end value.
        Need to update this to give it an independent read position, as when this is called
        the data is then written to the chunked file object (but ignored) so the position gets moved
        twice leading to an overflow.
        """
        position = self.position
        while position < end:
            position, output = self._read(position, min(end - position, BLOCK_SIZE))
            yield output

    def _chunk_range_for_byte_range(self, start, end):
        start_chunk = start // self.chunk_size if start is not None else 0
        end_chunk = end // self.chunk_size if end is not None else self.chunks_count - 1
        return start_chunk, end_chunk

    def next_missing_chunk_and_read(self, start=None, end=None):
        """
        Generator to yield start and end ranges of the next missing chunk,
        and return a generator to read the intervening data.
        Exhausting the generator has no effect on the file position, as it is anticipated
        that the data will be written back to the file in normal operation.
        The data written back to the file will be ignored, but then the file position will be
        updated as a result of the write.
        """
        start_chunk, end_chunk = self._chunk_range_for_byte_range(start, end)

        self.seek(start_chunk * self.chunk_size)

        with Cache(self.chunk_dir) as cache:

            for chunk_index in range(start_chunk, end_chunk + 1):
                chunk_file = self._get_chunk_file_name(chunk_index)
                with Lock(cache, chunk_file):
                    if not os.path.exists(chunk_file):
                        range_start = chunk_index * self.chunk_size
                        range_end = min(
                            range_start + self.chunk_size - 1, self.file_size - 1
                        )

                        yield (
                            range_start,
                            range_end,
                            self.read_data_until(range_start),
                        )

    def finalize_file(self):
        if not self.is_complete():
            raise ValueError("Cannot combine chunks: Not all chunks are complete")

        with open(self.filepath, "wb") as output_file:
            for chunk_index in range(self.chunks_count):
                chunk_file = self._get_chunk_file_name(chunk_index)
                with open(chunk_file, "rb") as input_file:
                    shutil.copyfileobj(input_file, output_file)

    def is_complete(self, start=None, end=None):
        try:
            # Check that the number of chunks is set
            # this depends on the file size being set
            # which will raise a ValueError.
            self.chunks_count
        except ValueError:
            return False
        start_chunk, end_chunk = self._chunk_range_for_byte_range(start, end)
        for chunk_index in range(start_chunk, end_chunk + 1):
            chunk_file = self._get_chunk_file_name(chunk_index)
            if not os.path.exists(chunk_file):
                return False

            # Check for correct chunk size
            expected_chunk_size = (
                self.chunk_size
                if chunk_index < self.chunks_count - 1
                else (self.file_size - (self.chunk_size * chunk_index))
            )
            if os.path.getsize(chunk_file) != expected_chunk_size:
                return False

        return True

    def md5_checksum(self):
        if not self.is_complete():
            raise ValueError("Cannot calculate MD5: Not all chunks are complete")
        md5 = hashlib.md5()
        position = 0
        position, chunk = self._read(position, self.chunk_size)
        while chunk:
            md5.update(chunk)
            position, chunk = self._read(position, self.chunk_size)
        return md5.hexdigest()

    def delete(self):
        shutil.rmtree(self.chunk_dir)

    def close(self):
        pass

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_value, traceback):
        self.close()


class Transfer(with_metaclass(ABCMeta)):
    DEFAULT_TIMEOUT = 60

    def __init__(
        self,
        source,
        dest,
        checksum=None,
        timeout=DEFAULT_TIMEOUT,
        cancel_check=None,
        retry_wait=30,
        # A flag to allow the download to remain in the chunked file directory
        # for easier clean up when it is just a temporary download.
        finalize_download=True,
        start_range=None,
        end_range=None,
    ):
        self.source = source
        self.dest = dest
        self.checksum = checksum
        self.block_size = BLOCK_SIZE
        self.timeout = timeout
        self.retry_wait = retry_wait
        self._headers_set = False
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False
        self._finalize_download = finalize_download
        self.transfer_size = None
        self.position = 0
        if cancel_check and not callable(cancel_check):
            raise AssertionError("cancel_check must be callable")
        self._cancel_check = cancel_check

        self.set_range(start_range, end_range)

        if os.path.isdir(dest):
            raise AssertionError(
                "dest must include the target filename, not just directory path"
            )

        # ensure the directories in the destination path exist
        mkdirp(os.path.dirname(self.dest), exist_ok=True)

        self.chunked_file_obj = ChunkedFile(self.dest)

    @abstractmethod
    def start(self):
        pass

    @property
    def total_size(self):
        try:
            return self.chunked_file_obj.file_size
        except ValueError:
            return None

    @total_size.setter
    def total_size(self, value):
        self.chunked_file_obj.file_size = value
        if self.transfer_size is None:
            self.transfer_size = value

    def cancel_check(self):
        return self._cancel_check and self._cancel_check()

    def _set_iterator(self, force=False):
        if force or not hasattr(self, "_content_iterator"):
            self._content_iterator = self._get_content_iterator()

    def __next__(self):  # proxy this method to fully support Python 3
        return self.next()

    def __iter__(self):
        self._set_iterator()
        return self

    def set_range(self, range_start, range_end):
        if range_start is not None and not isinstance(range_start, int):
            raise TypeError("range_start must be an integer")

        self.range_start = range_start

        if range_end is not None and not isinstance(range_end, int):
            raise TypeError("range_end must be an integer")

        self.range_end = range_end

    @abstractmethod
    def _get_content_iterator(self):
        pass

    def _next(self):
        """
        Retrieves the next chunk of data during the transfer and writes it to the output file.
        Returns the data only if it is within the range specified by range_start and range_end.
        """

        # Initialize an empty byte string as output
        output = b""

        # Keep looping until a non-empty output is obtained
        while not output:
            try:
                # Get the next chunk from the content iterator
                chunk = next(self._content_iterator)
            except StopIteration:
                # If there are no more chunks, mark the transfer as completed
                self.completed = True
                # Close the transfer
                self.close()
                # Finalize the transfer (verify checksum and move the temporary file)
                self.finalize()
                # Raise the StopIteration exception to stop the iteration
                raise

            # Write the current chunk to the chunked file object
            self.chunked_file_obj.write(chunk)

            # Initialize chunk_start to 0
            chunk_start = 0

            # Check if there is a range_start and if the position is less than range_start
            if self.range_start and self.position < self.range_start:
                # Update chunk_start to the difference between range_start and the current position
                chunk_start = self.range_start - self.position

            # Set chunk_end to the length of the current chunk
            chunk_end = len(chunk)

            # Check if there is a range_end and if the current position plus chunk_end is greater than range_end
            if self.range_end and self.position + chunk_end > self.range_end:
                # Update chunk_end to the maximum of range_end + 1 minus the current position, or 0
                chunk_end = max(self.range_end + 1 - self.position, 0)

            # Update output with the slice of the chunk between chunk_start and chunk_end
            output = chunk[chunk_start:chunk_end]

            # Update the position by the length of the chunk
            self.position += len(chunk)

        # Return the output (a non-empty byte string)
        return output

    def next(self):
        self._set_iterator()
        if self.cancel_check():
            self._kill_gracefully()
        return self._next()

    def _move_tmp_to_dest(self):
        try:
            self.chunked_file_obj.finalize_file()
            self.chunked_file_obj.delete()
        except FileNotFoundError as e:
            if not os.path.exists(self.dest):
                raise e

    def __enter__(self):
        self.start()
        return self

    def __exit__(self, *exc_details):
        if not self.closed:
            self.close()
        if not self.completed:
            self.cancel()

    def _kill_gracefully(self, *args, **kwargs):
        self.cancel()
        raise TransferCanceled("The transfer was canceled.")

    def cancel(self):
        logger.info("Canceling import: {}".format(self.source))
        self.close()
        try:
            self.chunked_file_obj.delete()
        except OSError:
            pass
        self.canceled = True

    def _checksum_correct(self):
        return self.chunked_file_obj.md5_checksum() == self.checksum

    def _verify_checksum(self):
        # If checksum of the destination file is different from the localfile
        # id indicated in the database, it means that the destination file
        # is corrupted, either from origin or during import. Skip importing
        # this file.
        if self.checksum and not self._checksum_correct():
            e = "File {} is corrupted.".format(self.source)
            logger.error("An error occurred during content import: {}".format(e))
            try:
                self.chunked_file_obj.delete()
            except OSError:
                pass
            raise TransferFailed(
                "Transferred file checksums did not match for {}".format(self.source)
            )

    @property
    def finalize_download(self):
        return (
            self._finalize_download
            and (self.range_start is None or self.range_start == 0)
            and (self.range_end is None or self.range_end == self.file_size - 1)
        )

    def finalize(self):
        if not self.finalize_download:
            return
        if not self.completed:
            raise TransferNotYetCompleted(
                "Transfer must have completed before it can be finalized."
            )
        if not self.closed:
            raise TransferNotYetClosed(
                "Transfer must be closed before it can be finalized."
            )
        if self.finalized:
            return

        self._verify_checksum()
        self._move_tmp_to_dest()
        self.finalized = True

    def close(self):
        self.chunked_file_obj.close()
        self.closed = True


class FileDownload(Transfer):
    def __init__(self, *args, **kwargs):

        # allow an existing requests.Session instance to be passed in, so it can be reused for speed
        if "session" in kwargs:
            self.session = kwargs.pop("session")
        else:
            # initialize a fresh requests session, if one wasn't provided
            self.session = requests.Session()

        self.compressed = False

        self.content_length_header = False

        super(FileDownload, self).__init__(*args, **kwargs)

    @contextmanager
    def _catch_exception_and_retry(self):
        try:
            yield
        except Exception as e:
            retry = retry_import(e)
            if not retry:
                raise
            # Catch exceptions to check if we should resume file downloading
            logger.error("Error reading download stream: {}".format(e))
            self.resume()

    def _set_headers(self):
        if self._headers_set:
            return

        response = self.session.head(self.source, timeout=self.timeout)
        response.raise_for_status()

        self.compressed = bool(response.headers.get("content-encoding", ""))

        self.content_length_header = "content-length" in response.headers

        try:
            self.total_size = int(response.headers["content-length"])
        except KeyError:
            # When a compressed file is saved on Google Cloud Storage,
            # content-length is not available in the header,
            # but we can use X-Goog-Stored-Content-Length.
            gcs_content_length = response.headers.get("X-Goog-Stored-Content-Length")
            if gcs_content_length:
                self.transfer_size = int(gcs_content_length)
        self._headers_set = True

    def start(self):
        # initiate the download, check for status errors, and calculate download size
        with self._catch_exception_and_retry():
            self._set_headers()
            self.started = True
            self._set_iterator(force=True)

    def next_missing_chunk_range_generator(self):
        if self.range_start:
            self.position = self.range_start // self.block_size * self.block_size
        for (
            start_byte,
            end_byte,
            chunk_generator,
        ) in self.chunked_file_obj.next_missing_chunk_and_read(
            start=self.range_start, end=self.range_end
        ):
            response = self.session.get(
                self.source,
                headers={"Range": "bytes={}-{}".format(start_byte, end_byte)},
                stream=True,
                timeout=self.timeout,
            )
            response.raise_for_status()

            range_response_supported = response.headers.get(
                "content-range", ""
            ) == "bytes {}-{}/{}".format(start_byte, end_byte, self.total_size)

            if range_response_supported:
                for chunk in chunk_generator:
                    yield chunk

            bytes_to_consume = self.position

            for chunk in response.iter_content(self.block_size):
                if not range_response_supported:
                    if bytes_to_consume:
                        old_length = len(chunk)
                        chunk = chunk[bytes_to_consume:]
                        bytes_to_consume -= old_length - len(chunk)
                    if not chunk:
                        continue
                yield chunk

            if not range_response_supported:
                break

    def _get_content_iterator(self):
        if not self.started:
            raise AssertionError(
                "File download must be started before it can be iterated."
            )
        # Some Kolibri versions do support range requests, but fail to properly report this fact
        # from their Accept-Ranges header. So we need to check if the server supports range requests
        # by trying to make a range request, and if it fails, we need to fall back to the old
        # behavior of downloading the whole file.
        if self.content_length_header and not self.compressed:
            return self.next_missing_chunk_range_generator()
        self.response = self.session.get(self.source, stream=True, timeout=self.timeout)
        self.response.raise_for_status()
        if (not self.content_length_header or self.compressed) and not self.total_size:
            # Doing this exhausts the iterator, so if we need to do this, we need
            # to return the dummy iterator below, as the iterator will be empty,
            # and all content is now stored in memory. So we should avoid doing this as much
            # as we can, hence the total size check above.
            self.total_size = len(self.response.content)
            # We then need to return a dummy iterator over the content
            # this just iterates over the content in block size chunks
            # as a generator comprehension.
            return (
                self.response.content[i * self.block_size : (i + 1) * self.block_size]
                for i in range(self.total_size // self.block_size + 1)
            )
        return self.response.iter_content(self.block_size)

    def next(self):
        output = None
        while not output:
            with self._catch_exception_and_retry():
                output = super(FileDownload, self).next()
        return output

    def close(self):
        if hasattr(self, "response"):
            self.response.close()
        super(FileDownload, self).close()

    def resume(self):
        logger.info(
            "Waiting {}s before retrying import: {}".format(
                self.retry_wait, self.source
            )
        )
        for i in range(self.retry_wait):
            if self.cancel_check():
                self._kill_gracefully()
            sleep(1)

        self.start()


class FileCopy(Transfer):
    def start(self):
        if self.started:
            raise AssertionError(
                "File copy has already been started, and cannot be started again"
            )
        self.total_size = os.path.getsize(self.source)
        self.source_file_obj = open(self.source, "rb")
        self.started = True

    def _get_content_iterator(self):
        while True:
            if self.cancel_check():
                self._kill_gracefully()
            block = self.source_file_obj.read(self.block_size)
            if not block:
                break
            yield block

    def close(self):
        self.source_file_obj.close()
        super(FileCopy, self).close()


class RemoteFile(BufferedIOBase):
    """
    A file like wrapper to handle downloading a file from a remote location.
    """

    def __init__(self, filepath, remote_url):
        self.transfer = FileDownload(
            remote_url,
            filepath,
            finalize_download=False,
        )
        self.chunked_file_obj = self.transfer.chunked_file_obj
        self._previously_read = b""
        self._needs_download = None
        self.range_start = None
        self.range_end = None

    def set_range(self, start, end):
        self.range_start = start
        self.range_end = end
        self.transfer.set_range(start, end)

    def get_file_size(self):
        if self.transfer.total_size is None:
            self._start_transfer()
        return self.transfer.total_size

    def _start_transfer(self):
        if self._needs_download is None:
            self._needs_download = not self.chunked_file_obj.is_complete(
                start=self.range_start, end=self.range_end
            )
        if self._needs_download and not self.transfer.started:
            self.transfer.start()

    def read(self, size=-1):
        self._start_transfer()
        if self._needs_download:
            data = self._previously_read
            while size == -1 or len(data) < size:
                try:
                    data += next(self.transfer)
                except StopIteration:
                    break
            if size != -1:
                self._previously_read = data[size:]
                data = data[:size]
            return data
        return self.chunked_file_obj.read(size=size)

    def close(self):
        self.transfer.close()

    def seek(self, offset, whence=0):
        # We handle this by setting the range on the transfer instead, so can safely
        # ignore this call.
        pass
