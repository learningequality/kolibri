from unittest.mock import patch
from uuid import uuid4

from django.test import TestCase

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.plugins.user_profile.tasks import mergeuser


class MergeUserTaskTestCase(TestCase):
    @patch(
        "kolibri.core.auth.utils.sync.NetworkClient.discover_from_address",
        side_effect=NetworkLocationNotFound(),
    )
    def test_unreachable_peer_raises_network_client_error(self, mock_discover):
        local_user = FacilityUser.objects.create(
            username="local", facility=Facility.objects.create(name="local")
        )
        with self.assertRaisesMessage(
            NetworkClientError, "Unable to connect to: http://example.com/"
        ) as cm:
            mergeuser(
                "sync",
                local_user.id,
                baseurl="http://example.com/",
                facility=uuid4().hex,
                user=uuid4().hex,
            )
        self.assertIs(type(cm.exception), NetworkClientError)
        self.assertTrue(FacilityUser.objects.filter(id=local_user.id).exists())
