import hashlib
import logging
import math
import os
import shutil
import sys
from abc import ABCMeta
from abc import abstractmethod
from contextlib import contextmanager
from io import BufferedIOBase
from sqlite3 import OperationalError
from time import sleep

import requests
from diskcache import Cache
from diskcache import Lock
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout

from kolibri.utils.filesystem import mkdirp


try:
    # Pre-empt the PanicException that importing cryptography can cause
    # when we are using a non-compatible version of cffi on Python 3.13
    # this happens because of static depdendency bundling in Kolibri
    # See the morango.models.fields.crypto module for the source of this code.
    import cffi

    if sys.version_info > (3, 13):
        if hasattr(cffi, "__version_info__"):
            if cffi.__version_info__ < (1, 17, 1):
                raise ImportError

    import OpenSSL

    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    SSLERROR = requests.exceptions.SSLError
except BaseException as e:
    # Still catch PanicExceptions just in case.
    if "Python API call failed" not in str(e):
        raise
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


def replace(file_path, new_file_path):
    """
    Do a replace type operation.
    This is not the same as an atomic replacement, as it could result
    in the target file being removed before the rename happens.
    This can be removed once Python 2.7 support is dropped
    """
    if os.path.exists(new_file_path):
        os.remove(new_file_path)
    os.rename(file_path, new_file_path)


class ChunkedFileDoesNotExist(Exception):
    pass


CHUNK_SUFFIX = ".chunks"


class ChunkedFileDirectoryManager(object):
    """
    A class to manage all chunked files in a directory and all its descendant directories.
    Its main purpose is to allow for the deletion of chunked files based on a least recently used
    metric, as indicated by last access time on any of the files in the chunked file directory.
    """

    def __init__(self, chunked_file_dir):
        self.chunked_file_dir = chunked_file_dir

    def _get_chunked_file_dirs(self):
        """
        Returns a generator of all chunked file directories in the chunked file directory.
        """
        for root, dirs, _ in os.walk(self.chunked_file_dir):
            for dir in dirs:
                if dir.endswith(CHUNK_SUFFIX):
                    yield os.path.join(root, dir)
                    # Don't continue to walk down the directory tree
                    dirs.remove(dir)

    def _get_chunked_file_stats(self):
        stats = {}
        for chunked_file_dir in self._get_chunked_file_dirs():
            file_stats = {"last_access_time": 0, "size": 0}
            for dirpath, _, filenames in os.walk(chunked_file_dir):
                for file in filenames:
                    file_path = os.path.join(dirpath, file)
                    file_stats["last_access_time"] = max(
                        file_stats["last_access_time"], os.path.getatime(file_path)
                    )
                    file_stats["size"] += os.path.getsize(file_path)
            stats[chunked_file_dir] = file_stats
        return stats

    def _do_file_eviction(self, chunked_file_stats, file_size):
        chunked_file_dirs = sorted(
            chunked_file_stats.keys(),
            key=lambda x: chunked_file_stats[x]["last_access_time"],
        )
        evicted_file_size = 0
        for chunked_file_dir in chunked_file_dirs:
            # Do the check here to catch the edge case where file_size is <= 0
            if file_size <= evicted_file_size:
                break
            file_stats = chunked_file_stats[chunked_file_dir]
            evicted_file_size += file_stats["size"]
            shutil.rmtree(chunked_file_dir)
        return evicted_file_size

    def evict_files(self, file_size):
        """
        Attempt to clean up file_size bytes of space in the chunked file directory.
        Iterate through all chunked file directories, and delete the oldest chunked files
        until the target file size is reached.
        """
        chunked_file_stats = self._get_chunked_file_stats()
        return self._do_file_eviction(chunked_file_stats, file_size)

    def limit_files(self, max_size):
        """
        Limits the total size used to a certain number of bytes.
        If the total size of all chunked files exceeds max_size, the oldest files are evicted.
        """
        chunked_file_stats = self._get_chunked_file_stats()

        total_size = sum(
            file_stats["size"] for file_stats in chunked_file_stats.values()
        )

        return self._do_file_eviction(chunked_file_stats, total_size - max_size)


