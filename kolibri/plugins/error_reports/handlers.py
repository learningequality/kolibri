import json
import logging
import os
import re
import sys
import time
import traceback
from copy import deepcopy
from functools import lru_cache

if sys.version_info < (3, 10):
    from importlib_metadata import distributions
else:
    from importlib.metadata import distributions

import kolibri
from kolibri.utils import conf

from .constants import BACKEND
from .constants import TASK
from .models import ErrorReport
from .serializers import bounded_json_or_none
from .serializers import MAX_ERROR_MESSAGE_LENGTH
from .serializers import MAX_TRACEBACK_LENGTH
from .utils.request import extract_request_info
from .utils.scrubber import scrub_data

logger = logging.getLogger(__name__)

REQUEST_START_TIME_KEY = "kolibri.request_start_time"

# The directory containing the kolibri package, for relativizing in-app
# stack frame filenames so that they are stable across installations.
KOLIBRI_PARENT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(kolibri.__file__)))

# Cap on captured stack frames - deep stacks (usually recursion errors)
# would otherwise bloat the report context. The outermost and innermost
# frames are kept, as the middle of a deep stack is the least informative.
MAX_STACK_FRAMES = 100

MAX_JOB_DATA_SIZE = 16 * 1024


def get_server_info(request):
    return {"host": request.get_host(), "port": request.get_port()}


# The installed packages can only change with a restart, so enumerate
# them once rather than on every captured error.
@lru_cache(maxsize=1)
def get_packages():
    return [f"{dist.metadata['Name']}=={dist.version}" for dist in distributions()]


def get_python_version():
    return ".".join(str(v) for v in sys.version_info[:3])


def relativize_filename(filename):
    """
    Strip the absolute install path from a stack frame filename so that error
    reports - submitted off-device - never leak the deployment's directory
    layout, which can contain a username or other host-specific paths. Kolibri's
    own files become 'kolibri/...'; third-party files installed in a packages
    root become their package-relative path (e.g. 'django/core/handlers.py');
    anything else (standard library, unusual locations) falls back to its
    basename.
    """
    normalized = filename.replace(os.sep, "/")
    # Frames inside an installed package: show the path relative to the packages
    # root. Covers both Kolibri and third-party deps in a pip install.
    for marker in ("/site-packages/", "/dist-packages/"):
        index = normalized.rfind(marker)
        if index != -1:
            return normalized[index + len(marker) :]
    # Source checkout / bundled deps: relative to the kolibri package parent.
    try:
        relative = os.path.relpath(filename, KOLIBRI_PARENT_DIR).replace(os.sep, "/")
    except ValueError:
        # On Windows, relpath raises for paths on different drives
        return os.path.basename(filename)
    if not relative.startswith(".."):
        return relative
    # Standard library or anything outside the app: keep only the basename.
    return os.path.basename(filename)


# Matches the filename inside a formatted-traceback frame line: File "<path>".
_TRACEBACK_FILE_RE = re.compile(r'File "([^"]+)"')


def scrub_traceback_paths(text):
    """
    Relativize the absolute filenames in a formatted traceback string, so the
    raw traceback kept alongside the structured frames does not leak host paths.
    """
    if not text:
        return text
    return _TRACEBACK_FILE_RE.sub(
        lambda match: f'File "{relativize_filename(match.group(1))}"', text
    )


_MEDIA_USER_RE = re.compile(r"((?:/run)?/media/)[^/\s'\"]+")

_WINDOWS_PATH_RE = re.compile(r"[A-Za-z]:\\|\\\\")


def _host_path_prefixes():
    prefixes = [(conf.KOLIBRI_HOME, "$KOLIBRI_HOME"), (os.path.expanduser("~"), "~")]
    return sorted(
        (
            (path, placeholder)
            for path, placeholder in prefixes
            if path and os.path.dirname(path) != path
        ),
        key=lambda prefix: len(prefix[0]),
        reverse=True,
    )


def scrub_host_paths(text):
    """
    Replace the Kolibri home directory, the user's home directory and the
    user segment of removable media mounts in free text such as exception
    messages, where they often reveal a username.
    """
    if not text:
        return text
    for path, placeholder in _host_path_prefixes():
        # OSError messages repr their filenames, doubling Windows backslashes,
        # and Windows paths are case-insensitive.
        forms = (re.escape(path.replace("\\", "\\\\")), re.escape(path))
        flags = re.IGNORECASE if _WINDOWS_PATH_RE.match(path) else 0
        pattern = rf"(?:{'|'.join(forms)})(?![\w.-])"
        text = re.sub(pattern, placeholder, text, flags=flags)
    return _MEDIA_USER_RE.sub(r"\1<user>", text)


def get_stack_frames(tb):
    """
    Extract structured stack frames from a traceback object, in the shape
    needed to construct a Sentry-compatible stacktrace. Filenames are
    relativized (see relativize_filename) so they are stable across
    installations and never leak absolute host paths; Kolibri's own frames are
    additionally marked in_app.
    """
    return [
        _frame(summary.filename, summary.name, summary.lineno)
        for summary in _capped(traceback.extract_tb(tb))
    ]


_TRACEBACK_FRAME_RE = re.compile(
    r'^\s*File "([^"]+)", line (\d+), in (.+)$', re.MULTILINE
)


def get_traceback_frames(text):
    """
    Extract structured stack frames, like get_stack_frames, from formatted
    traceback text - for task failures, which store only the text. Only the
    last traceback is read: it is the raised exception's, after any chained
    ones.
    """
    last = (text or "").rsplit("Traceback (most recent call last):", 1)[-1]
    return [
        _frame(filename, function.strip(), int(lineno))
        for filename, lineno, function in _capped(_TRACEBACK_FRAME_RE.findall(last))
    ]


