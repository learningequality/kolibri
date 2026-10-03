import errno
import logging
import os
import shutil
import threading
from unittest.mock import patch

import pytest

from kolibri.utils import migration_lock as migration_lock_module
from kolibri.utils.migration_lock import migration_lock
from kolibri.utils.migration_lock import MIGRATION_LOCK_FILE
from kolibri.utils.migration_lock import MigrationLockTimeout


def _clear_lock_file():
    if os.path.isdir(MIGRATION_LOCK_FILE):
        shutil.rmtree(MIGRATION_LOCK_FILE, ignore_errors=True)
    elif os.path.exists(MIGRATION_LOCK_FILE):
        os.remove(MIGRATION_LOCK_FILE)


@pytest.fixture(autouse=True)
def no_lock_file():
    _clear_lock_file()
    yield
    _clear_lock_file()


def _acquire_in_another_thread():
    acquired = threading.Event()

    def acquire():
        with migration_lock():
            acquired.set()

    threading.Thread(target=acquire, daemon=True).start()
    return acquired


def test_waits_for_the_holder_to_release_the_lock(caplog):
    with caplog.at_level(logging.INFO, logger="kolibri.utils.migration_lock"):
        with migration_lock():
            acquired = _acquire_in_another_thread()
            assert not acquired.wait(0.5)
        assert acquired.wait(5)
    assert "Waiting for another Kolibri process" in caplog.text


def test_gives_up_once_the_holder_keeps_the_lock_past_the_timeout():
    outcomes = []

    def contend():
        try:
            with migration_lock():
                outcomes.append("acquired")
        except MigrationLockTimeout as e:
            outcomes.append(e)

    with patch.object(migration_lock_module, "MIGRATION_LOCK_TIMEOUT", 0.01):
        with migration_lock():
            contender = threading.Thread(target=contend, daemon=True)
            contender.start()
            contender.join(5)

    assert len(outcomes) == 1, outcomes
    assert isinstance(outcomes[0], MigrationLockTimeout)
    assert MIGRATION_LOCK_FILE in outcomes[0].args


def test_releases_the_lock_on_exit():
    with migration_lock():
        pass
    assert _acquire_in_another_thread().wait(5)


def test_propagates_an_eacces_from_the_body_and_releases_the_lock():
    with pytest.raises(PermissionError):
        with migration_lock():
            raise PermissionError(errno.EACCES, "raised by a migration")
    assert _acquire_in_another_thread().wait(5)


@pytest.mark.skipif(not hasattr(os, "fork"), reason="Requires fork")
def test_takes_the_lock_from_a_process_that_died_holding_it():
    pid = os.fork()
    if pid == 0:
        with migration_lock():
            os._exit(0)
    os.waitpid(pid, 0)
    assert _acquire_in_another_thread().wait(5)


def test_runs_unlocked_when_a_directory_occupies_the_lock_file_path():
    os.makedirs(MIGRATION_LOCK_FILE)
    ran = False
    with migration_lock():
        ran = True
    assert ran
