from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import uuid

import mock
from django.core.urlresolvers import reverse
from django.db.models import Q
from rest_framework.test import APITestCase

import kolibri.plugins.device.api
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
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


class DeviceChannelMetadataAPITestCase(APITestCase):
    """
    Testcase for channel API methods
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        self.facility, self.superuser = setup_device()
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)

    def test_channelmetadata_resource_info(self):
        ChannelMetadata.objects.all().update(total_resource_count=4, published_size=0)
        data = ChannelMetadata.objects.values()[0]
        c1_id = ContentNode.objects.get(title="c1").id
        ContentNode.objects.filter(pk=c1_id).update(available=False)
        get_params = {
            "include_fields": "total_resources,total_file_size,on_device_resources,on_device_file_size"
        }
        response = self.client.get(
            reverse(
                "kolibri:kolibri.plugins.device:device_channel-detail",
                kwargs={"pk": data["id"]},
            ),
            get_params,
        )
        # N.B. Because of our not very good fixture data, most of our content nodes are by default not renderable
        # Hence this will return 1 if everything is deduped properly.
        self.assertEqual(response.data["total_resources"], 1)
        self.assertEqual(response.data["total_file_size"], 0)
        self.assertEqual(response.data["on_device_resources"], 4)
        self.assertEqual(response.data["on_device_file_size"], 0)

    def test_channelmetadata_include_fields_filter_has_total_resources(self):
        # N.B. Because of our not very good fixture data, most of our content nodes are by default not renderable
        # Hence this will return 1 if everything is deduped properly.
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {"include_fields": "total_resources"},
        )
        self.assertEqual(response.data[0]["total_resources"], 1)

    def test_channelmetadata_include_fields_filter_has_total_file_size(self):
        LocalFile.objects.filter(
            files__contentnode__channel_id=self.the_channel_id
        ).update(file_size=1)
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {"include_fields": "total_file_size"},
        )
        self.assertEqual(response.data[0]["total_file_size"], 5)

    def test_channelmetadata_include_fields_filter_has_on_device_resources(self):
        ChannelMetadata.objects.all().update(total_resource_count=5)
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {"include_fields": "on_device_resources"},
        )
        self.assertEqual(response.data[0]["on_device_resources"], 5)

    def test_channelmetadata_include_fields_filter_has_on_device_file_size(self):
        ChannelMetadata.objects.all().update(published_size=4)
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {"include_fields": "on_device_file_size"},
        )
        self.assertEqual(response.data[0]["on_device_file_size"], 4)

    def test_channelmetadata_include_fields_filter_has_no_on_device_file_size(self):
        ChannelMetadata.objects.all().update(published_size=0)
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {
                "include_fields": "total_resources,total_file_size,on_device_resources,on_device_file_size"
            },
        )
        self.assertEqual(response.data[0]["on_device_file_size"], 0)

    @mock.patch.object(
        kolibri.plugins.device.api,
        "renderable_contentnodes_without_topics_q_filter",
        Q(kind="dummy"),
    )
    def test_channelmetadata_include_fields_filter_has_no_renderable_on_device_file_size(
        self,
    ):
        ChannelMetadata.objects.all().update(published_size=4)
        response = self.client.get(
            reverse("kolibri:kolibri.plugins.device:device_channel-list"),
            {"include_fields": "on_device_file_size"},
        )
        self.assertEqual(response.data[0]["on_device_file_size"], 4)


class CalculateImportExportSizeViewTestCase(APITestCase):
    """
    Testcase for channel API methods
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"

    def setUp(self):
        self.facility, self.superuser = setup_device()
        self.client.login(username=self.superuser.username, password=DUMMY_PASSWORD)
        LocalFile.objects.update(file_size=5)

    def test_all_nodes_present_studio(self):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        response = self.client.post(
            reverse("kolibri:kolibri.plugins.device:importexportsizeview"),
            data={"channel_id": self.the_channel_id},
            format="json",
        )
        self.assertEqual(response.data["resource_count"], 2)
        self.assertEqual(
            response.data["file_size"],
            sum(
                LocalFile.objects.filter(available=False).values_list(
                    "file_size", flat=True
                )
            ),
        )

    def test_include_nodes_studio(self):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        obj = ContentNode.objects.get(title="c2c1")
        response = self.client.post(
            reverse("kolibri:kolibri.plugins.device:importexportsizeview"),
            data={"channel_id": self.the_channel_id, "node_ids": [obj.id]},
            format="json",
        )
        self.assertEqual(response.data["resource_count"], 1)
        self.assertEqual(response.data["file_size"], obj.files.count() * 5)

    def test_include_exclude_nodes_studio(self):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        parent = ContentNode.objects.get(title="c2")
        obj = ContentNode.objects.get(title="c2c1")
        response = self.client.post(
            reverse("kolibri:kolibri.plugins.device:importexportsizeview"),
            data={
                "channel_id": self.the_channel_id,
                "node_ids": [parent.id],
                "exclude_node_ids": [obj.id],
            },
            format="json",
        )
        self.assertEqual(response.data["resource_count"], 0)
        self.assertEqual(response.data["file_size"], 0)

    def test_all_nodes_present_export(self):
        ContentNode.objects.update(available=True)
        LocalFile.objects.update(available=True)
        response = self.client.post(
            reverse("kolibri:kolibri.plugins.device:importexportsizeview"),
            data={"channel_id": self.the_channel_id, "export": True},
            format="json",
        )
        self.assertEqual(response.data["resource_count"], 2)
        self.assertEqual(
            response.data["file_size"],
            sum(
                LocalFile.objects.filter(available=True).values_list(
                    "file_size", flat=True
                )
            ),
        )

    def test_no_nodes_present_export(self):
        ContentNode.objects.update(available=False)
        LocalFile.objects.update(available=False)
        response = self.client.post(
            reverse("kolibri:kolibri.plugins.device:importexportsizeview"),
            data={"channel_id": self.the_channel_id, "export": True},
            format="json",
        )
        self.assertEqual(response.data["resource_count"], 0)
        self.assertEqual(response.data["file_size"], 0)
