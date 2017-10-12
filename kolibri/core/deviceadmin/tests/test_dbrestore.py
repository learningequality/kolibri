from __future__ import absolute_import, print_function, unicode_literals

import os
import random
import tempfile

import kolibri
import pytest
from django.conf import settings
from django.core.management import call_command
from django.test.utils import override_settings
from kolibri.auth.constants.collection_kinds import FACILITY
from kolibri.core.deviceadmin.management.commands.dbrestore import CommandError
from kolibri.core.deviceadmin.utils import IncompatibleDatabase, dbbackup, dbrestore
from kolibri.utils.server import STATUS_UNKNOWN, NotRunning
from mock import patch

MOCK_DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': ":memory:",
        'OPTIONS': {
            'timeout': 100,
        }
    }
}

MOCK_DATABASES_FILE = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': os.path.join(tempfile.mkdtemp(), "test{}.db".format(random.randint(0, 100000))),
        'OPTIONS': {
            'timeout': 100,
        }
    }
}


def is_sqlite_settings():
    """
    This does not work during pytest collection, needs to be called while
    executing tests!
    """
    return 'sqlite3' in settings.DATABASES['default']['ENGINE']


def mock_status_not_running():
    raise NotRunning(STATUS_UNKNOWN)


def test_latest():

    with pytest.raises(RuntimeError):
        call_command("dbrestore", latest=True)


def test_illegal_command():

    with pytest.raises(CommandError):
        call_command("dbrestore", latest=True, dump_file="wup wup")


def test_no_restore_from_no_file():

    with pytest.raises(CommandError):
        call_command("dbrestore", dump_file="does not exist")


def test_active_kolibri():
    """
    Tests that we cannot restore while kolibri is active
    """

    with patch(
        "kolibri.utils.server.get_status",
        return_value=(12345, "http://127.0.0.1", 1234)
    ) as gs:
        with pytest.raises(SystemExit):
            call_command("dbrestore", latest=True)
            gs.assert_called_once()


def test_inactive_kolibri():
    """
    Tests that we cannot restore while kolibri is active
    """

    with patch(
        "kolibri.utils.server.get_status",
        side_effect=mock_status_not_running
    ) as gs:
        # Since there's no backups available during a test, this should fail!
        with pytest.raises(RuntimeError):
            call_command("dbrestore", latest=True)
            gs.assert_called_once()


def test_not_sqlite():
    if is_sqlite_settings():
        return
    with pytest.raises(IncompatibleDatabase):
        dbrestore("/doesnt/matter.file")


@pytest.mark.django_db
@pytest.mark.filterwarnings('ignore:Overriding setting DATABASES')
def test_restore_from_latest():
    """
    Tests that we cannot restore while kolibri is active
    """
    if not is_sqlite_settings():
        return
    with patch(
        "kolibri.utils.server.get_status",
        side_effect=mock_status_not_running
    ):
        # Create something special in the database!
        from kolibri.auth.models import Facility
        Facility.objects.create(name="test latest", kind=FACILITY)
        # Create a backup file from the current test database
        call_command("dbbackup")

        # Restore it into a new test database setting
        with override_settings(DATABASES=MOCK_DATABASES):
            from django import db
            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            call_command("dbrestore", latest=True)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test latest", kind=FACILITY).count() == 1


@pytest.mark.django_db
@pytest.mark.filterwarnings('ignore:Overriding setting DATABASES')
def test_restore_from_file_to_memory():
    """
    Restores from a file dump to a database stored in memory and reads contents
    from the new database.
    """
    if not is_sqlite_settings():
        return
    with patch(
        "kolibri.utils.server.get_status",
        side_effect=mock_status_not_running
    ):
        # Create something special in the database!
        from kolibri.auth.models import Facility
        Facility.objects.create(name="test file", kind=FACILITY)
        # Create a backup file from the current test database
        dest_folder = tempfile.mkdtemp()
        backup = dbbackup(kolibri.__version__, dest_folder=dest_folder)

        # Restore it into a new test database setting
        with override_settings(DATABASES=MOCK_DATABASES):
            from django import db
            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            call_command("dbrestore", dump_file=backup)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test file", kind=FACILITY).count() == 1


@pytest.mark.django_db
@pytest.mark.filterwarnings('ignore:Overriding setting DATABASES')
def test_restore_from_file_to_file():
    """
    Restores from a file dump to a database stored in a file and reads contents
    from the new database.
    """
    if not is_sqlite_settings():
        return
    with patch(
        "kolibri.utils.server.get_status",
        side_effect=mock_status_not_running
    ):
        # Create something special in the database!
        from kolibri.auth.models import Facility
        Facility.objects.create(name="test file", kind=FACILITY)
        # Create a backup file from the current test database
        dest_folder = tempfile.mkdtemp()
        backup = dbbackup(kolibri.__version__, dest_folder=dest_folder)

        # Restore it into a new test database setting
        with override_settings(DATABASES=MOCK_DATABASES_FILE):
            from django import db
            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            call_command("dbrestore", dump_file=backup)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test file", kind=FACILITY).count() == 1
