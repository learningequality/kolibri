import uuid

import mock
from django.test import TestCase
from rest_framework import serializers

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.tasks import AutomaticDownloadValidator
from kolibri.core.content.tasks import ChannelResourcesValidator
from kolibri.core.content.tasks import ChannelValidator
from kolibri.core.content.tasks import enqueue_automatic_resource_import_if_needed
from kolibri.core.content.tasks import LocalChannelImportValidator
from kolibri.core.content.tasks import RemoteChannelImportValidator
from kolibri.core.discovery.models import NetworkLocation
from kolibri.utils import conf


class ValidateContentTaskTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.channel_id = uuid.uuid4().hex
        root = ContentNode.objects.create(
            id=uuid.uuid4().hex,
            title="kolibri_le_root",
            channel_id=cls.channel_id,
            content_id=uuid.uuid4().hex,
        )
        ChannelMetadata.objects.create(id=cls.channel_id, name="kolibri_le", root=root)

    def test_missing_channel_id(self):
        with self.assertRaises(serializers.ValidationError):
            ChannelValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotecontentimport",
                    "channel_name": "test",
                }
            ).is_valid(raise_exception=True)

    def test_invalid_channel_id(self):
        with self.assertRaises(serializers.ValidationError):
            ChannelValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotechannelimport",
                    "channel_id": "test",
                    "channel_name": "test",
                }
            ).is_valid(raise_exception=True)

    def test_missing_channel_name(self):
        with self.assertRaises(serializers.ValidationError):
            ChannelValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotechannelimport",
                    "channel_id": self.channel_id,
                }
            ).is_valid(raise_exception=True)

    def test_wrong_node_ids_type(self):
        with self.assertRaises(serializers.ValidationError):
            ChannelResourcesValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotechannelimport",
                    "channel_id": self.channel_id,
                    "channel_name": "test",
                    "node_ids": ["test"],
                }
            ).is_valid(raise_exception=True)

    def test_wrong_exclude_node_ids_type(self):
        with self.assertRaises(serializers.ValidationError):
            ChannelResourcesValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotechannelimport",
                    "channel_id": self.channel_id,
                    "channel_name": "test",
                    "exclude_node_ids": ["test"],
                }
            ).is_valid(raise_exception=True)

    def test_returns_right_data(self):
        include_id = uuid.uuid4().hex
        exclude_id = uuid.uuid4().hex

        validator = ChannelResourcesValidator(
            data={
                "type": "kolibri.core.content.tasks.remotechannelimport",
                "channel_id": self.channel_id,
                "channel_name": "test",
                "node_ids": [include_id],
                "exclude_node_ids": [exclude_id],
            }
        )
        validator.is_valid(raise_exception=True)

        # The `task_data` is already correct so no changes should've been made.
        self.assertEqual(
            validator.validated_data,
            {
                "args": [self.channel_id],
                "enqueue_args": {},
                "kwargs": {
                    "exclude_node_ids": [exclude_id],
                    "node_ids": [include_id],
                },
                "extra_metadata": {
                    "channel_id": self.channel_id,
                    "channel_name": "test",
                },
            },
        )


class ValidateRemoteImportTaskTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="pytest_facility")
        cls.facility_user = FacilityUser.objects.create(
            username="pytest_user", facility=cls.facility
        )

        cls.network_location = NetworkLocation.objects.create(
            base_url="http://test.org"
        )

    def test_wrong_peer_id(self):
        with self.assertRaises(serializers.ValidationError):
            RemoteChannelImportValidator(
                data={
                    "type": "kolibri.core.content.tasks.remotechannelimport",
                    "channel_id": uuid.uuid4().hex,
                    "channel_name": "test",
                    "peer": "test",
                }
            ).is_valid(raise_exception=True)

    @mock.patch("kolibri.core.content.tasks.NetworkClient")
    def test_no_peer_id(self, network_client_mock):
        channel_id = uuid.uuid4().hex
        validator = RemoteChannelImportValidator(
            data={
                "type": "kolibri.core.content.tasks.remotechannelimport",
                "channel_id": channel_id,
                "channel_name": "test",
            }
        )

        network_client_mock.build_for_address.return_value.base_url = conf.OPTIONS[
            "Urls"
        ]["CENTRAL_CONTENT_BASE_URL"]

        validator.is_valid(raise_exception=True)

        self.assertEqual(
            validator.validated_data,
            {
                "args": [channel_id],
                "enqueue_args": {},
                "extra_metadata": {
                    "channel_id": channel_id,
                    "channel_name": "test",
                    "peer_id": None,
                },
                "kwargs": {
                    "baseurl": conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"],
                    "peer_id": None,
                },
            },
        )

    @mock.patch("kolibri.core.content.tasks.NetworkClient")
    def test_correct_peer_id(self, network_client_mock):
        channel_id = uuid.uuid4().hex
        validator = RemoteChannelImportValidator(
            data={
                "type": "kolibri.core.content.tasks.remotechannelimport",
                "channel_id": channel_id,
                "channel_name": "test",
                "peer": self.network_location.id,
            }
        )
        network_client_mock.build_for_address.return_value.base_url = (
            self.network_location.base_url
        )

        validator.is_valid(raise_exception=True)

        self.assertEqual(
            validator.validated_data,
            {
                "args": [channel_id],
                "enqueue_args": {},
                "extra_metadata": {
                    "channel_id": channel_id,
                    "channel_name": "test",
                    "peer_id": self.network_location.id,
                },
                "kwargs": {
                    "baseurl": self.network_location.base_url,
                    "peer_id": self.network_location.id,
                },
            },
        )


