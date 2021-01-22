import logging

logger = logging.getLogger(__name__)

import gettext
import os

from pathlib import Path

from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.logger import KolibriTimedRotatingFileHandler

from . import config


KOLIBRI_APP_DEVELOPER_EXTRAS = os.environ.get("KOLIBRI_APP_DEVELOPER_EXTRAS")
KOLIBRI_USE_SYSTEM_INSTANCE = bool(os.environ.get("KOLIBRI_USE_SYSTEM_INSTANCE"))
XDG_CURRENT_DESKTOP = os.environ.get("XDG_CURRENT_DESKTOP")

if os.access(KOLIBRI_HOME, os.W_OK):
    KOLIBRI_LOGS_DIR = Path(KOLIBRI_HOME, "logs")
else:
    KOLIBRI_LOGS_DIR = Path.home().joinpath(".kolibri", "logs")


def init_gettext():
    gettext.bindtextdomain(config.GETTEXT_PACKAGE, config.LOCALE_DIR)
    gettext.textdomain(config.GETTEXT_PACKAGE)


def init_logging(logfile_name="kolibri-app.txt", level=logging.DEBUG):
    logging.basicConfig(level=level)

    KOLIBRI_LOGS_DIR.mkdir(parents=True, exist_ok=True)
    logfile_path = KOLIBRI_LOGS_DIR.joinpath(logfile_name)

    root_logger = logging.getLogger()
    file_handler = KolibriTimedRotatingFileHandler(
        filename=logfile_path.as_posix(), when="midnight", backupCount=30
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
