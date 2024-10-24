import mock
from django.test import TestCase

from ..models import ConnectionStatus
from ..models import LocationTypes
from ..models import NetworkLocation
from ..utils.network import errors
from ..utils.network.client import NetworkClient
from ..utils.network.connections import capture_connection_state
from ..utils.network.connections import update_network_location
from .helpers import info as mock_device_info
from .helpers import mock_response
from kolibri.core.auth.models import Facility


class BaseTestCase(TestCase):
    databases = "__all__"

    def setUp(self):
        self.mock_location = mock.MagicMock(
            spec=NetworkLocation(),
            id="mock_location_id",
            instance_id=None,
            connection_status=ConnectionStatus.Unknown,
            connection_faults=0,
            reserved=False,
        )


class CaptureConnectionStateTestCase(BaseTestCase):
    def test_okay(self):
        with capture_connection_state(self.mock_location):
            self.assertEqual(
                self.mock_location.connection_status, ConnectionStatus.Unknown
            )

        self.assertEqual(self.mock_location.connection_status, ConnectionStatus.Okay)
        self.assertEqual(self.mock_location.connection_faults, 0)

    def test_connection_failure(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationConnectionFailure()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.ConnectionFailure
        )
        self.assertEqual(self.mock_location.connection_faults, 1)

    def test_connection_failure__from_not_found(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationNotFound()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.ConnectionFailure
        )
        self.assertEqual(self.mock_location.connection_faults, 1)

    def test_response_failure(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationResponseFailure()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.ResponseFailure
        )
        self.assertEqual(self.mock_location.connection_faults, 1)

    def test_response_timeout(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationResponseTimeout()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.ResponseTimeout
        )
        self.assertEqual(self.mock_location.connection_faults, 1)

    def test_invalid_response(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationInvalidResponse()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.InvalidResponse
        )
        self.assertEqual(self.mock_location.connection_faults, 1)

    def test_conflict(self):
        with capture_connection_state(self.mock_location):
            raise errors.NetworkLocationConflict()

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.Conflict
        )
        self.assertEqual(self.mock_location.connection_faults, 1)


class UpdateNetworkLocationTestCase(BaseTestCase):
    def setUp(self):
        super(UpdateNetworkLocationTestCase, self).setUp()
        build_from_network_location_patcher = mock.patch.object(
            NetworkClient, "build_from_network_location"
        )
        self.mock_build_from_network_location = (
            build_from_network_location_patcher.start()
        )
        self.addCleanup(build_from_network_location_patcher.stop)

        self.mock_client = mock.MagicMock(
            spec=NetworkClient("http://url.qqq"),
            base_url="http://url.qqq",
            remote_ip="192.168.101.101",
            device_info=dict(subset_of_users_device=False, **mock_device_info),
        )
        self.mock_client.__enter__.return_value = self.mock_client
        self.mock_build_from_network_location.return_value = self.mock_client

    def test_okay(self):
        update_network_location(self.mock_location)

        self.mock_build_from_network_location.assert_called_once_with(
            self.mock_location
        )

        self.assertEqual(self.mock_location.base_url, "http://url.qqq")
        self.assertEqual(self.mock_location.last_known_ip, "192.168.101.101")
        self.assertEqual(
            self.mock_location.application, mock_device_info.get("application")
        )
        self.assertEqual(
            self.mock_location.device_name, mock_device_info.get("device_name")
        )
        self.assertEqual(
            self.mock_location.instance_id, mock_device_info.get("instance_id")
        )
        self.assertEqual(
            self.mock_location.operating_system,
            mock_device_info.get("operating_system"),
        )
        self.assertEqual(
            self.mock_location.kolibri_version, mock_device_info.get("kolibri_version")
        )
        self.assertEqual(self.mock_location.connection_status, ConnectionStatus.Okay)
        self.assertEqual(self.mock_location.connection_faults, 0)

    def test_okay__dynamic(self):
        self.mock_location.location_type = LocationTypes.Dynamic
        update_network_location(self.mock_location)
        self.assertNotEqual(self.mock_location.last_known_ip, "192.168.101.101")

    def test_okay__static(self):
        self.mock_location.location_type = LocationTypes.Static
        update_network_location(self.mock_location)
        self.assertEqual(self.mock_location.last_known_ip, "192.168.101.101")
        self.assertTrue(self.mock_location.is_local)

    def test_connect__connection_failure(self):
        self.mock_location.connection_faults = 0
        self.mock_client.connect.side_effect = errors.NetworkLocationConnectionFailure()

        update_network_location(self.mock_location)

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.ConnectionFailure
        )
        self.assertEqual(self.mock_location.connection_faults, 1)
        self.assertNotEqual(self.mock_location.base_url, "http://url.qqq")

    def test_conflict__instance_id(self):
        self.mock_location.instance_id = "b" * 32
        update_network_location(self.mock_location)

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.Conflict
        )
        self.assertEqual(self.mock_location.connection_faults, 1)
        self.assertNotEqual(self.mock_location.base_url, "http://url.qqq")

    def test_conflict__facility_mismatch(self):
        self.mock_location.connection_status = ConnectionStatus.Conflict
        response = mock_response(200)
        self.mock_client.get.return_value = response
        response.json.return_value = [{"id": "b" * 32}]

        update_network_location(self.mock_location)

        self.assertEqual(
            self.mock_location.connection_status, ConnectionStatus.Conflict
        )
        self.assertEqual(self.mock_location.connection_faults, 1)
        self.assertNotEqual(self.mock_location.base_url, "http://url.qqq")

    def test_conflict_resolution__facility_matching(self):
        facility = Facility.objects.create(name="Test")

        self.mock_location.connection_status = ConnectionStatus.Conflict
        response = mock_response(200)
        self.mock_client.get.return_value = response
        response.json.return_value = [{"id": facility.id}]

        update_network_location(self.mock_location)

        self.assertEqual(self.mock_location.connection_status, ConnectionStatus.Okay)
        self.assertEqual(self.mock_location.connection_faults, 0)
        self.assertEqual(self.mock_location.base_url, "http://url.qqq")
