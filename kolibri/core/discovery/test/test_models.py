from django.test import TestCase

from ..models import ConnectionStatus
from ..models import DynamicNetworkLocation
from ..models import LocationTypes
from ..models import NetworkLocation
from ..models import StaticNetworkLocation


class NetworkLocationTestCase(TestCase):
    databases = "__all__"

    def test_property__available(self):
        location = NetworkLocation()
        self.assertFalse(location.available)
        location.connection_status = ConnectionStatus.Okay
        self.assertFalse(location.available)
        location.base_url = "https://kolibrihappyurl.qqq/"
        self.assertTrue(location.available)
        location.connection_status = ConnectionStatus.ConnectionFailure
        self.assertFalse(location.available)

    def test_property__is_kolibri(self):
        location = NetworkLocation()
        self.assertFalse(location.is_kolibri)
        location.application = "kdp"
        self.assertFalse(location.is_kolibri)
        location.application = "kolibri"
        self.assertTrue(location.is_kolibri)

    def test_property__reserved(self):
        static = StaticNetworkLocation()
        self.assertFalse(static.reserved)
        dynamic = DynamicNetworkLocation()
        self.assertFalse(dynamic.reserved)
        reserved = NetworkLocation(location_type=LocationTypes.Reserved)
        self.assertTrue(reserved.reserved)
