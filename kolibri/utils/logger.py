import logging
import os
from logging.handlers import TimedRotatingFileHandler


GET_FILES_TO_DELETE = "getFilesToDelete"
DO_ROLLOVER = "doRollover"

NO_FILE_BASED_LOGGING = os.environ.get("KOLIBRI_NO_FILE_BASED_LOGGING", False)


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


class FalseFilter(logging.Filter):
    """
    A filter that ignores everything, useful to create log config
    entries and inserting the actual filter later (when configuration is
    known)
    """

    def filter(self, record):
        return False


def get_require_debug_true(debug):
    class RequireDebugTrue(logging.Filter):
        """A copy from Django to avoid loading Django's settings stack"""

        def filter(self, record):
            return debug

    return RequireDebugTrue


def get_default_logging_config(LOG_ROOT, debug=False, debug_database=False):
    """
    A minimal logging config for just kolibri without any Django
    specific handlers or anything from kolibri.utils.conf.

    This is used in early logging stations, before and during
    configuration.
    """

    DEFAULT_HANDLERS = (
        ["console"] if NO_FILE_BASED_LOGGING else ["file", "console", "file_debug"]
    )

    # This is the general level
    DEFAULT_LEVEL = "INFO" if not debug else "DEBUG"
    DATABASE_LEVEL = "INFO" if not debug_database else "DEBUG"

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {"require_debug_true": {"()": FalseFilter}},  # Replaced later
        "formatters": {
            "verbose": {
                "format": "%(levelname)s %(asctime)s %(name)s %(process)d %(thread)d %(message)s"
            },
            "simple": {"format": "%(levelname)s %(message)s"},
            "simple_date": {"format": "%(levelname)s %(asctime)s %(name)s %(message)s"},
            "color": {
                "()": "colorlog.ColoredFormatter",
                "format": "%(log_color)s%(levelname)-8s %(message)s",
                "log_colors": {
                    "DEBUG": "blue",
                    "INFO": "white",
                    "WARNING": "yellow",
                    "ERROR": "red",
                    "CRITICAL": "bold_red",
                },
            },
        },
        "handlers": {
            "console": {
                "level": DEFAULT_LEVEL,
                "class": "logging.StreamHandler",
                "formatter": "color",
            },
            "file": {
                "level": "INFO",
                "filters": [],
                "class": "kolibri.utils.logger.KolibriTimedRotatingFileHandler",
                "filename": os.path.join(LOG_ROOT, "kolibri.txt"),
                "formatter": "simple_date",
                "when": "midnight",
                "backupCount": 30,
            },
            "file_debug": {
                "level": "DEBUG",
                "filters": ["require_debug_true"],
                "class": "logging.FileHandler",
                "filename": os.path.join(LOG_ROOT, "debug.txt"),
                "formatter": "simple_date",
            },
        },
        "loggers": {
            "kolibri": {
                "handlers": DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
                "propagate": False,
            },
            # For now, we do not fetch debugging output from this
            # We should introduce custom debug log levels or log
            # targets, i.e. --debug-level=high
            "kolibri.core.tasks.worker": {
                "handlers": DEFAULT_HANDLERS,
                "level": "INFO",
                "propagate": False,
            },
            "morango": {
                "handlers": DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
                "propagate": False,
            },
            "django": {
                "handlers": DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
                "propagate": False,
            },
            "django.db.backends": {
                "handlers": DEFAULT_HANDLERS,
                "level": DATABASE_LEVEL,
                "propagate": False,
            },
            "django.request": {
                "handlers": DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
                "propagate": False,
            },
            "django.template": {
                "handlers": DEFAULT_HANDLERS,
                # Django template debug is very noisy, only log INFO and above.
                "level": "INFO",
                "propagate": False,
            },
        },
    }


def get_base_logging_config(LOG_ROOT, debug=False, debug_database=False):
    """
    Returns configured instance of the logger. Why? Because
    kolibri.utils.conf and kolibri.utils.options need logging, too and
    have to call get_default_logging_config.
    """
    config = get_default_logging_config(
        LOG_ROOT, debug=debug, debug_database=debug_database
    )
    config["filters"]["require_debug_true"] = {"()": get_require_debug_true(debug)}

    return config


def get_logging_config(LOG_ROOT, debug=False, debug_database=False):
    """
    Returns a Django-specific set logging config. Namely, because one of
    the logging handlers and filters, ``mail_admins`` and
    ``require_debug_false`` both require the Django stack to be active.
    """
    config = get_base_logging_config(
        LOG_ROOT, debug=debug, debug_database=debug_database
    )

    config["filters"]["require_debug_false"] = {
        "()": "django.utils.log.RequireDebugFalse"
    }
    config["handlers"].update(
        {
            "mail_admins": {
                "level": "ERROR",
                "class": "django.utils.log.AdminEmailHandler",
                "filters": ["require_debug_false"],
            }
        }
    )
    # Add the mail_admins handler
    config["loggers"]["kolibri"]["handlers"].append("mail_admins")
    config["loggers"]["django"]["handlers"].append("mail_admins")
    config["loggers"]["django.request"]["handlers"].append("mail_admins")
    return config
