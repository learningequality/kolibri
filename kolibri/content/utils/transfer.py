import logging as logger
import os
import signal

import requests

logging = logger.getLogger(__name__)


class ExistingTransferInProgress(Exception):
    pass


class TransferNotYetCompleted(Exception):
    pass


class TransferCanceled(Exception):
    pass


class TransferNotYetClosed(Exception):
    pass


class Transfer(object):

    def __init__(self, source, dest, block_size=2048, remove_existing_temp_file=True):
        self.source = source
        self.dest = dest
        self.dest_tmp = dest + ".transfer"
        self.block_size = block_size
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False

        signal.signal(signal.SIGINT, self._kill_gracefully)
        signal.signal(signal.SIGTERM, self._kill_gracefully)

        assert not os.path.isdir(dest), "dest must include the target filename, not just directory path"

        # ensure the directories in the destination path exist
        try:
            filedir = os.path.dirname(self.dest)
            os.makedirs(filedir)
        except OSError as e:
            if e.errno == 17:  # File exists (folder already created)
                logger.debug("Not creating directory '{}' as it already exists.".format(filedir))
            else:
                raise

        if os.path.isfile(self.dest_tmp):
            if remove_existing_temp_file:
                os.remove(self.dest_tmp)
            else:
                raise ExistingTransferInProgress("Temporary transfer destination '{}' already exists!".format(self.dest_tmp))

        # record whether the destination file already exists, so it can be checked, but don't error out
        self.dest_exists = os.path.isfile(dest)

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
        try:
            os.remove(self.dest)
        except OSError:  # dest doesn't exist; no problem
            pass
        os.rename(self.dest_tmp, self.dest)

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
            raise TransferNotYetCompleted("Transfer must have completed before it can be finalized.")
        if not self.closed:
            raise TransferNotYetClosed("Transfer must be closed before it can be finalized.")
        if self.finalized:
            return
        self._move_tmp_to_dest()
        self.finalized = True


class FileDownload(Transfer):

    def start(self):
        assert not self.started, "File download has already been started, and cannot be started again"
        # initiate the download, check for status errors, and calculate download size
        self.response = requests.get(self.source, stream=True)
        self.response.raise_for_status()
        self.total_size = int(self.response.headers['content-length'])
        self.dest_file_obj = open(self.dest_tmp, "wb")
        self.started = True

    def __iter__(self):
        self._content_iterator = self.response.iter_content(self.block_size)
        return self

    def close(self):
        self.dest_file_obj.close()
        self.response.close()
        self.closed = True


class FileCopy(Transfer):

    def start(self):
        assert not self.started, "File copy has already been started, and cannot be started again"
        self.total_size = os.path.getsize(self.source)
        self.source_file_obj = open(self.source, "rb")
        self.dest_file_obj = open(self.dest_tmp, "wb")
        self.started = True

    def _read_block_iterator(self):
        while True:
            block = self.source_file_obj.read(self.block_size)
            if not block:
                break
            self.dest_file_obj.write(block)
            yield block

    def __iter__(self):
        self._content_iterator = self._read_block_iterator()
        return self

    def close(self):
        self.source_file_obj.close()
        self.dest_file_obj.close()
        self.closed = True
