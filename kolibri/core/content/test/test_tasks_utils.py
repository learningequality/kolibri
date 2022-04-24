import uuid

import mock
from django.test import TestCase
from rest_framework import serializers

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.tasks_utils import add_drive_info
from kolibri.core.content.tasks_utils import get_channel_name
from kolibri.core.content.tasks_utils import validate_content_task
from kolibri.core.content.tasks_utils import validate_remote_import_task
from kolibri.core.discovery.models import NetworkLocation
from kolibri.utils import conf


class DummyRequest(object):
    user = None
    data = None


class AddDriveInfoTestCase(TestCase):
    def test_missing_drive_id(self):
        with self.assertRaises(serializers.ValidationError):
            task_data = {"datafolder": "test"}
            add_drive_info({}, task_data)

    def test_wrong_drive_id(self):
        with self.assertRaises(serializers.ValidationError):
            task_data = {"drive_id": "test", "datafolder": "test"}
            add_drive_info({}, task_data)

    @mock.patch("kolibri.core.content.tasks_utils.get_mounted_drive_by_id")
    def test_returns_updated_task(self, mock_get_mounted_drive_by_id):
        class drive(object):
            datafolder = "kolibri"

        mock_get_mounted_drive_by_id.return_value = drive

        task = {"drive_id": "something"}
        task_data = {"drive_id": "kolibri"}
        task_with_drive_info = add_drive_info(task, task_data)

        self.assertEqual(task, {"drive_id": "kolibri", "datafolder": "kolibri"})
        self.assertEqual(
            task_with_drive_info, {"drive_id": "kolibri", "datafolder": "kolibri"}
        )


class GetChannelNameTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="kolibri_le_root",
            channel_id=cls.channel_id,
            content_id=uuid.uuid4().hex,
        )
        cls.channel = ChannelMetadata.objects.create(
            id=cls.channel_id, name="kolibri_le", root=root
        )

    def test_missing_channel(self):
        with self.assertRaises(serializers.ValidationError):
            get_channel_name(uuid.uuid4().hex, require_channel=True)

        channel_name = get_channel_name(uuid.uuid4().hex, require_channel=False)
        self.assertEqual(channel_name, "")

    def test_returns_channel_name_when_channel_found(self):
        channel_name = get_channel_name(self.channel_id, require_channel=True)
        self.assertEqual(channel_name, "kolibri_le")

        channel_name = get_channel_name(self.channel_id, require_channel=False)
        self.assertEqual(channel_name, "kolibri_le")


class ValidateContentTaskTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

        cls.channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="kolibri_le_root",
            channel_id=cls.channel_id,
            content_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(id=cls.channel_id, name="kolibri_le", root=root)

    def setUp(self):
        self.dummy_request = DummyRequest()
        self.dummy_request.user = self.facility_user

    def test_missing_channel_id(self):
        with self.assertRaises(serializers.ValidationError):
            validate_content_task(self.dummy_request, {})

    def test_wrong_node_ids_type(self):
        with self.assertRaises(serializers.ValidationError):
            validate_content_task(self.dummy_request, {"node_ids": self.channel_id})

    def test_wrong_exclude_node_ids_type(self):
        with self.assertRaises(serializers.ValidationError):
            validate_content_task(
                self.dummy_request, {"exclude_node_ids": self.channel_id}
            )

    def test_returns_right_data(self):
        task_data = {
            "channel_id": "test",
            "channel_name": "test",
            "node_ids": ["test"],
            "exclude_node_ids": ["test"],
        }
        validated_task_data = validate_content_task(self.dummy_request, task_data)

        # The `task_data` is already correct so no changes should've been made.
        self.assertEqual(
            validated_task_data,
            {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
                "started_by": self.dummy_request.user.pk,
                "started_by_username": self.dummy_request.user.username,
            },
        )

        task_data = {
            "channel_id": self.channel_id,
            "node_ids": ["test"],
        }
        validated_task_data = validate_content_task(self.dummy_request, task_data)

        # Do we return task content data as expected?
        self.assertEqual(
            validated_task_data,
            {
                "channel_id": self.channel_id,
                "channel_name": "kolibri_le",
                "node_ids": ["test"],
                "exclude_node_ids": None,
                "started_by": self.dummy_request.user.pk,
                "started_by_username": self.dummy_request.user.username,
            },
        )


class ValidateRemoteImportTaskTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

        cls.network_location_id = uuid.uuid4().hex
        NetworkLocation.objects.create(
            id=cls.network_location_id, base_url="http://test.org"
        )

    def setUp(self):
        self.dummy_request = DummyRequest()
        self.dummy_request.user = self.facility_user

    def test_wrong_peer_id(self):
        with self.assertRaises(serializers.ValidationError):
            task_data = {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
                "peer_id": uuid.uuid4().hex,
            }
            validate_remote_import_task(self.dummy_request, task_data)

    def test_no_peer_id(self):
        validated_data = validate_remote_import_task(
            self.dummy_request,
            {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
            },
        )

        self.assertEqual(
            validated_data,
            {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
                "baseurl": conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"],
                "peer_id": None,
                "started_by": self.dummy_request.user.pk,
                "started_by_username": self.dummy_request.user.username,
            },
        )

    def test_correct_peer_id(self):
        validated_data = validate_remote_import_task(
            self.dummy_request,
            {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
                "peer_id": self.network_location_id,
            },
        )

        self.assertEqual(
            validated_data,
            {
                "channel_id": "test",
                "channel_name": "test",
                "node_ids": ["test"],
                "exclude_node_ids": ["test"],
                "baseurl": "http://test.org",
                "peer_id": self.network_location_id,
                "started_by": self.dummy_request.user.pk,
                "started_by_username": self.dummy_request.user.username,
            },
        )
