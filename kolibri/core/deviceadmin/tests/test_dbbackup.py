from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import os
import tempfile

import pytest
from django.core.management import call_command
from mock import patch

from kolibri.core.deviceadmin.tests.test_dbrestore import is_sqlite_settings
from kolibri.core.deviceadmin.tests.test_dbrestore import mock_status_not_running
from kolibri.core.deviceadmin.utils import dbbackup
from kolibri.core.deviceadmin.utils import IncompatibleDatabase


def test_active_kolibri():
    """
    Tests that we cannot restore while kolibri is active
    """

    with patch(
        "kolibri.utils.server.get_status",
        return_value=(12345, "http://127.0.0.1", 1234),
    ) as gs:
        with pytest.raises(SystemExit):
            call_command("dbbackup")
            gs.assert_called_once()


def test_inactive_kolibri():
    """
    Tests that if kolibri is inactive, a dump is created
    """
    if not is_sqlite_settings():
        return

    dest_folder = tempfile.mkdtemp()

    with patch(
        "kolibri.utils.server.get_status", side_effect=mock_status_not_running
    ) as gs:
        # Since there's no backups available during a test, this should fail!
        assert not os.listdir(dest_folder)
        call_command("dbbackup", dest_folder=dest_folder)
        gs.assert_called_once()
        files = os.listdir(dest_folder)
        assert len(files) == 1
        assert os.path.getsize(os.path.join(dest_folder, files[0])) > 1000


def test_not_sqlite():
    if is_sqlite_settings():
        return
    with pytest.raises(IncompatibleDatabase):
        dbbackup("/doesnt/matter.file")
