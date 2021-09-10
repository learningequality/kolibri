import os
import sys

import logging as log

from kolibri.utils.conf import LOG_ROOT
from kolibri.utils.logger import KolibriTimedRotatingFileHandler

log.basicConfig(format="%(levelname)s: %(message)s", level=log.INFO)
logging = log.getLogger("kolibri_app")

log_basename = "kolibri-app.txt"
log_filename = os.path.join(LOG_ROOT, log_basename)
file_handler = KolibriTimedRotatingFileHandler(filename=log_filename, encoding='utf-8', when='midnight', backupCount=30)
logging.addHandler(file_handler)


class LoggerWriter(object):
    def __init__(self, writer):
        self._writer = writer
        self._msg = ''

    def write(self, message):
        self._msg = self._msg + message
        while '\n' in self._msg:
            pos = self._msg.find('\n')
            self._writer(self._msg[:pos])
            self._msg = self._msg[pos+1:]

    def flush(self):
        if self._msg != '':
            self._writer(self._msg)
            self._msg = ''


# Make sure we send all app output to logs as we have no console to view them on.
sys.stdout = LoggerWriter(logging.debug)
sys.stderr = LoggerWriter(logging.warning)
