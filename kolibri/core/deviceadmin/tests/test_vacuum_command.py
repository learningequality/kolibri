from unittest import mock

from django.core.management import call_command
from django.db import DEFAULT_DB_ALIAS
from django.test import SimpleTestCase


@mock.patch("kolibri.core.deviceadmin.management.commands.vacuum.perform_vacuum")
class VacuumCommandTestCase(SimpleTestCase):
    def test_vacuums_default_database(self, perform_vacuum):
        call_command("vacuum")
        perform_vacuum.assert_called_once_with(DEFAULT_DB_ALIAS, False)

    def test_full_is_a_flag(self, perform_vacuum):
        call_command("vacuum", "--full")
        perform_vacuum.assert_called_once_with(DEFAULT_DB_ALIAS, True)
