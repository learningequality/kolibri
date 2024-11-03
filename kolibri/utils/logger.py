import logging
import os
from logging.handlers import QueueHandler
from logging.handlers import QueueListener
from logging.handlers import TimedRotatingFileHandler
from typing import Dict
from typing import List
from typing import Optional


GET_FILES_TO_DELETE = "getFilesToDelete"
DO_ROLLOVER = "doRollover"

NO_FILE_BASED_LOGGING = os.environ.get("KOLIBRI_NO_FILE_BASED_LOGGING", False)
DISABLE_REQUEST_LOGGING = os.environ.get("KOLIBRI_DISABLE_REQUEST_LOGGING", False)

LOG_COLORS = {
    "DEBUG": "blue",
    "INFO": "white",
    "WARNING": "yellow",
    "ERROR": "red",
    "CRITICAL": "bold_red",
}


# Type definition for mapping of logger names to their handlers
LoggerHandlerMap = Dict[str, List[logging.Handler]]


class LoggerAwareQueueHandler(QueueHandler):
    """
    A QueueHandler that adds the logger name to the record so that it
    can be properly handled in the listener.
    """

    def __init__(self, queue, logger_name: str):
        super().__init__(queue)
        self.logger_name = logger_name

    def prepare(self, record: logging.LogRecord) -> logging.LogRecord:
        """Prepare a record for queuing, ensuring it can be pickled if needed"""
        # Get Queue class at runtime to check if we need pickle safety
        from kolibri.utils.multiprocessing_compat import use_multiprocessing

        # Only do pickle-safety preparation for logging if we're using multiprocessing
        if use_multiprocessing():
            if hasattr(record, "exc_info") and record.exc_info:
                record.exc_text = (
                    logging.getLogger()
                    .handlers[0]
                    .formatter.formatException(record.exc_info)
                )
                record.exc_info = None
            if hasattr(record, "args"):
                record.args = tuple(str(arg) for arg in record.args)

        record = super().prepare(record)
        record._logger_name = self.logger_name
        return record


class LoggerAwareQueueListener(QueueListener):
    """A QueueListener that routes records to their original logger's handlers"""

    def __init__(self, queue, logger_handlers: LoggerHandlerMap):
        super().__init__(queue)
        self.logger_handlers = logger_handlers

    def handle(self, record: logging.LogRecord) -> None:
        """Handle a record by sending it to the original logger's handlers"""
        logger_name = getattr(record, "_logger_name", "")
        handlers = self.logger_handlers.get(logger_name, [])

        for handler in handlers:
            try:
                if record.levelno >= handler.level:
                    handler.handle(record)
            except Exception:
                handler.handleError(record)


class EncodingStreamHandler(logging.StreamHandler):
    """
    A custom stream handler that encodes the log message to the specified encoding.
    """

    terminator = "\n"

    def __init__(self, stream=None, encoding="utf-8"):
        super(EncodingStreamHandler, self).__init__(stream)
        self.encoding = encoding

    def emit(self, record):
        """
        Vendored and modified from:
        https://github.com/python/cpython/blob/main/Lib/logging/__init__.py#L1098
        """
        try:
            msg = self.format(record)
            stream = self.stream
            # issue 35046: merged two stream.writes into one.
            text = msg + self.terminator
            if self.encoding and hasattr(stream, "buffer"):
                bytes_to_write = text.encode(self.encoding)
                stream.buffer.write(bytes_to_write)
            else:
                stream.write(text)
            self.flush()
        except RuntimeError:  # See issue 36272
            raise
        except Exception:
            self.handleError(record)


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


class NoExceptionsFilter(logging.Filter):
    """
    A filter that ignores errors and critical messages, used to suppress
    error messages to stdout that are also being piped to stderr.
    """

    def filter(self, record):
        return record.levelno < logging.ERROR


