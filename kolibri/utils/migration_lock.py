import errno
import logging
import os
import time
from contextlib import contextmanager
from contextlib import ExitStack

from kolibri.utils.conf import KOLIBRI_HOME

logger = logging.getLogger(__name__)

MIGRATION_LOCK_FILE = os.path.join(KOLIBRI_HOME, "migration.lock")

MIGRATION_LOCK_TIMEOUT = 30 * 60

POLL_INTERVAL = 1


class MigrationLockTimeout(Exception):
    pass


if os.name == "posix":
    import fcntl

    HELD_ERRNOS = (errno.EACCES, errno.EAGAIN)

    def _try_lock(fileno):
        fcntl.flock(fileno, fcntl.LOCK_EX | fcntl.LOCK_NB)

    def _unlock(fileno):
        fcntl.flock(fileno, fcntl.LOCK_UN)


else:
    import msvcrt

    HELD_ERRNOS = (errno.EACCES, errno.EDEADLOCK)

    def _locking(fileno, mode):
        os.lseek(fileno, 0, os.SEEK_SET)
        msvcrt.locking(fileno, mode, 1)

    def _try_lock(fileno):
        _locking(fileno, msvcrt.LK_NBLCK)

    def _unlock(fileno):
        # Closing a handle releases its locks only once the OS gets round to it,
        # so Microsoft recommends unlocking explicitly:
        # https://learn.microsoft.com/en-us/windows/win32/api/fileapi/nf-fileapi-lockfileex
        _locking(fileno, msvcrt.LK_UNLCK)


def _lock_exclusively(fileno):
    deadline = time.monotonic() + MIGRATION_LOCK_TIMEOUT
    waiting = False
    while True:
        try:
            _try_lock(fileno)
            return
        except OSError as e:
            if e.errno not in HELD_ERRNOS:
                raise
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise MigrationLockTimeout(MIGRATION_LOCK_FILE)
        if not waiting:
            logger.info(
                "Waiting for another Kolibri process to finish updating the database"
            )
            waiting = True
        time.sleep(min(POLL_INTERVAL, remaining))


@contextmanager
def migration_lock():
    with ExitStack() as stack:
        try:
            fileno = stack.enter_context(open(MIGRATION_LOCK_FILE, "a")).fileno()
            _lock_exclusively(fileno)
            stack.callback(_unlock, fileno)
        except OSError:
            logger.warning(
                "Could not take the migration lock at %s, continuing without it",
                MIGRATION_LOCK_FILE,
                exc_info=True,
            )
        yield
