import os
import tempfile
from contextlib import contextmanager

from kolibri.core.tasks.utils import db_connection
from kolibri.utils.tests.helpers import override_option


@contextmanager
def connection():
    fd, filepath = tempfile.mkstemp()
    with override_option("Tasks", "JOB_STORAGE_FILEPATH", filepath):
        engine = db_connection()
        yield engine
        engine.dispose()
        os.close(fd)
        try:
            os.remove(filepath)
        except OSError:
            # Don't fail test because of difficulty cleaning up.
            pass