def get_default_logging_config(LOG_ROOT, debug=False, debug_database=False):
    """
    A minimal logging config for just kolibri without any Django
    specific handlers or anything from kolibri.utils.conf.

    This is used in early logging stations, before and during
    configuration.
    """

    DEFAULT_HANDLERS = (
        ["console", "console-error"]
        if NO_FILE_BASED_LOGGING
        else ["file", "console", "console-error", "file_debug"]
    )

    # This is the general level
    DEFAULT_LEVEL = "INFO" if not debug else "DEBUG"
    DATABASE_LEVEL = "INFO" if not debug_database else "DEBUG"

    handlers = {
        "console-error": {
            "level": "ERROR",
            "class": "kolibri.utils.logger.EncodingStreamHandler",
            "formatter": "color",
            "stream": "ext://sys.stderr",
        },
        "console": {
            "level": DEFAULT_LEVEL,
            "filters": ["no_exceptions"],
            "class": "kolibri.utils.logger.EncodingStreamHandler",
            "formatter": "color",
            "stream": "ext://sys.stdout",
        },
    }

    if not NO_FILE_BASED_LOGGING:
        handlers["file"] = {
            "level": "INFO",
            "filters": [],
            "class": "kolibri.utils.logger.KolibriTimedRotatingFileHandler",
            "filename": os.path.join(LOG_ROOT, "kolibri.txt"),
            "formatter": "simple_date",
            "when": "midnight",
            "backupCount": 30,
            "encoding": "utf-8",
        }

        handlers["file_debug"] = {
            "level": "DEBUG",
            "filters": ["require_debug_true"],
            "class": "logging.FileHandler",
            "filename": os.path.join(LOG_ROOT, "debug.txt"),
            "formatter": "simple_date",
            "encoding": "utf-8",
        }

    return {
        "version": 1,
        "disable_existing_loggers": False,
        "filters": {
            "require_debug_true": {"()": FalseFilter},  # Replaced later
            "no_exceptions": {"()": NoExceptionsFilter},
        },
        "formatters": {
            "verbose": {
                "format": "%(levelname)s %(asctime)s %(name)s %(process)d %(thread)d %(message)s"
            },
            "simple_date": {"format": "%(levelname)s %(asctime)s %(name)s %(message)s"},
            "color": {
                "()": "colorlog.ColoredFormatter",
                "format": "%(log_color)s%(levelname)-8s %(asctime)s %(message)s",
                "log_colors": LOG_COLORS,
            },
        },
        "handlers": handlers,
        "loggers": {
            "": {
                "handlers": DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
            },
            "cherrypy.access": {
                "handlers": [] if DISABLE_REQUEST_LOGGING else DEFAULT_HANDLERS,
                "level": DEFAULT_LEVEL,
                "propagate": False,
            },
            # For now, we do not fetch debugging output from this
            # We should introduce custom debug log levels or log
            # targets, i.e. --debug-level=high
            "kolibri.core.tasks.worker": {
                "level": "INFO",
            },
            "django.db.backends": {
                "level": DATABASE_LEVEL,
            },
            "django.template": {
                # Django template debug is very noisy, only log INFO and above.
                "level": "INFO",
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
    filters = config.setdefault("filters", {})
    filters["require_debug_true"] = {"()": get_require_debug_true(debug)}

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

    filters = config.setdefault("filters", {})
    filters["require_debug_false"] = {"()": "django.utils.log.RequireDebugFalse"}

    handlers = config.setdefault("handlers", {})
    handlers.update(
        {
            "mail_admins": {
                "level": "ERROR",
                "class": "django.utils.log.AdminEmailHandler",
                "filters": ["require_debug_false"],
            }
        }
    )
    # Add the mail_admins handler
    loggers = config.setdefault("loggers", {})
    for name in ("kolibri", "django", "django.request"):
        admin_logger = loggers.setdefault(name, {})
        admin_logger_handlers = admin_logger.setdefault("handlers", [])
        admin_logger_handlers.append("mail_admins")
    return config


# Track if queue logging has been initialized for the current process
_queue_logging_initialized_for_process = False


class QueueLoggingInitializedError(RuntimeError):
    pass


def _replace_handlers_with_queue(queue) -> LoggerHandlerMap:
    """
    Internal function to replace all logger handlers with queue handlers.
    Returns a dict of the original logger handlers for the listener to consume.
    """
    global _queue_logging_initialized_for_process

    if _queue_logging_initialized_for_process:
        raise QueueLoggingInitializedError(
            "Queue logging has already been initialized for this process"
        )

    logger_handlers: LoggerHandlerMap = {}

    # Set up logging for all loggers
    for logger_name in list(logging.root.manager.loggerDict.keys()) + [""]:
        logger = logging.getLogger(logger_name)
        if logger.handlers:
            # Store the original handlers
            logger_handlers[logger_name] = logger.handlers[:]

            # Remove existing handlers
            for handler in logger.handlers[:]:
                logger.removeHandler(handler)

            # Add queue handler
            queue_handler = LoggerAwareQueueHandler(queue, logger_name)
            logger.addHandler(queue_handler)

    _queue_logging_initialized_for_process = True

    return logger_handlers


def setup_queue_logging() -> LoggerAwareQueueListener:
    """
    Sets up queue-based logging for the main process.
    Returns the queue listener which can be used to stop logging and clean up.
    """
    # Import Queue at function scope to avoid import order issues
    from kolibri.utils.multiprocessing_compat import Queue

    # Create queue using Kolibri's compatibility Queue
    log_queue = Queue()

    # Replace handlers and get original configurations
    logger_handlers = _replace_handlers_with_queue(log_queue)

    # Create and start listener with collected handlers
    listener = LoggerAwareQueueListener(log_queue, logger_handlers)
    listener.start()

    return listener


def setup_worker_logging(queue) -> None:
    """Sets up logging in a worker to use the queue if not already configured."""
    try:
        _replace_handlers_with_queue(queue)
    except QueueLoggingInitializedError:
        pass


def cleanup_queue_logging(listener: Optional[LoggerAwareQueueListener]) -> None:
    """
    Stops the queue listener and cleans up multiprocessing resources if needed.
    """
    if not listener:
        return

    # Stop the listener to ensure pending logs are processed
    listener.stop()

    # Clean up queue if it's a multiprocessing queue
    from kolibri.utils.multiprocessing_compat import use_multiprocessing

    if use_multiprocessing():
        try:
            listener.queue.close()
            listener.queue.join_thread()
        except (ValueError, AttributeError):
            pass
