import os
import re
from logging import Formatter
from logging.handlers import TimedRotatingFileHandler

GET_FILES_TO_DELETE = "getFilesToDelete"
DO_ROLLOVER = "doRollover"


class KolibriTimedRotatingFileHandler(TimedRotatingFileHandler):
    """
    A custom TimedRotatingFileHandler that overrides two methods, getFilesToDelete
    and doRollover, to rename the rotation files from KOLIBRI_HOME/logs/kolibri.txt.YYYY-MM-DD
    to KOLIBRI_HOME/logs/archive/KOLIBRI-YYYY-MM-DD.txt.
    The original code is here: https://github.com/python/cpython/blob/2.7/Lib/logging/handlers.py#L162
    """

    def __init__(self, *args, **kwargs):
        super(KolibriTimedRotatingFileHandler, self).__init__(*args, **kwargs)
        dirname, basename = os.path.split(self.baseFilename)
        archive_dir = os.path.join(dirname, "archive")

        # Define attributes for this custom handler class
        self.dirname = dirname
        self.basename = basename
        self.archive_dir = archive_dir

    def getFilesToDelete(self):
        """
        Overriding the original getFilesToDelete method because the names of
        rotation files have been changed in doRollover method.
        """
        # If the archive directory does not exist, it means that there are no
        # rotation files
        if not os.path.exists(self.archive_dir):
            return []

        filenames = os.listdir(self.archive_dir)
        prefix = self.basename.split(".")[0] + "-"

        # Find all the rotation files in the KOLIBRI_HOME/logs/archive directory
        result = self._rotation_files(filenames, prefix, GET_FILES_TO_DELETE)
        result.sort()

        if len(result) < self.backupCount:
            result = []
        else:
            result = result[: len(result) - self.backupCount]
        return result

    def doRollover(self):
        """
        Overriding the original doRollover method so that the rotation files will
        be renamed from KOLIBRI_HOME/logs/kolibri.txt.YYYY-MM-DD to
        KOLIBRI_HOME/logs/archive/KOLIBRI-YYYY-MM-DD.txt.
        """
        super(KolibriTimedRotatingFileHandler, self).doRollover()
        filenames = os.listdir(self.dirname)
        prefix = self.basename + "."

        # Find all the rotation files in the KOLIBRI_HOME/logs directory and rename
        # them.
        if not os.path.exists(self.archive_dir):
            os.mkdir(self.archive_dir)
        self._rotation_files(filenames, prefix)

    def _rotation_files(self, filenames, prefix, func=DO_ROLLOVER):
        result = []
        plen = len(prefix)

        for filename in filenames:
            if filename[:plen] != prefix:
                continue

            rollover_time = filename[plen:].split(".")[0]
            if not self.extMatch.match(rollover_time):
                continue

            if func == GET_FILES_TO_DELETE:
                # Get the set of rotation files if the method is called from getFilesToDelete().
                result.append(os.path.join(self.archive_dir, filename))
            else:
                # Rename the rotation files if the method is called from doRollover().
                logname, ext = self.basename.split(".")
                new_name = logname + "-" + rollover_time + "." + ext
                destination_filename = os.path.join(self.archive_dir, new_name)
                source_filename = os.path.join(self.dirname, filename)
                os.rename(source_filename, destination_filename)

        return result


class KolibriLogFileFormatter(Formatter):
    """
    A custom Formatter to change the format string of Cherrypy logging messages.
    """

    def format(self, record):
        if "cherrypy" in record.name:
            # Remove the timestamp from Cherrypy logging so that the message only contains one timestamp.
            record.msg = re.sub(r"\[[^)]*\]\s", "", record.msg)
            # Change the format string for Cherrypy logging messages from %module(_cplogging) to %name.
            record.module = record.name

        message = super(KolibriLogFileFormatter, self).format(record)
        return message


def get_base_logging_config(LOG_ROOT):
    """
    A minimal logging config for just kolibri without any Django specific handlers
    """
    return {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "verbose": {
                "format": "%(levelname)s %(asctime)s %(module)s %(process)d %(thread)d %(message)s"
            },
            "simple": {"format": "%(levelname)s %(message)s"},
            "simple_date": {
                "format": "%(levelname)s %(asctime)s %(module)s %(message)s"
            },
            "simple_date_file": {
                "()": "kolibri.utils.logger.KolibriLogFileFormatter",
                "format": "%(levelname)s %(asctime)s %(module)s %(message)s",
            },
            "color": {
                "()": "colorlog.ColoredFormatter",
                "format": "%(log_color)s%(levelname)-8s %(message)s",
                "log_colors": {
                    "DEBUG": "bold_black",
                    "INFO": "white",
                    "WARNING": "yellow",
                    "ERROR": "red",
                    "CRITICAL": "bold_red",
                },
            },
        },
        "handlers": {
            "console": {
                "level": "INFO",
                "class": "logging.StreamHandler",
                "formatter": "color",
            },
            "file": {
                "level": "INFO",
                "filters": [],
                "class": "kolibri.utils.logger.KolibriTimedRotatingFileHandler",
                "filename": os.path.join(LOG_ROOT, "kolibri.txt"),
                "formatter": "simple_date_file",
                "when": "midnight",
                "backupCount": 30,
            },
        },
        "loggers": {
            "kolibri": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False,
            },
            "iceqube": {
                "handlers": ["file", "console"],
                "level": "INFO",
                "propagate": False,
            },
            "morango": {
                "handlers": ["file", "console"],
                "level": "INFO",
                "propagate": False,
            },
            "cherrypy.access": {
                "handlers": ["file", "console"],
                "level": "INFO",
                "propagate": False,
            },
            "cherrypy.error": {
                "handlers": ["file", "console"],
                "level": "INFO",
                "propagate": False,
            },
            "cherrypy": {
                "handlers": ["file", "console"],
                "level": "INFO",
                "propagate": False,
            },
        },
    }


def get_logging_config(LOG_ROOT):
    config = get_base_logging_config(LOG_ROOT)
    config["filters"] = {
        "require_debug_true": {"()": "django.utils.log.RequireDebugTrue"},
        "require_debug_false": {"()": "django.utils.log.RequireDebugFalse"},
    }
    config["handlers"].update(
        {
            "mail_admins": {
                "level": "ERROR",
                "class": "django.utils.log.AdminEmailHandler",
                "filters": ["require_debug_false"],
            },
            "request_debug": {
                "level": "ERROR",
                "class": "logging.StreamHandler",
                "formatter": "color",
                "filters": ["require_debug_true"],
            },
            "file_debug": {
                "level": "DEBUG",
                "filters": ["require_debug_true"],
                "class": "logging.FileHandler",
                "filename": os.path.join(LOG_ROOT, "debug.txt"),
                "formatter": "simple_date",
            },
        }
    )
    config["loggers"].update(
        {
            "kolibri": {
                "handlers": ["console", "mail_admins", "file", "file_debug"],
                "level": "INFO",
                "propagate": False,
            },
            "django": {"handlers": ["console", "file"], "propagate": False},
            "django.request": {
                "handlers": ["mail_admins", "file", "request_debug"],
                "level": "ERROR",
                "propagate": False,
            },
        }
    )
    return config
