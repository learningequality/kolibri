from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

from django.core.urlresolvers import reverse
from rest_framework.test import APITestCase

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.device.models import DevicePermissions

DUMMY_PASSWORD = "password"


class ChannelOrderTestCase(APITestCase):

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        self.facility, self.superuser = setup_device()
        self.learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        self.learner.set_password(DUMMY_PASSWORD)
        self.learner.save()
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        channel.root.available = True
        channel.root.save()
        self.url = reverse("kolibri:kolibri.plugins.device:devicechannelorder")

    def test_learner_cannot_post(self):
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, [], format="json")
        self.assertEqual(response.status_code, 403)

    def test_can_manage_content_can_post(self):
        DevicePermissions.objects.create(user=self.learner, can_manage_content=True)
        self.client.login(username=self.learner.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, [], format="json")
        self.assertNotEqual(response.status_code, 403)

    def test_superuser_can_post(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, [], format="json")
        self.assertNotEqual(response.status_code, 403)

    def test_error_wrong_number_of_uuids(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.post(
            self.url, [self.the_channel_id, uuid.uuid4().hex], format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_error_invalid_uuid(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, ["test"], format="json")
        self.assertEqual(response.status_code, 400)

    def test_error_not_array(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, {}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_set_order_one(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        response = self.client.post(self.url, [self.the_channel_id], format="json")
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(channel.order, 1)

    def test_set_order_two(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        new_channel_id = uuid.uuid4().hex
        new_channel = ChannelMetadata.objects.create(
            id=new_channel_id,
            name="Test",
            root=ContentNode.objects.create(
                title="test",
                id=uuid.uuid4().hex,
                channel_id=new_channel_id,
                content_id=uuid.uuid4().hex,
                available=True,
            ),
        )
        response = self.client.post(
            self.url, [self.the_channel_id, new_channel.id], format="json"
        )
        self.assertEqual(response.status_code, 200)
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        new_channel.refresh_from_db()
        self.assertEqual(channel.order, 1)
        self.assertEqual(new_channel.order, 2)

    def test_set_order_two_one_unavailable(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        new_channel_id = uuid.uuid4().hex
        new_channel = ChannelMetadata.objects.create(
            id=new_channel_id,
            name="Test",
            root=ContentNode.objects.create(
                title="test",
                id=uuid.uuid4().hex,
                channel_id=new_channel_id,
                content_id=uuid.uuid4().hex,
                available=False,
            ),
        )
        response = self.client.post(
            self.url, [self.the_channel_id, new_channel.id], format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_set_order_two_reorder(self):
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        new_channel_id = uuid.uuid4().hex
        new_channel = ChannelMetadata.objects.create(
            id=new_channel_id,
            name="Test",
            root=ContentNode.objects.create(
                title="test",
                id=uuid.uuid4().hex,
                channel_id=new_channel_id,
                content_id=uuid.uuid4().hex,
                available=True,
            ),
            order=1,
        )
        channel = ChannelMetadata.objects.get(id=self.the_channel_id)
        channel.order = 2
        channel.save()
        response = self.client.post(
            self.url, [self.the_channel_id, new_channel.id], format="json"
        )
        self.assertEqual(response.status_code, 200)
        new_channel.refresh_from_db()
        channel.refresh_from_db()
        self.assertEqual(channel.order, 1)
        self.assertEqual(new_channel.order, 2)