def _capped(frames):
    if len(frames) > MAX_STACK_FRAMES:
        return frames[: MAX_STACK_FRAMES // 2] + frames[-MAX_STACK_FRAMES // 2 :]
    return frames


def _frame(filename, function, lineno):
    filename = relativize_filename(filename)
    in_app = filename.startswith("kolibri/") and not filename.startswith(
        "kolibri/dist/"
    )
    return {
        "filename": filename,
        "function": function,
        "lineno": lineno,
        "in_app": in_app,
    }


def get_request_time_to_error(request):
    start_time = getattr(request, "environ", {}).get(REQUEST_START_TIME_KEY)
    if start_time is None:
        return None
    return time.monotonic() - start_time


def mark_request_start(sender, environ=None, **kwargs):
    """
    Signal handler for django.core.signals.request_started.

    Records the time at which request handling began, so that the time
    to error can be calculated if an exception occurs.
    """
    if environ is not None:
        environ[REQUEST_START_TIME_KEY] = time.monotonic()


def handle_request_exception(sender, request=None, **kwargs):
    """
    Signal handler for django.core.signals.got_request_exception.

    This is sent for any unhandled exception during request processing,
    and is dispatched from within the except block, so the exception is
    available from sys.exc_info().
    """
    exc_type, exc_value, exc_tb = sys.exc_info()
    if exc_type is None:
        return
    try:
        # A Sentry-event-shaped context, so the telemetry server can re-report
        # it into Sentry with minimal mapping (the same shape the frontend
        # submits). Built inside the guard below - extracting the request,
        # enumerating packages and formatting the stack can all fail.
        context = {
            "platform": "python",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": exc_type.__name__,
                        "value": scrub_host_paths(str(exc_value))[
                            :MAX_ERROR_MESSAGE_LENGTH
                        ],
                        "mechanism": {"type": "django", "handled": False},
                        "stacktrace": {"frames": get_stack_frames(exc_tb)},
                    }
                ]
            },
            # Raw traceback text, kept for the telemetry server alongside the
            # structured frames. Paths are scrubbed so it does not leak the
            # host's absolute install paths.
            "traceback": scrub_host_paths(
                scrub_traceback_paths(traceback.format_exc())
            )[:MAX_TRACEBACK_LENGTH],
            "contexts": {
                "runtime": {"name": "python", "version": get_python_version()}
            },
            "request": extract_request_info(request),
            "server": get_server_info(request),
            "packages": get_packages(),
        }
        request_time = get_request_time_to_error(request)
        if request_time is not None:
            context["avg_request_time_to_error"] = request_time
        logger.debug("Saving error report to the database.")
        ErrorReport.insert_or_update_error(BACKEND, context)
    except Exception:
        # Catch everything - got_request_exception receivers are dispatched
        # without a guard, so anything raised here (including while building
        # the context above) would escape Django's exception handling and
        # replace the 500 response entirely.
        logger.exception("Error occurred while saving error report to the database.")


def _bounded(value, empty):
    value = bounded_json_or_none(value)
    if value is None or len(json.dumps(value)) > MAX_JOB_DATA_SIZE:
        return empty
    return value


def _exception_message(task_traceback, exception_name):
    exception_line = re.compile(rf"^(?:[\w.]+\.)?{re.escape(exception_name)}(?:: |$)")
    lines = task_traceback.rstrip().splitlines()
    for index in range(len(lines) - 1, -1, -1):
        match = exception_line.match(lines[index])
        if match:
            message = "\n".join([lines[index][match.end() :], *lines[index + 1 :]])
            return message[:MAX_ERROR_MESSAGE_LENGTH]
    return ""


def handle_task_failure(job, orm_job):
    """
    Called by the task JobHook when a job has failed, recording the
    failed task with its job and worker context.

    Note that job.exception is the exception class name - tasks store
    their exceptions as strings, so the stack frames are parsed back out of
    the text traceback, which is recorded too.
    """
    try:
        task_traceback = scrub_host_paths(scrub_traceback_paths(job.traceback)) or ""
        # A Sentry-event-shaped context, like the request and frontend paths.
        context = {
            "platform": "python",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": job.exception,
                        "value": _exception_message(task_traceback, job.exception),
                        "mechanism": {"type": "task", "handled": False},
                        "stacktrace": {"frames": get_traceback_frames(job.traceback)},
                    }
                ]
            },
            "traceback": task_traceback[:MAX_TRACEBACK_LENGTH],
            "contexts": {
                "runtime": {"name": "python", "version": get_python_version()}
            },
            "job_info": {
                "job_id": job.job_id,
                "func": job.func,
                "facility_id": job.facility_id,
                "args": _bounded(job.args, []),
                "kwargs": _bounded(job.kwargs, {}),
                "progress": job.progress,
                "total_progress": job.total_progress,
                "extra_metadata": _bounded(job.extra_metadata, {}),
            },
            "worker_info": {
                "worker_process": orm_job.worker_process,
                "worker_thread": orm_job.worker_thread,
                "worker_extra": orm_job.worker_extra,
            },
            "packages": get_packages(),
        }
        # Task args, kwargs and metadata can carry credentials, and the report
        # is submitted off-device - scrub sensitive values as the request path
        # does. Scrub a deep copy so the live job's args/kwargs (referenced
        # directly above) are not mutated.
        context = deepcopy(context)
        scrub_data(context)
        ErrorReport.insert_or_update_error(TASK, context)
    except Exception:
        # Catch everything - this runs as an on_commit callback of the job's
        # state update, and Django propagates an exception raised there to
        # the task worker that made the update, skipping any later callbacks.
        logger.exception("Error occurred while saving error report to the database.")
