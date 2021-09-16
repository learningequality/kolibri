from django.db.utils import OperationalError
from django.test import TestCase
from mock import Mock
from mock import patch

from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.upgrade import move_network_location_entries
from kolibri.deployment.default.sqlite_db_names import NETWORK_LOCATION


class TestNetworkLocationUpgrade(TestCase):
    multi_db = True

    def test_successful_move_locations(self):
        delete_mock = Mock()

        class ListWithDelete(list):
            delete = delete_mock

        locations = ListWithDelete([NetworkLocation(base_url="example.com")])
        with patch("kolibri.core.discovery.upgrade.NetworkLocation") as mock_model:
            mock_model.objects.using().all.return_value = locations
            move_network_location_entries()
            mock_model.objects.using(NETWORK_LOCATION).bulk_create.assert_called_with(
                locations
            )
        delete_mock.assert_called()

    def test_default_db_no_migration(self):
        try:
            move_network_location_entries()
        except OperationalError:
            self.fail(
                "Got an OperationalError while trying to upgrade NetworkLocation data"
            )
