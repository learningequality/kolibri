import hashlib
import logging
import math
import os
import shutil
from io import BufferedIOBase
from time import sleep

import requests
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout


try:
    import OpenSSL

    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    SSLERROR = requests.exceptions.SSLError


try:
    FileNotFoundError
except NameError:
    FileNotFoundError = IOError


RETRY_STATUS_CODE = [502, 503, 504, 521, 522, 523, 524]


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
        os.makedirs(self.chunk_dir, exist_ok=True)
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

    def read(self, size=-1):
        if size < 0:
            size = self.file_size - self.position

        remaining = size
        data_parts = []

        while remaining > 0:
            chunk_index = self.position // self.chunk_size
            chunk_file = self._get_chunk_file_name(chunk_index)

            with open(chunk_file, "rb") as f:
                f.seek(self.position % self.chunk_size)
                chunk_data = f.read(min(remaining, self.chunk_size))
                data_parts.append(chunk_data)

                self.position += len(chunk_data)
                remaining -= len(chunk_data)

        return b"".join(data_parts)

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
                bytes_written = f.write(
                    data[
                        len(data) - remaining : len(data) - remaining + amount_to_write
                    ]
                )

                self.position += bytes_written
                remaining -= bytes_written

    def next_missing_chunk_and_seek(self, start=None, end=None):
        """
        Generator to yield the next missing chunk, and see the file to the position the chunk
        should be written to.
        """
        start_chunk = start // self.chunk_size if start is not None else 0
        end_chunk = end // self.chunk_size if end is not None else self.chunks_count - 1

        for chunk_index in range(start_chunk, end_chunk + 1):
            chunk_file = self._get_chunk_file_name(chunk_index)
            if not os.path.exists(chunk_file):
                range_start = chunk_index * self.chunk_size
                range_end = min(range_start + self.chunk_size - 1, self.file_size - 1)
                self.seek(range_start)

                yield (range_start, range_end)

    def finalize_file(self):
        if not self.is_complete():
            raise ValueError("Cannot combine chunks: Not all chunks are complete")

        with open(self.filepath, "wb") as output_file:
            for chunk_index in range(self.chunks_count):
                chunk_file = self._get_chunk_file_name(chunk_index)
                with open(chunk_file, "rb") as input_file:
                    shutil.copyfileobj(input_file, output_file)

    def is_complete(self):
        for chunk_index in range(self.chunks_count):
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
        for chunk_index in range(self.chunks_count):
            chunk_file = self._get_chunk_file_name(chunk_index)
            with open(chunk_file, "rb") as f:
                while True:
                    data = f.read(8192)
                    if not data:
                        break
                    md5.update(data)
        return md5.hexdigest()


class Transfer(object):
    DEFAULT_TIMEOUT = 60

    def __init__(
        self,
        source,
        dest,
        checksum=None,
        remove_existing_temp_file=True,
        timeout=DEFAULT_TIMEOUT,
        cancel_check=None,
        retry_wait=30,
    ):
        self.source = source
        self.dest = dest
        self.dest_tmp = dest + ".transfer"
        self.checksum = checksum
        self.block_size = BLOCK_SIZE
        self.timeout = timeout
        self.retry_wait = retry_wait
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False
        if cancel_check and not callable(cancel_check):
            raise AssertionError("cancel_check must be callable")
        self._cancel_check = cancel_check

        # TODO (aron): Instead of using signals, have bbq/iceqube add
        # hooks that the app calls every so often to determine whether it
        # should shut down or not.
        # signal.signal(signal.SIGINT, self._kill_gracefully)
        # signal.signal(signal.SIGTERM, self._kill_gracefully)

        if os.path.isdir(dest):
            raise AssertionError(
                "dest must include the target filename, not just directory path"
            )

        # ensure the directories in the destination path exist
        try:
            filedir = os.path.dirname(self.dest)
            os.makedirs(filedir)
        except OSError as e:
            if e.errno == 17:  # File exists (folder already created)
                logger.debug(
                    "Not creating directory '{}' as it already exists.".format(filedir)
                )
            else:
                raise

        if os.path.isfile(self.dest_tmp):
            if remove_existing_temp_file:
                try:
                    os.remove(self.dest_tmp)
                except OSError:
                    pass
            else:
                raise ExistingTransferInProgress(
                    "Temporary transfer destination '{}' already exists!".format(
                        self.dest_tmp
                    )
                )

        # record whether the destination file already exists, so it can be checked, but don't error out
        self.dest_exists = os.path.isfile(dest)

        self.hasher = hashlib.md5()

    def start(self):
        # open the destination file for writing
        self.dest_file_obj = open(self.dest_tmp, "wb")

    def cancel_check(self):
        return self._cancel_check and self._cancel_check()

    def _set_iterator(self):
        if not hasattr(self, "_content_iterator"):
            self._content_iterator = self._get_content_iterator()

    def __next__(self):  # proxy this method to fully support Python 3
        return self.next()

    def __iter__(self):
        self._set_iterator()
        return self

    def _get_content_iterator(self):
        raise NotImplementedError(
            "Transfer subclass must implement a _get_content_iterator method"
        )

    def next(self):
        self._set_iterator()
        try:
            chunk = next(self._content_iterator)
        except StopIteration:
            self.completed = True
            self.close()
            self.finalize()
            raise
        self.dest_file_obj.write(chunk)
        self.hasher.update(chunk)
        return chunk

    def _move_tmp_to_dest(self):
        try:
            shutil.move(self.dest_tmp, self.dest)
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
        self.close()
        try:
            os.remove(self.dest_tmp)
        except OSError:
            pass
        self.canceled = True

    def _checksum_correct(self):
        return self.hasher.hexdigest() == self.checksum

    def _verify_checksum(self):
        # If checksum of the destination file is different from the localfile
        # id indicated in the database, it means that the destination file
        # is corrupted, either from origin or during import. Skip importing
        # this file.
        if self.checksum and not self._checksum_correct():
            e = "File {} is corrupted.".format(self.source)
            logger.error("An error occurred during content import: {}".format(e))
            try:
                os.remove(self.dest_tmp)
            except OSError:
                pass
            raise TransferFailed(
                "Transferred file checksums did not match for {}".format(self.source)
            )

    def finalize(self):
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
        self.dest_file_obj.close()
        self.closed = True


