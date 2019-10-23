from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import random
import tempfile

import pytest
from django.conf import settings
from django.core.management import call_command
from django.test.utils import override_settings
from mock import patch

import kolibri
from kolibri.core.auth.constants.collection_kinds import FACILITY
from kolibri.core.deviceadmin.management.commands.dbrestore import CommandError
from kolibri.core.deviceadmin.utils import dbbackup
from kolibri.core.deviceadmin.utils import dbrestore
from kolibri.core.deviceadmin.utils import default_backup_folder
from kolibri.core.deviceadmin.utils import get_dtm_from_backup_name
from kolibri.core.deviceadmin.utils import IncompatibleDatabase
from kolibri.core.deviceadmin.utils import search_latest
from kolibri.utils.server import NotRunning
from kolibri.utils.server import STATUS_UNKNOWN

MOCK_DATABASES = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": ":memory:",
        "OPTIONS": {"timeout": 100},
    }
}

MOCK_DATABASES_FILE = {
    "default": {
        "ENGINE": "django.db.backends.sqlite3",
        "NAME": os.path.join(
            tempfile.mkdtemp(), "test{}.db".format(random.randint(0, 100000))
        ),
        "OPTIONS": {"timeout": 100},
    }
}


def is_sqlite_settings():
    """
    This does not work during pytest collection, needs to be called while
    executing tests!
    """
    return "sqlite3" in settings.DATABASES["default"]["ENGINE"]


def mock_status_not_running():
    raise NotRunning(STATUS_UNKNOWN)


def test_latest():

    with pytest.raises(CommandError):
        call_command("dbrestore", "-l")


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
        return_value=(12345, "http://127.0.0.1", 1234),
    ) as gs:
        with pytest.raises(SystemExit):
            call_command("dbrestore", "-l")
            gs.assert_called_once()


def test_inactive_kolibri():
    """
    Tests that we cannot restore while kolibri is active
    """

    with patch(
        "kolibri.utils.server.get_status", side_effect=mock_status_not_running
    ) as gs:
        # Since there's no backups available during a test, this should fail!
        with pytest.raises(CommandError):
            call_command("dbrestore", "-l")
            gs.assert_called_once()


def test_not_sqlite():
    if is_sqlite_settings():
        return
    with pytest.raises(IncompatibleDatabase):
        dbrestore("/doesnt/matter.file")


def test_fail_on_unknown_file():
    with pytest.raises(ValueError):
        get_dtm_from_backup_name("this-file-has-no-time")


@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:Overriding setting DATABASES")
def test_restore_from_latest():
    """
    Tests that we cannot restore while kolibri is active
    """
    if not is_sqlite_settings():
        return
    with patch("kolibri.utils.server.get_status", side_effect=mock_status_not_running):
        # Create something special in the database!
        from kolibri.core.auth.models import Facility

        Facility.objects.create(name="test latest", kind=FACILITY)
        # Create a backup file from the current test database
        call_command("dbbackup")

        # Also add in a file with an old time stamp to ensure its ignored
        sql = "syntax error;"
        fbroken = "db-v{}_2015-08-02_00-00-00.dump".format(kolibri.__version__)
        open(os.path.join(default_backup_folder(), fbroken), "w").write(sql)

        # Add an unparsable file name
        fbroken = "db-v{}_.dump".format(kolibri.__version__)
        open(os.path.join(default_backup_folder(), fbroken), "w").write(sql)

        # Restore it into a new test database setting
        with override_settings(DATABASES=MOCK_DATABASES):
            from django import db

            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            call_command("dbrestore", "-l")
            # Test that the user has been restored!
            assert (
                Facility.objects.filter(name="test latest", kind=FACILITY).count() == 1
            )


@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:Overriding setting DATABASES")
def test_restore_from_file_to_memory():
    """
    Restores from a file dump to a database stored in memory and reads contents
    from the new database.
    """
    if not is_sqlite_settings():
        return
    with patch("kolibri.utils.server.get_status", side_effect=mock_status_not_running):
        # Create something special in the database!
        from kolibri.core.auth.models import Facility

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
            call_command("dbrestore", backup)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test file", kind=FACILITY).count() == 1


@pytest.mark.django_db
@pytest.mark.filterwarnings("ignore:Overriding setting DATABASES")
def test_restore_from_file_to_file():
    """
    Restores from a file dump to a database stored in a file and reads contents
    from the new database.
    """
    if not is_sqlite_settings():
        return
    with patch("kolibri.utils.server.get_status", side_effect=mock_status_not_running):
        # Create something special in the database!
        from kolibri.core.auth.models import Facility

        Facility.objects.create(name="test file", kind=FACILITY)
        # Create a backup file from the current test database
        dest_folder = tempfile.mkdtemp()
        # Purposefully destroy the connection pointer, which is the default
        # state of an unopened connection
        from django import db

        db.connections["default"].connection = None
        backup = dbbackup(kolibri.__version__, dest_folder=dest_folder)

        # Restore it into a new test database setting
        with override_settings(DATABASES=MOCK_DATABASES_FILE):
            # Destroy current connections and create new ones:
            db.connections.close_all()
            db.connections = db.ConnectionHandler()
            # Purposefully destroy the connection pointer, which is the default
            # state of an unopened connection
            db.connections["default"].connection = None
            call_command("dbrestore", backup)
            # Test that the user has been restored!
            assert Facility.objects.filter(name="test file", kind=FACILITY).count() == 1


def test_search_latest():

    search_root = tempfile.mkdtemp()

    major_version = ".".join(map(str, kolibri.VERSION[:2]))

    files = [
        "db-v{}_2015-08-02_00-00-00.dump".format(kolibri.__version__),
        "db-v{}_2016-08-02_00-00-00.dump".format(kolibri.__version__),
        "db-v{}_2017-07-02_00-00-00.dump".format(major_version),
        "db-v{}_2017-08-02_00-00-00.dump".format(kolibri.__version__),
    ]

    latest = files[-1]

    for f in files:
        open(os.path.join(search_root, f), "w").write("")

    __, search_fname = os.path.split(search_latest(search_root, major_version))
    assert search_fname == latest