class ChunkedFile(BufferedIOBase):
    # Set chunk size to 128KB
    chunk_size = 128 * 1024

    def __init__(self, filepath):
        self.filepath = filepath
        self.chunk_dir = filepath + CHUNK_SUFFIX
        mkdirp(self.chunk_dir, exist_ok=True)
        self.cache_dir = os.path.join(self.chunk_dir, ".cache")
        self.position = 0
        self._file_size = None

    def _open_cache(self):
        self._check_for_chunk_dir()
        return Cache(self.cache_dir)

    @property
    def chunks_count(self):
        return int(math.ceil(float(self.file_size) / float(self.chunk_size)))

    @property
    def file_size(self):
        if self._file_size is not None:
            return self._file_size
        try:
            with self._open_cache() as cache:
                self._file_size = cache.get(".file_size")
        except OperationalError:
            pass
        if self._file_size is None:
            raise ValueError("file_size is not set")
        return self._file_size

    @file_size.setter
    def file_size(self, value):
        if not isinstance(value, int):
            raise TypeError("file_size must be an integer")
        with self._open_cache() as cache:
            cache.set(".file_size", value)
            self._file_size = value

    def _check_for_chunk_dir(self):
        if not os.path.isdir(self.chunk_dir):
            raise ChunkedFileDoesNotExist("Chunked file does not exist")

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

    def tell(self):
        return self.position

    def _read(self, position, size=-1):
        """
        Takes a position argument which will be modified and returned by the read operation.
        """
        self._check_for_chunk_dir()
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

    def chunk_generator(self, data):
        return (
            data[i : i + self.chunk_size] for i in range(0, len(data), self.chunk_size)
        )

    def write_chunk(self, index, data):
        if not -1 < index < self.chunks_count:
            raise ValueError(
                "Chunk index {} out of range should be between 0 and {}".format(
                    index, self.chunks_count
                )
            )
        self._check_for_chunk_dir()
        chunk_file = self._get_chunk_file_name(index)
        chunk_file_size = self._get_expected_chunk_size(index)
        if len(data) != chunk_file_size:
            raise ValueError(
                "Chunk size mismatch. Expected {expected} bytes, got {actual} bytes".format(
                    expected=chunk_file_size, actual=len(data)
                )
            )
        with open(chunk_file, "wb") as f:
            f.write(data)

    def write_chunks(self, chunks, data_generator, progress_callback=None):
        for index, data in zip(chunks, data_generator):
            self.write_chunk(index, data)
            if callable(progress_callback):
                progress_callback(data)

    def write_all(self, data_generator, progress_callback=None):
        self.write_chunks(
            range(0, self.chunks_count),
            data_generator,
            progress_callback=progress_callback,
        )

    def _chunk_range_for_byte_range(self, start, end):
        if start is not None and end is not None and start > end:
            raise ValueError("Start must be less than or equal to end")
        start_chunk = max(start // self.chunk_size if start is not None else 0, 0)
        end_chunk = min(
            end // self.chunk_size if end is not None else self.chunks_count - 1,
            self.chunks_count - 1,
        )
        return start_chunk, end_chunk

    def all_chunks(self, *skip_chunks):
        return (i for i in range(self.chunks_count) if i not in skip_chunks)

    def missing_chunks_generator(self, start=None, end=None):
        """
        Generator for the index, start range, and end range of the next missing chunk.
        """
        start_chunk, end_chunk = self._chunk_range_for_byte_range(start, end)

        for chunk_index in range(start_chunk, end_chunk + 1):
            if not self.chunk_complete(chunk_index):
                range_start = chunk_index * self.chunk_size
                range_end = min(range_start + self.chunk_size - 1, self.file_size - 1)
                yield chunk_index, range_start, range_end

    def get_next_missing_range(self, start=None, end=None, full_range=False):
        """
        Returns the indices, start range, and end range of the next missing range of chunks.
        If full_range is True, it returns the largest range of contiguous missing chunks.
        """
        generator = self.missing_chunks_generator(start, end)
        try:
            first_chunk_index, range_start, range_end = next(generator)
        except StopIteration:
            return None, None, None
        indices = (first_chunk_index,)
        if full_range:
            for chunk_index, _, chunk_end in generator:
                if chunk_index == indices[-1] + 1:
                    indices = indices + (chunk_index,)
                    range_end = chunk_end
                else:
                    break
        return indices, range_start, range_end

    @contextmanager
    def lock_chunks(self, *chunk_indices):
        locks = []
        with self._open_cache() as cache:
            for chunk_index in chunk_indices:
                chunk_file = self._get_chunk_file_name(chunk_index)
                lock = Lock(cache, chunk_file, expire=10)
                lock.acquire()
                locks.append(lock)
            try:
                yield
            finally:
                for lock in locks:
                    lock.release()

    def finalize_file(self):
        if not self.is_complete():
            raise ValueError("Cannot combine chunks: Not all chunks are complete")

        tmp_filepath = self.filepath + ".transfer"

        with open(tmp_filepath, "wb") as output_file:
            for chunk_index in range(self.chunks_count):
                chunk_file = self._get_chunk_file_name(chunk_index)
                with open(chunk_file, "rb") as input_file:
                    shutil.copyfileobj(input_file, output_file)
        replace(tmp_filepath, self.filepath)

    def _get_expected_chunk_size(self, chunk_index):
        return (
            self.chunk_size
            if chunk_index < self.chunks_count - 1
            else (self.file_size - (self.chunk_size * chunk_index))
        )

    def chunk_complete(self, chunk_index):
        chunk_file = self._get_chunk_file_name(chunk_index)
        # Check for correct chunk size
        expected_chunk_size = self._get_expected_chunk_size(chunk_index)
        return (
            os.path.exists(chunk_file)
            and os.path.getsize(chunk_file) == expected_chunk_size
        )

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
            if not self.chunk_complete(chunk_index):
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

    def readable(self):
        return True

    def writable(self):
        return False

    def seekable(self):
        return True


class Transfer(metaclass=ABCMeta):
    DEFAULT_TIMEOUT = 60

    def __init__(
        self,
        source,
        dest,
        checksum=None,
        cancel_check=None,
    ):
        self.source = source
        self.dest = dest
        self.checksum = checksum
        # Set block size to 128KB
        # the previous value of 2MB was set to avoid frequent progress
        # updates during file transfer, but since file transfers
        # have been parallelized, and individual file downloads are not tracked
        # except as part of overall download progress, this is no longer necessary.
        # 128KB allows for small chunks of files to be transferred
        # with the potential for interruption, while still allowing
        # for a reasonable amount of data to be transferred in one go.
        # This will also reduce memory usage when transferring large files.
        # This seems to gave a very minor performance improvement compared to the 2MB block size.
        self.block_size = ChunkedFile.chunk_size
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False
        if cancel_check and not callable(cancel_check):
            raise AssertionError("cancel_check must be callable")
        self._cancel_check = cancel_check

        if os.path.isdir(dest):
            raise AssertionError(
                "dest must include the target filename, not just directory path"
            )

        # ensure the directories in the destination path exist
        mkdirp(os.path.dirname(self.dest), exist_ok=True)

    @abstractmethod
    def start(self):
        pass

    def cancel_check(self):
        if self._cancel_check and self._cancel_check():
            self._kill_gracefully()

    def complete_close_and_finalize(self):
        # If there are no more chunks, mark the transfer as completed
        self.completed = True
        # Close the transfer
        self.close()
        # Finalize the transfer (verify checksum and move the temporary file)
        self.finalize()

    @abstractmethod
    def run(self, progress_update=None):
        pass

    @abstractmethod
    def _move_tmp_to_dest(self):
        pass

    @abstractmethod
    def delete(self):
        pass

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
            self.delete()
        except OSError:
            pass
        self.canceled = True

    @abstractmethod
    def _checksum_correct(self):
        pass

    def _verify_checksum(self):
        # If checksum of the destination file is different from the localfile
        # id indicated in the database, it means that the destination file
        # is corrupted, either from origin or during import. Skip importing
        # this file.
        if self.checksum and not self._checksum_correct():
            e = "File {} is corrupted.".format(self.source)
            logger.error("An error occurred during content import: {}".format(e))
            try:
                self.delete()
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
    def __init__(
        self,
        source,
        dest,
        checksum=None,
        cancel_check=None,
        session=None,
        finalize_download=True,
        start_range=None,
        end_range=None,
        timeout=Transfer.DEFAULT_TIMEOUT,
        retry_wait=30,
        full_ranges=True,
    ):

        # allow an existing requests.Session instance to be passed in, so it can be reused for speed
        # initialize a fresh requests session, if one wasn't provided
        self.session = session or requests.Session()

        # A flag to allow the download to remain in the chunked file directory
        # for easier clean up when it is just a temporary download.
        self._finalize_download = finalize_download

        # A flag to download the full range in one request, or to download
        # chunks of the file.
        self.full_ranges = full_ranges

        self.set_range(start_range, end_range)

        self.timeout = timeout
        self.retry_wait = retry_wait

        self.compressed = False

        self.content_length_header = False

        self._headers_set = False

        self.transfer_size = None

        super(FileDownload, self).__init__(
            source, dest, checksum=checksum, cancel_check=cancel_check
        )

        self._initialize_chunked_file()

    def _initialize_chunked_file(self):
        self.dest_file_obj = ChunkedFile(self.dest)

        self.completed = self.dest_file_obj.is_complete(
            start=self.range_start, end=self.range_end
        )

    def set_range(self, range_start, range_end):
        if range_start is not None and not isinstance(range_start, int):
            raise TypeError("range_start must be an integer")

        self.range_start = range_start

        if range_end is not None and not isinstance(range_end, int):
            raise TypeError("range_end must be an integer")

        self.range_end = range_end

    @property
    def total_size(self):
        try:
            return self.dest_file_obj.file_size
        except ValueError:
            return None

    @total_size.setter
    def total_size(self, value):
        self.dest_file_obj.file_size = value
        if self.transfer_size is None:
            self.transfer_size = value

    @property
    def finalize_download(self):
        return (
            self._finalize_download
            and (self.range_start is None or self.range_start == 0)
            and (self.range_end is None or self.range_end == self.total_size - 1)
        )

    def finalize(self):
        if not self.finalize_download:
            return
        return super(FileDownload, self).finalize()

    def _move_tmp_to_dest(self):
        try:
            self.dest_file_obj.finalize_file()
            self.dest_file_obj.delete()
        except FileNotFoundError as e:
            if not os.path.exists(self.dest):
                raise e

    def delete(self):
        self.dest_file_obj.delete()

    def _checksum_correct(self):
        return self.dest_file_obj.md5_checksum() == self.checksum

    def _catch_exception_and_retry(func):
        def inner(self, *args, **kwargs):
            succeeded = False
            while not succeeded:
                try:
                    func(self, *args, **kwargs)
                    succeeded = True
                except Exception as e:
                    if not isinstance(e, ChunkedFileDoesNotExist):
                        retry = retry_import(e)
                        if not retry:
                            raise
                        # Catch exceptions to check if we should resume file downloading
                        logger.error("Error reading download stream: {}".format(e))
                    else:
                        logger.error(
                            "Error writing to chunked file, retrying: {}".format(e)
                        )
                        self._initialize_chunked_file()
                        self._headers_set = False
                        self._set_headers()
                    logger.info(
                        "Waiting {}s before retrying import: {}".format(
                            self.retry_wait, self.source
                        )
                    )
                    for i in range(self.retry_wait):
                        self.cancel_check()
                        sleep(1)

        return inner

    @_catch_exception_and_retry
    def run(self, progress_update=None):
        if not self.completed:
            try:
                self._run_download(progress_update=progress_update)
            except ChunkedFileDoesNotExist:
                # If the chunked file does not exist, we need to start from the beginning
                # unless a simultaneous download has already completed the file.
                if not os.path.exists(self.dest):
                    raise
                # Set as finalized as the file already exists
                self.finalized = True
        self.complete_close_and_finalize()

    @property
    def header_info(self):
        return {
            "compressed": self.compressed,
            "content_length_header": self.content_length_header,
            "transfer_size": self.transfer_size,
        }

    def restore_head_info(self, header_info):
        self.compressed = header_info["compressed"]
        self.content_length_header = header_info["content_length_header"]
        self.transfer_size = header_info["transfer_size"]
        self._headers_set = True

    def _set_headers(self):
        if self._headers_set:
            return

        response = self.session.head(
            self.source, timeout=self.timeout, allow_redirects=True
        )
        response.raise_for_status()

        if response.url != self.source:
            logger.debug("Redirected from {} to {}".format(self.source, response.url))
            self.source = response.url

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

    @_catch_exception_and_retry
    def start(self):
        if not self.completed:
            # initiate the download, check for status errors, and calculate download size
            self._set_headers()
        self.started = True

    def _run_byte_range_download(self, progress_callback):
        chunk_indices, start_byte, end_byte = self.dest_file_obj.get_next_missing_range(
            start=self.range_start, end=self.range_end, full_range=self.full_ranges
        )
        while chunk_indices is not None:
            with self.dest_file_obj.lock_chunks(*chunk_indices):
                if not any(
                    self.dest_file_obj.chunk_complete(chunk) for chunk in chunk_indices
                ):
                    # If while waiting for a lock on a chunk, any of the chunks we were trying to
                    # download were already downloaded, then we can skip downloading those chunks.
                    # Easiest to just start over and get the fresh list of chunks to download.
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

                    data_generator = response.iter_content(
                        self.dest_file_obj.chunk_size
                    )
                    if range_response_supported:
                        self.dest_file_obj.write_chunks(
                            chunk_indices,
                            data_generator,
                            progress_callback=progress_callback,
                        )
                    else:
                        # Lock all chunks except the chunks we already locked, so as to avoid trying
                        # to acquire the same lock twice, and also so that no one else tries to download
                        # the same chunks while we are streaming them.
                        with self.dest_file_obj.lock_chunks(
                            self.dest_file_obj.all_chunks(*chunk_indices)
                        ):
                            self.dest_file_obj.write_all(
                                data_generator, progress_callback=progress_callback
                            )
                (
                    chunk_indices,
                    start_byte,
                    end_byte,
                ) = self.dest_file_obj.get_next_missing_range(
                    start=self.range_start,
                    end=self.range_end,
                    full_range=self.full_ranges,
                )

    def _run_no_byte_range_download(self, progress_callback):
        with self.dest_file_obj.lock_chunks(self.dest_file_obj.all_chunks()):
            response = self.session.get(self.source, stream=True, timeout=self.timeout)
            response.raise_for_status()
            generator = response.iter_content(self.dest_file_obj.chunk_size)
            self.dest_file_obj.write_all(generator, progress_callback=progress_callback)

    def _run_no_byte_range_download_no_total_size(self, progress_callback):
        response = self.session.get(self.source, stream=True, timeout=self.timeout)
        response.raise_for_status()
        # Doing this exhausts the iterator, so if we need to do this, we need
        # to return the dummy iterator below, as the iterator will be empty,
        # and all content is now stored in memory. So we should avoid doing this as much
        # as we can, hence the total size check before this function is invoked.
        self.total_size = len(response.content)
        with self.dest_file_obj.lock_chunks(self.dest_file_obj.all_chunks()):
            generator = self.dest_file_obj.chunk_generator(response.content)
            self.dest_file_obj.write_all(generator, progress_callback=progress_callback)

    def _run_download(self, progress_update=None):
        if not self.started:
            raise AssertionError("File download must be started before it can be run.")

        def progress_callback(bytes_to_write):
            if progress_update:
                progress_update(len(bytes_to_write))
            self.cancel_check()

        # Some Kolibri versions do support range requests, but fail to properly report this fact
        # from their Accept-Ranges header. So we need to check if the server supports range requests
        # by trying to make a range request, and if it fails, we need to fall back to the old
        # behavior of downloading the whole file.
        if self.content_length_header and not self.compressed:
            self._run_byte_range_download(progress_callback)
        elif self.total_size:
            self._run_no_byte_range_download(progress_callback)
        else:
            self._run_no_byte_range_download_no_total_size(progress_callback)

    def close(self):
        if hasattr(self, "response"):
            self.response.close()
        super(FileDownload, self).close()


class FileCopy(Transfer):
    def start(self):
        if self.started:
            raise AssertionError(
                "File copy has already been started, and cannot be started again"
            )
        self.dest_tmp = self.dest + ".transfer"
        if os.path.isfile(self.dest_tmp):
            try:
                os.remove(self.dest_tmp)
            except OSError:
                pass
        self.dest_file_obj = open(self.dest_tmp, "wb")
        self.total_size = os.path.getsize(self.source)
        self.transfer_size = self.total_size
        self.source_file_obj = open(self.source, "rb")
        self.started = True
        self.hasher = hashlib.md5()

    def _move_tmp_to_dest(self):
        replace(self.dest_tmp, self.dest)

    def delete(self):
        try:
            os.remove(self.dest_tmp)
        except OSError:
            pass

    def _checksum_correct(self):
        return self.hasher.hexdigest() == self.checksum

    def run(self, progress_update=None):
        while True:
            self.cancel_check()
            block = self.source_file_obj.read(self.block_size)
            if not block:
                break
            self.dest_file_obj.write(block)
            self.hasher.update(block)
            if callable(progress_update):
                progress_update(len(block))
        self.complete_close_and_finalize()

    def close(self):
        self.source_file_obj.close()
        super(FileCopy, self).close()


class RemoteFile(ChunkedFile):
    """
    A file like wrapper to handle downloading a file from a remote location.
    """

    def __init__(self, filepath, remote_url):
        super(RemoteFile, self).__init__(filepath)
        self.remote_url = remote_url
        self._dest_file_handle = None
        self.transfer = None

    @property
    def dest_file_handle(self):
        if self._dest_file_handle is None and os.path.exists(self.filepath):
            self._dest_file_handle = open(self.filepath, "rb")
            self._dest_file_handle.seek(self.position)
        return self._dest_file_handle

    def get_file_size(self):
        try:
            return self.file_size
        except ValueError:
            self._start_transfer()
            # In some cases, the server does not return a content-length header,
            # so we need to download the whole file to get the size.
            if not self.transfer.total_size:
                self._run_transfer()
        return self.file_size

    def _run_transfer(self):
        self.transfer.run()
        with self._open_cache() as cache:
            cache.set(self.remote_url, self.transfer.header_info)

    def _start_transfer(self, start=None, end=None):
        if not self.is_complete(start=start, end=end):
            self.transfer = FileDownload(
                self.remote_url,
                self.filepath,
                start_range=start,
                end_range=end,
                finalize_download=False,
                full_ranges=False,
            )
            with self._open_cache() as cache:
                header_info = cache.get(self.remote_url)
            if header_info:
                self.transfer.restore_head_info(header_info)
            self.transfer.start()
            return True

    def read(self, size=-1):
        dest_file_handle = self.dest_file_handle
        if dest_file_handle:
            return dest_file_handle.read(size)
        needs_download = self._start_transfer(
            self.position, self.position + size if size != -1 else None
        )
        if needs_download:
            self._run_transfer()
        return super(RemoteFile, self).read(size)

    def seek(self, offset, whence=0):
        dest_file_handle = self.dest_file_handle
        if dest_file_handle:
            return dest_file_handle.seek(offset, whence)
        self.get_file_size()
        return super(RemoteFile, self).seek(offset, whence)

    def close(self):
        if self.transfer:
            self.transfer.close()
        if self._dest_file_handle:
            self._dest_file_handle.close()
