import logging
import os
import shutil
from time import sleep

import requests

from kolibri.core.content.utils.import_export_content import retry_import

logger = logging.getLogger(__name__)


class ExistingTransferInProgress(Exception):
    pass


class TransferNotYetCompleted(Exception):
    pass


class TransferCanceled(Exception):
    pass


class TransferNotYetClosed(Exception):
    pass


class Transfer(object):
    def __init__(
        self,
        source,
        dest,
        block_size=2097152,
        remove_existing_temp_file=True,
        timeout=20,
        cancel_check=None,
    ):
        self.source = source
        self.dest = dest
        self.dest_tmp = dest + ".transfer"
        self.block_size = block_size
        self.timeout = timeout
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False
        self.cancel_check = cancel_check

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
                os.remove(self.dest_tmp)
            else:
                raise ExistingTransferInProgress(
                    "Temporary transfer destination '{}' already exists!".format(
                        self.dest_tmp
                    )
                )

        # record whether the destination file already exists, so it can be checked, but don't error out
        self.dest_exists = os.path.isfile(dest)

    def start(self):
        # open the destination file for writing
        self.dest_file_obj = open(self.dest_tmp, "wb")

    def __next__(self):  # proxy this method to fully support Python 3
        return self.next()

    def next(self):
        try:
            chunk = next(self._content_iterator)
        except StopIteration:
            self.completed = True
            self.close()
            self.finalize()
            raise
        self.dest_file_obj.write(chunk)
        return chunk

    def _move_tmp_to_dest(self):
        shutil.move(self.dest_tmp, self.dest)

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

    def __iter__(self):
        if not self.started:
            raise AssertionError(
                "File download must be started before it can be iterated."
            )
        self._content_iterator = self.response.iter_content(self.block_size)
        return self

    def next(self):
        if self.cancel_check():
            self._kill_gracefully()

        try:
            chunk = super(FileDownload, self).next()
            self.transferred_size = self.transferred_size + self.block_size
            return chunk
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
        logger.info("Waiting 30s before retrying import: {}".format(self.source))
        for i in range(30):
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

    def _read_block_iterator(self):
        while True:
            if self.cancel_check():
                self._kill_gracefully()
            block = self.source_file_obj.read(self.block_size)
            if not block:
                break
            yield block

    def __iter__(self):
        self._content_iterator = self._read_block_iterator()
        return self

    def close(self):
        self.source_file_obj.close()
        super(FileCopy, self).close()
