import logging

logger = logging.getLogger(__name__)

import gettext
import os

from . import config


USER_HOME = os.path.expanduser("~")

XDG_CURRENT_DESKTOP = os.environ.get("XDG_CURRENT_DESKTOP")
XDG_DATA_HOME = os.environ.get(
    "XDG_DATA_HOME", os.path.join(USER_HOME, ".local", "share")
)

KOLIBRI_USE_SYSTEM_INSTANCE = os.environ.get("KOLIBRI_USE_SYSTEM_INSTANCE", False)
KOLIBRI_APP_DEVELOPER_EXTRAS = os.environ.get("KOLIBRI_APP_DEVELOPER_EXTRAS")

DEFAULT_KOLIBRI_HOME = os.path.join(USER_HOME, ".kolibri")
KOLIBRI_HOME = os.environ.get("KOLIBRI_HOME", DEFAULT_KOLIBRI_HOME)
KOLIBRI_HOME = os.path.expanduser(KOLIBRI_HOME)

IS_KOLIBRI_LOCAL = os.access(KOLIBRI_HOME, os.W_OK)

if IS_KOLIBRI_LOCAL:
    LOCAL_KOLIBRI_HOME = KOLIBRI_HOME
else:
    LOCAL_KOLIBRI_HOME = os.environ.get("LOCAL_KOLIBRI_HOME", DEFAULT_KOLIBRI_HOME)


def init_gettext():
    gettext.bindtextdomain(config.GETTEXT_PACKAGE, config.LOCALE_DIR)
    gettext.textdomain(config.GETTEXT_PACKAGE)


def init_logging(logfile_name="kolibri-app.txt", level=logging.DEBUG):
    logging.basicConfig(level=level)

    from kolibri.utils.logger import KolibriTimedRotatingFileHandler

    log_dir = os.path.join(LOCAL_KOLIBRI_HOME, "logs")
    os.makedirs(log_dir, exist_ok=True)
    log_filename = os.path.join(log_dir, logfile_name)

    root_logger = logging.getLogger()
    file_handler = KolibriTimedRotatingFileHandler(
        filename=log_filename, when="midnight", backupCount=30
    )
    root_logger.addHandler(file_handler)


def get_current_language():
    try:
        translations = gettext.translation(
            config.GETTEXT_PACKAGE, localedir=config.LOCALE_DIR
        )
        locale_info = translations.info()
    except FileNotFoundError as e:
        logger.warning("Error loading translation file: %s", e)
        language = None
    else:
        language = locale_info.get("language")

    return language
