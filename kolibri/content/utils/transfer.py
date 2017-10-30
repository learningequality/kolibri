import logging as logger
import os
import shutil
import requests
from requests.adapters import HTTPAdapter
from requests.exceptions import ConnectionError
from requests.packages.urllib3.util.retry import Retry

logging = logger.getLogger(__name__)


# policy for retrying downloads with exponential backoff delay
retries = Retry(total=5,
                backoff_factor=0.1,
                status_forcelist=[500, 502, 503, 504])


class ExistingTransferInProgress(Exception):
    pass


class TransferNotYetCompleted(Exception):
    pass


class TransferCanceled(Exception):
    pass


class TransferNotYetClosed(Exception):
    pass


class Transfer(object):

    def __init__(self, source, dest, block_size=2097152, remove_existing_temp_file=True, timeout=20):
        self.source = source
        self.dest = dest
        self.dest_tmp = dest + ".transfer"
        self.block_size = block_size
        self.timeout = timeout
        self.started = False
        self.completed = False
        self.finalized = False
        self.closed = False

        # TODO (aron): Instead of using signals, have bbq/iceqube add
        # hooks that the app calls every so often to determine whether it
        # should shut down or not.
        # signal.signal(signal.SIGINT, self._kill_gracefully)
        # signal.signal(signal.SIGTERM, self._kill_gracefully)

        assert not os.path.isdir(
            dest), "dest must include the target filename, not just directory path"

        # ensure the directories in the destination path exist
        try:
            filedir = os.path.dirname(self.dest)
            os.makedirs(filedir)
        except OSError as e:
            if e.errno == 17:  # File exists (folder already created)
                logger.debug(
                    "Not creating directory '{}' as it already exists.".format(filedir))
            else:
                raise

        if os.path.isfile(self.dest_tmp):
            if remove_existing_temp_file:
                os.remove(self.dest_tmp)
            else:
                raise ExistingTransferInProgress(
                    "Temporary transfer destination '{}' already exists!".format(self.dest_tmp))

        # record whether the destination file already exists, so it can be checked, but don't error out
        self.dest_exists = os.path.isfile(dest)

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
                "Transfer must have completed before it can be finalized.")
        if not self.closed:
            raise TransferNotYetClosed(
                "Transfer must be closed before it can be finalized.")
        if self.finalized:
            return
        self._move_tmp_to_dest()
        self.finalized = True

    def close(self):
        self.dest_file_obj.close()
        self.closed = True


class FileDownload(Transfer):

    def __init__(self, *args, **kwargs):
        # Set block size to None, to always get the largest chunk available from the socket
        kwargs["block_size"] = None
        super(FileDownload, self).__init__(*args, **kwargs)

    def start(self):
        assert not self.started, "File download has already been started, and cannot be started again"

        # initialize the requests session, with backoff-retries enabled
        self.session = requests.Session()
        self.session.mount('http://', HTTPAdapter(max_retries=retries))
        self.session.mount('https://', HTTPAdapter(max_retries=retries))

        # initiate the download, check for status errors, and calculate download size
        self.response = self.session.get(
            self.source, stream=True, timeout=self.timeout)
        self.response.raise_for_status()
        self.total_size = int(self.response.headers['content-length'])

        self.started = True

    def __iter__(self):
        assert self.started, "File download must be started before it can be iterated."
        self._content_iterator = self.response.iter_content(self.block_size)
        return self

    def next(self):
        try:
            return super(FileDownload, self).next()
        except ConnectionError as e:
            logging.error("Error reading download stream: {}".format(e))
            raise

    def close(self):
        self.response.close()
        super(FileDownload, self).close()


class FileCopy(Transfer):

    def start(self):
        assert not self.started, "File copy has already been started, and cannot be started again"
        self.total_size = os.path.getsize(self.source)
        self.source_file_obj = open(self.source, "rb")
        self.started = True

    def _read_block_iterator(self):
        while True:
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