class ValidateLocalImportTaskTestCase(TestCase):
    def test_wrong_drive_id(self):
        with self.assertRaises(serializers.ValidationError):
            LocalChannelImportValidator(
                data={
                    "type": "kolibri.core.content.tasks.localchannelimport",
                    "channel_id": uuid.uuid4().hex,
                    "channel_name": "test",
                    "drive_id": "test",
                }
            ).is_valid(raise_exception=True)

    def test_no_drive_id(self):
        with self.assertRaises(serializers.ValidationError):
            LocalChannelImportValidator(
                data={
                    "type": "kolibri.core.content.tasks.localchannelimport",
                    "channel_id": uuid.uuid4().hex,
                    "channel_name": "test",
                }
            ).is_valid(raise_exception=True)

    @mock.patch("kolibri.core.content.tasks.get_mounted_drive_by_id")
    def test_correct_peer_id(self, mock_get_mounted_drive_by_id):
        channel_id = uuid.uuid4().hex
        drive_id = "test_id"
        validator = LocalChannelImportValidator(
            data={
                "type": "kolibri.core.content.tasks.localchannelimport",
                "channel_id": channel_id,
                "channel_name": "test",
                "drive_id": drive_id,
            }
        )

        class drive(object):
            datafolder = "kolibri"

        mock_get_mounted_drive_by_id.return_value = drive

        validator.is_valid(raise_exception=True)

        self.assertEqual(
            validator.validated_data,
            {
                "args": [channel_id, drive_id],
                "enqueue_args": {},
                "extra_metadata": {
                    "channel_id": channel_id,
                    "channel_name": "test",
                    "drive_id": drive_id,
                },
                "kwargs": {},
            },
        )


class AutomaticDownloadTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="a")

    @mock.patch(
        "kolibri.core.content.tasks.automatic_download_enabled", return_value=True
    )
    def test_validator__enabled(self, _):
        validator = AutomaticDownloadValidator(
            data={"type": "kolibri.core.content.tasks.automatic_resource_import"}
        )
        try:
            validator.is_valid(raise_exception=True)
        except serializers.ValidationError:
            self.fail("AutomaticDownloadValidator raised ValidationError unexpectedly!")

    @mock.patch(
        "kolibri.core.content.tasks.automatic_download_enabled", return_value=False
    )
    def test_validator__disabled(self, _):
        validator = AutomaticDownloadValidator(
            data={"type": "kolibri.core.content.tasks.automatic_resource_import"}
        )
        with self.assertRaises(serializers.ValidationError):
            validator.is_valid(raise_exception=True)

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__no_reqs(self, mock_task):
        enqueue_automatic_resource_import_if_needed()
        mock_task.enqueue_if_not.assert_not_called()

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__instance_id__no_reqs(self, mock_task):
        enqueue_automatic_resource_import_if_needed(instance_id=uuid.uuid4().hex)
        mock_task.enqueue_if_not.assert_not_called()

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__completed_req(self, mock_task):
        ContentDownloadRequest(
            reason=ContentRequestReason.UserInitiated,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility_id=self.facility.id,
            contentnode_id=uuid.uuid4().hex,
            status=ContentRequestStatus.Completed,
        ).save()
        enqueue_automatic_resource_import_if_needed()
        mock_task.enqueue_if_not.assert_not_called()

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__instance_id__completed_req(self, mock_task):
        req = ContentDownloadRequest(
            reason=ContentRequestReason.UserInitiated,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility_id=self.facility.id,
            source_instance_id=uuid.uuid4().hex,
            contentnode_id=uuid.uuid4().hex,
            status=ContentRequestStatus.Completed,
        )
        req.save()
        enqueue_automatic_resource_import_if_needed(instance_id=req.source_instance_id)
        mock_task.enqueue_if_not.assert_not_called()

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__incomplete_req(self, mock_task):
        ContentDownloadRequest(
            reason=ContentRequestReason.UserInitiated,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility_id=self.facility.id,
            contentnode_id=uuid.uuid4().hex,
            status=ContentRequestStatus.Pending,
        ).save()
        enqueue_automatic_resource_import_if_needed()
        mock_task.enqueue_if_not.assert_called_once()

    @mock.patch("kolibri.core.content.tasks.automatic_resource_import")
    def test_enqueue_helper__instance_id__incomplete_req(self, mock_task):
        req = ContentDownloadRequest(
            reason=ContentRequestReason.UserInitiated,
            source_model="test",
            source_id=uuid.uuid4().hex,
            facility_id=self.facility.id,
            source_instance_id=uuid.uuid4().hex,
            contentnode_id=uuid.uuid4().hex,
            status=ContentRequestStatus.Pending,
        )
        req.save()
        enqueue_automatic_resource_import_if_needed(instance_id=req.source_instance_id)
        mock_task.enqueue_if_not.assert_called_once()
