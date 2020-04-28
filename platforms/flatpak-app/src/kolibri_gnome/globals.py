import json
import os
from urllib.error import URLError
from urllib.parse import urlencode, urlsplit, urlunsplit
from urllib.request import Request, urlopen

from . import config


USER_HOME = os.path.expanduser("~")

XDG_DATA_HOME = os.environ.get('XDG_DATA_HOME', os.path.join(USER_HOME, ".local", "share"))

KOLIBRI_IDLE_TIMEOUT_MINS = int(os.environ.get("KOLIBRI_IDLE_TIMEOUT_MINS", 60))
KOLIBRI_IDLE_TIMEOUT_SECS = int(os.environ.get("KOLIBRI_IDLE_TIMEOUT_SECS", KOLIBRI_IDLE_TIMEOUT_MINS * 60))

# Get KOLIBRI_HTTP_PORT from kolibri.utils.conf if needed.
# This will fail in an environment where Kolibri is supposed to run as a
# separate user due to code in kolibri.utils.conf which requires access to
# KOLIBRI_HOME. For that case, we check for the environment variable
# ourselves.

if 'KOLIBRI_HTTP_PORT' in os.environ:
    KOLIBRI_HTTP_PORT = int(os.environ.get("KOLIBRI_HTTP_PORT"))
else:
    from kolibri.utils.conf import OPTIONS
    KOLIBRI_HTTP_PORT = OPTIONS["Deployment"]["HTTP_PORT"]

KOLIBRI_URL = "http://127.0.0.1:{}".format(KOLIBRI_HTTP_PORT)
KOLIBRI_URL_SPLIT = urlsplit(KOLIBRI_URL)

DEFAULT_KOLIBRI_HOME = os.path.join(USER_HOME, ".kolibri")
KOLIBRI_HOME = os.environ.get("KOLIBRI_HOME", DEFAULT_KOLIBRI_HOME)

IS_KOLIBRI_LOCAL = os.access(KOLIBRI_HOME, os.W_OK)

if IS_KOLIBRI_LOCAL:
    LOCAL_KOLIBRI_HOME = KOLIBRI_HOME
else:
    LOCAL_KOLIBRI_HOME = os.environ.get("LOCAL_KOLIBRI_HOME", DEFAULT_KOLIBRI_HOME)


def init_gettext():
    import gettext
    gettext.bindtextdomain(config.APP_ID, config.LOCALE_DIR)
    gettext.textdomain(config.APP_ID)

    # root_dir = os.path.dirname(os.path.abspath(__file__))
    # locale_root_dir = os.path.join(root_dir, 'locale')
    # if root_dir.endswith('src'):
    #     locale_root_dir = os.path.join(root_dir, '..', 'locale')

def init_logging(logfile_name='kolibri-app.txt'):
    import logging
    logging.basicConfig(level=logging.DEBUG)

    from kolibri.utils.logger import KolibriTimedRotatingFileHandler

    log_dir = os.path.join(LOCAL_KOLIBRI_HOME, 'logs')
    os.makedirs(log_dir, exist_ok=True)
    log_filename = os.path.join(log_dir, logfile_name)

    root_logger = logging.getLogger()
    file_handler = KolibriTimedRotatingFileHandler(filename=log_filename, when='midnight', backupCount=30)
    root_logger.addHandler(file_handler)

def kolibri_api_get_json(path, query={}, default=None):
    request_url = KOLIBRI_URL_SPLIT._replace(
        path=path,
        query=urlencode(query)
    )
    request = Request(urlunsplit(request_url))

    try:
        response = urlopen(request)
    except URLError as error:
        return default

    try:
        data = json.load(response)
    except json.JSONDecodeError as error:
        return default

    return data

