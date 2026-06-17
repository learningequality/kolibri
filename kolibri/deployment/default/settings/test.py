import os
import tempfile

# If KOLIBRI_HOME isn't defined in the test env, it's okay to just set a
# temp directory for testing.
if "KOLIBRI_HOME" not in os.environ:
    os.environ["KOLIBRI_HOME"] = tempfile.mkdtemp()


from .base import *  # noqa isort:skip @UnusedWildImport

try:
    process_cache = CACHES["process_cache"]  # noqa F405
except KeyError:
    process_cache = None

# Create a dummy cache for each cache
CACHES = {
    key: {"BACKEND": "django.core.cache.backends.dummy.DummyCache"}
    for key in CACHES  # noqa F405
}

if process_cache:
    CACHES["process_cache"] = process_cache

TESTING = True

# MD5 over the default PBKDF2: its many rounds dominate user creation and login
# in tests for no benefit. The integration tests set passwords in-process but
# verify them in a spawned server running base settings (PBKDF2), so an md5$
# hash there fails to verify - leave the default hashers in that case.
if not os.environ.get("INTEGRATION_TEST"):
    PASSWORD_HASHERS = ["django.contrib.auth.hashers.MD5PasswordHasher"]

# Kolibri's default logging writes to rotating files on disk; in tests that
# I/O happens on every log record across thousands of tests for no benefit.
# Keep console output at WARNING (so errors still surface) but drop the file
# handlers. Tests that specifically exercise logging reinstate the real
# config locally (see test_handler.py, test_cli.py).
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "formatters": {"simple": {"format": "%(levelname)s %(name)s: %(message)s"}},
    "handlers": {
        "console": {
            "class": "logging.StreamHandler",
            "formatter": "simple",
            "level": "WARNING",
        }
    },
    "root": {"handlers": ["console"], "level": "WARNING"},
}
