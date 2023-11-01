"""
Subset of Users Device (SOUD) tests
"""
import uuid

from django.test import TestCase

from ..soud import Context
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import StaticNetworkLocation


class SoudContextTestCase(TestCase):
    def setUp(self):
        super(SoudContextTestCase, self).setUp()
        self.context = Context(uuid.uuid4().hex, uuid.uuid4().hex)

    def test_property__network_location(self):
        netloc = StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="kolibri",
            instance_id=self.context.instance_id,
        )
        self.assertEqual(self.context.network_location, netloc)

    def test_property__network_location__not_kolibri(self):
        StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.Okay,
            application="studio",
            instance_id=self.context.instance_id,
        )
        self.assertIsNone(self.context.network_location)

    def test_property__network_location__not_connected(self):
        StaticNetworkLocation.objects.create(
            base_url="https://kolibrihappyurl.qqq/",
            connection_status=ConnectionStatus.ConnectionFailure,
            application="kolibri",
            instance_id=self.context.instance_id,
        )
        self.assertIsNone(self.context.network_location)
