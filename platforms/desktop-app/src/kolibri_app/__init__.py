import os
import sys

from kolibri_app.constants import FROZEN
from kolibri_app.constants import MAC
from kolibri_app.logger import logging


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


# Run this here so that this is always initialized before anything else
# is imported from this module.
if FROZEN:
    # Make sure we send all app output to logs as we have no console to view them on.
    sys.stdout = LoggerWriter(logging.debug)
    sys.stderr = LoggerWriter(logging.warning)

portable_dirs = []

if FROZEN:
    # In the app bundle context sys.executable will be:
    #   On Windows: The Kolibri.exe path
    #   On macOS: Kolibri.app/Contents/MacOS/python
    if MAC:
        root_dir = os.path.abspath(os.path.join(os.path.dirname(sys.executable), '..', 'Resources'))
        extra_python_path = os.path.join(
            root_dir, 'lib',
            'python{}.{}'.format(sys.version_info.major, sys.version_info.minor))
    elif hasattr(sys, '_MEIPASS'):
        # This env var points to where PyInstaller extracted the sources in single file mode.
        root_dir = sys._MEIPASS
        extra_python_path = root_dir
    else:
        root_dir = os.path.abspath(os.path.dirname(sys.executable))
        extra_python_path = root_dir
    sys.path.insert(0, extra_python_path)
    portable_dirs = [
        root_dir,
        os.path.abspath(os.path.join(root_dir, '..')),
        # In macOS we must look for the folder that's along side Kolibri.app
        os.path.abspath(os.path.join(root_dir, '../../..'))
    ]


os.environ["DJANGO_SETTINGS_MODULE"] = "kolibri_app.django_app_settings"


if not 'KOLIBRI_HOME' in os.environ:
    for adir in portable_dirs:
        kolibri_data_dir = os.path.join(adir, 'KOLIBRI_DATA')
        kolibri_dir = os.path.join(adir, '.kolibri')
        if os.path.isdir(kolibri_data_dir):
            db_file = os.path.join(kolibri_data_dir, 'db.sqlite3')
            if os.path.exists(db_file):
                os.environ["KOLIBRI_HOME"] = kolibri_data_dir
                break
        if os.path.isdir(kolibri_dir):
            os.environ["KOLIBRI_HOME"] = kolibri_dir
            break

from kolibri.utils.conf import LOG_ROOT
from kolibri.utils.logger import KolibriTimedRotatingFileHandler

log_basename = "kolibri-app.txt"
os.makedirs(LOG_ROOT, exist_ok=True)
log_filename = os.path.join(LOG_ROOT, log_basename)
file_handler = KolibriTimedRotatingFileHandler(filename=log_filename, encoding='utf-8', when='midnight', backupCount=30)
logging.addHandler(file_handler)

from kolibri.main import enable_plugin

enable_plugin('kolibri.plugins.app')
