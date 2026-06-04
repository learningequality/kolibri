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

from .constants import BACKEND
from .constants import TASK
from .models import ErrorReport
from .models import MAX_ERROR_MESSAGE_LENGTH
from .models import MAX_TRACEBACK_LENGTH
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


def get_server_info(request):
    return {"host": request.get_host(), "port": request.get_port()}


# The installed packages can only change with a restart, so enumerate
# them once rather than on every captured error.
@lru_cache(maxsize=1)
def get_packages():
    packages = [f"{dist.metadata['Name']}=={dist.version}" for dist in distributions()]
    return packages


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
        lambda match: 'File "{}"'.format(relativize_filename(match.group(1))), text
    )


def get_stack_frames(tb):
    """
    Extract structured stack frames from a traceback object, in the shape
    needed to construct a Sentry-compatible stacktrace. Filenames are
    relativized (see relativize_filename) so they are stable across
    installations and never leak absolute host paths; Kolibri's own frames are
    additionally marked in_app.
    """
    summaries = traceback.extract_tb(tb)
    if len(summaries) > MAX_STACK_FRAMES:
        summaries = (
            summaries[: MAX_STACK_FRAMES // 2] + summaries[-MAX_STACK_FRAMES // 2 :]
        )
    frames = []
    for summary in summaries:
        filename = relativize_filename(summary.filename)
        in_app = filename.startswith("kolibri/") and not filename.startswith(
            "kolibri/dist/"
        )
        frames.append(
            {
                "filename": filename,
                "function": summary.name,
                "lineno": summary.lineno,
                "in_app": in_app,
            }
        )
    return frames


def get_request_time_to_error(request):
    start_time = getattr(request, "environ", {}).get(REQUEST_START_TIME_KEY)
    if start_time is None:
        return None
    return time.time() - start_time


def mark_request_start(sender, environ=None, **kwargs):
    """
    Signal handler for django.core.signals.request_started.

    Records the time at which request handling began, so that the time
    to error can be calculated if an exception occurs.
    """
    if environ is not None:
        environ[REQUEST_START_TIME_KEY] = time.time()


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
    logger.error("Unexpected Error", exc_info=(exc_type, exc_value, exc_tb))
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
                        "value": str(exc_value)[:MAX_ERROR_MESSAGE_LENGTH],
                        "mechanism": {"type": "django", "handled": False},
                        "stacktrace": {"frames": get_stack_frames(exc_tb)},
                    }
                ]
            },
            # Raw traceback text, kept for the telemetry server alongside the
            # structured frames. Paths are scrubbed so it does not leak the
            # host's absolute install paths.
            "traceback": scrub_traceback_paths(traceback.format_exc())[
                :MAX_TRACEBACK_LENGTH
            ],
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
        logger.error(
            "Error occurred while saving error report to the database.", exc_info=True
        )


def handle_task_failure(job, orm_job):
    """
    Called by the task JobHook when a job has failed, recording the
    failed task with its job and worker context.

    Note that job.exception is the exception class name - tasks store
    their exceptions as strings, so no structured stack frames are
    available here; the text traceback is recorded instead.
    """
    try:
        # A Sentry-event-shaped context, like the request and frontend paths.
        # Tasks store their exception as the class name string and have no
        # structured frames, so the value carries the class name and the raw
        # traceback text is kept for the server and for the report identity.
        context = {
            "platform": "python",
            "level": "error",
            "exception": {
                "values": [
                    {
                        "type": job.exception,
                        "value": job.exception,
                        "mechanism": {"type": "task", "handled": False},
                        "stacktrace": {"frames": []},
                    }
                ]
            },
            "traceback": scrub_traceback_paths(job.traceback),
            "contexts": {
                "runtime": {"name": "python", "version": get_python_version()}
            },
            "job_info": {
                "job_id": job.job_id,
                "func": job.func,
                "facility_id": job.facility_id,
                "args": job.args,
                "kwargs": job.kwargs,
                "progress": job.progress,
                "total_progress": job.total_progress,
                "extra_metadata": job.extra_metadata,
            },
            "worker_info": {
                "worker_host": orm_job.worker_host,
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
        # Catch everything - the JobHook is dispatched inside the jobs
        # database transaction, so anything raised here would roll back
        # the job's state update.
        logger.error(
            "Error occurred while saving error report to the database.", exc_info=True
        )
