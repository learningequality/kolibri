"""
Tests for `kolibri.utils.main` module.
"""
from __future__ import absolute_import
from __future__ import print_function

import unittest

import pytest
from django.conf import settings
from django.db.utils import OperationalError
from mock import patch

import kolibri
from kolibri.utils import main


@pytest.mark.django_db
@patch("kolibri.utils.main._upgrades_after_django_setup")
@patch("kolibri.utils.main.get_version", return_value="")
@patch("kolibri.utils.main.update")
@patch("kolibri.core.deviceadmin.utils.dbbackup")
def test_first_run(dbbackup, update, get_version, upgrades_after_django_setup):
    """
    Tests that the first_run() function performs as expected
    """

    main.initialize()
    update.assert_called_once()
    dbbackup.assert_not_called()

    # Check that it got called for each default plugin
    from kolibri import plugins

    assert set(plugins.config["INSTALLED_PLUGINS"]) == set(plugins.DEFAULT_PLUGINS)


@pytest.mark.django_db
@patch("kolibri.utils.main._upgrades_after_django_setup")
@patch("kolibri.utils.main.get_version", return_value="0.0.1")
@patch("kolibri.utils.main.update")
def test_update(update, get_version, upgrades_after_django_setup):
    """
    Tests that update() function performs as expected
    """
    main.initialize()
    update.assert_called_once()


@pytest.mark.django_db
@patch("kolibri.utils.main.get_version", return_value="0.0.1")
def test_update_exits_if_running(get_version):
    """
    Tests that update() function performs as expected
    """
    with patch("kolibri.utils.main.get_status"):
        try:
            main.initialize()
            pytest.fail("Update did not exit when Kolibri was already running")
        except SystemExit:
            pass


@pytest.mark.django_db
def test_version_updated():
    """
    Tests our db backup logic: version_updated gets any change, backup gets only non-dev changes
    """
    assert main.version_updated("0.10.0", "0.10.1")
    assert not main.version_updated("0.10.0", "0.10.0")
    assert not main.should_back_up("0.10.0-dev0", "")
    assert not main.should_back_up("0.10.0-dev0", "0.10.0")
    assert not main.should_back_up("0.10.0", "0.10.0-dev0")
    assert not main.should_back_up("0.10.0-dev0", "0.10.0-dev0")


@pytest.mark.django_db
@unittest.skipIf(
    getattr(settings, "DATABASES")["default"]["ENGINE"] != "django.db.backends.sqlite3",
    "SQLite only test",
)
def test_conditional_backup():
    import os

    """
    Tests our db backup logic: conditional_backup, remove all backups
    """
    from kolibri.core.deviceadmin.utils import default_backup_folder

    default_path = default_backup_folder()
    if not os.path.exists(default_path):
        os.mkdir(default_path)

    from kolibri.core.deviceadmin.utils import dbbackup, get_backup_files

    # Making few backups
    dbbackup("0.11.0")
    dbbackup("0.11.1")
    dbbackup("0.11.2")
    dbbackup("0.11.3")
    dbbackup("0.11.4")
    dbbackup("0.13.1")
    dbbackup("0.13.2")
    dbbackup("0.13.3")
    dbbackup("0.13.4")
    dbbackup("0.13.5")

    # calling function for conditional backup
    main.conditional_backup("0.11.1", "0.15.3")

    backups_after = get_backup_files()
    # checking if delete is working properly in the conditional_backup
    assert len(backups_after) == 2
    assert "db-v0.15.3" in backups_after[0]


@pytest.mark.django_db
@patch("kolibri.utils.main._upgrades_after_django_setup")
@patch("kolibri.utils.main.get_version", return_value=kolibri.__version__)
@patch("kolibri.utils.main.update")
@patch("kolibri.core.deviceadmin.utils.dbbackup")
def test_update_no_version_change(
    dbbackup, update, get_version, upgrades_after_django_setup
):
    """
    Tests that when the version doesn't change, we are not doing things we
    shouldn't
    """
    main.initialize()
    update.assert_not_called()
    dbbackup.assert_not_called()


@patch("kolibri.utils.main._upgrades_after_django_setup")
@patch("kolibri.utils.main._migrate_databases")
@patch("kolibri.utils.main.version_updated")
def test_migrate_if_unmigrated(
    version_updated, _migrate_databases, _upgrades_after_django_setup
):
    # No matter what, ensure that version_updated returns False
    version_updated.return_value = False
    from morango.models import InstanceIDModel

    with patch.object(
        InstanceIDModel, "get_or_create_current_instance"
    ) as get_or_create_current_instance:
        get_or_create_current_instance.side_effect = OperationalError("Test")
        main.initialize()
        _migrate_databases.assert_called_once()