class FileDownload(Transfer):
    def __init__(self, *args, **kwargs):

        # allow an existing requests.Session instance to be passed in, so it can be reused for speed
        if "session" in kwargs:
            self.session = kwargs.pop("session")
        else:
            # initialize a fresh requests session, if one wasn't provided
            self.session = requests.Session()

        # Record the size of content that has been transferred
        self.transferred_size = 0

        super(FileDownload, self).__init__(*args, **kwargs)

    def start(self):
        super(FileDownload, self).start()
        # initiate the download, check for status errors, and calculate download size
        try:
            self.response = self.session.get(
                self.source, stream=True, timeout=self.timeout
            )
            self.response.raise_for_status()
        except Exception as e:
            retry = retry_import(e)
            if not retry:
                raise
            # Catch exceptions to check if we should resume file downloading
            self.resume()
            if self.cancel_check():
                self._kill_gracefully()

        try:
            self.total_size = int(self.response.headers["content-length"])
        except KeyError:
            # When a compressed file is saved on Google Cloud Storage,
            # content-length is not available in the header,
            # but we can use X-Goog-Stored-Content-Length.
            gcs_content_length = self.response.headers.get(
                "X-Goog-Stored-Content-Length"
            )
            if gcs_content_length:
                self.total_size = int(gcs_content_length)
            else:
                # Get size of response content when file is compressed through nginx.
                self.total_size = len(self.response.content)

        self.started = True

    def _get_content_iterator(self):
        if not self.started:
            raise AssertionError(
                "File download must be started before it can be iterated."
            )
        return self.response.iter_content(self.block_size)

    def next(self):
        if self.cancel_check():
            self._kill_gracefully()

        try:
            chunk = super(FileDownload, self).next()
            self.transferred_size = self.transferred_size + len(chunk)
            return chunk
        except StopIteration:
            raise
        except Exception as e:
            retry = retry_import(e)
            if not retry:
                raise
            logger.error("Error reading download stream: {}".format(e))
            self.resume()
            return self.next()

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
                logger.info("Canceling import: {}".format(self.source))
                return
            sleep(1)

        try:

            byte_range_resume = None
            # When internet connection is lost at the beginning of start(),
            # self.response does not get an assigned value
            if hasattr(self, "response"):
                # Use Accept-Ranges and Content-Length header to check if range
                # requests are supported. For example, range requests are not
                # supported on compressed files
                byte_range_resume = self.response.headers.get(
                    "accept-ranges", None
                ) and self.response.headers.get("content-length", None)
                resume_headers = self.response.request.headers

                # Only use byte-range file resuming when sources support range requests
                if byte_range_resume:
                    range_headers = {"Range": "bytes={}-".format(self.transferred_size)}
                    resume_headers.update(range_headers)

                self.response = self.session.get(
                    self.source,
                    headers=resume_headers,
                    stream=True,
                    timeout=self.timeout,
                )
            else:
                self.response = self.session.get(
                    self.source, stream=True, timeout=self.timeout
                )
            self.response.raise_for_status()
            self._content_iterator = self.response.iter_content(self.block_size)

            # Remove the existing content in dest_file_object when range requests are not supported
            if byte_range_resume is None:
                self.dest_file_obj.seek(0)
                self.dest_file_obj.truncate()
                # Reset our ongoing file hash
                self.hasher = hashlib.md5()
        except Exception as e:
            logger.error("Error reading download stream: {}".format(e))
            retry = retry_import(e)
            if not retry:
                raise

            self.resume()


class FileCopy(Transfer):
    def start(self):
        if self.started:
            raise AssertionError(
                "File copy has already been started, and cannot be started again"
            )
        super(FileCopy, self).start()
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

    def __init__(self, filepath, remote_url, callback=None):
        self.transfer = FileDownload(
            remote_url, filepath, remove_existing_temp_file=True
        )
        self.callback = callback
        self.transfer.start()
        self._previously_read = b""

    def read(self, size=-1):
        data = self._previously_read
        while size == -1 or len(data) < size:
            try:
                data += next(self.transfer)
            except StopIteration:
                if self.callback:
                    self.callback()
                break
        if size != -1:
            self._previously_read = data[size:]
            data = data[:size]
        return data

    def close(self):
        # Finish the download and close the file
        self.read()
        self.transfer.close()

    def seek(self, offset, whence=0):
        # Just read from the response until the offset is reached
        self.read(size=offset)
