import platform
import time
import uuid

import factory
import mock
from django.urls import reverse
from django.utils import timezone
from le_utils.constants import content_kinds
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.models import InstanceIDModel
from morango.models import SyncSession
from morango.models import TransferSession
from rest_framework import status
from rest_framework.test import APITestCase

import kolibri
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.helpers import setup_device
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import Language
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.annotation import set_channel_metadata_fields
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.utils import set_device_settings
from kolibri.core.public.constants.user_sync_options import HANDSHAKING_TIME
from kolibri.core.public.constants.user_sync_options import MAX_CONCURRENT_SYNCS
from kolibri.core.public.constants.user_sync_options import STALE_QUEUE_TIME


class ContentNodeFactory(factory.DjangoModelFactory):
    class Meta:
        model = ContentNode

    id = factory.LazyFunction(uuid.uuid4)
    content_id = factory.LazyFunction(uuid.uuid4)
    title = factory.Sequence(lambda n: "contentnode%d" % n)
    available = True
    lang_id = "en"


class FileFactory(factory.DjangoModelFactory):
    class Meta:
        model = File

    id = factory.LazyFunction(uuid.uuid4)


class LocalFileFactory(factory.DjangoModelFactory):
    class Meta:
        model = LocalFile

    available = True
    file_size = 10


def create_mini_channel(
    channel_name="channel", channel_id=uuid.uuid4(), root_lang="en"
):
    root = ContentNodeFactory.create(
        kind=content_kinds.TOPIC, channel_id=channel_id, lang_id=root_lang
    )
    child1 = ContentNodeFactory.create(
        parent=root, kind=content_kinds.VIDEO, channel_id=channel_id
    )
    dupe_content_id = uuid.uuid4().hex
    child2 = ContentNodeFactory.create(
        parent=root,
        kind=content_kinds.VIDEO,
        channel_id=channel_id,
        content_id=dupe_content_id,
    )
    # create child3 node with duplicate content_id
    ContentNodeFactory.create(
        parent=child1,
        kind=content_kinds.VIDEO,
        channel_id=channel_id,
        content_id=dupe_content_id,
    )
    l1 = LocalFileFactory.create(id=uuid.uuid4().hex)
    l2 = LocalFileFactory.create(id=uuid.uuid4().hex)
    FileFactory.create(contentnode=child1, local_file=l1)
    FileFactory.create(contentnode=child2, local_file=l2)
    return ChannelMetadata.objects.create(
        id=channel_id, name=channel_name, min_schema_version=1, root=root
    )


class PublicAPITestCase(APITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    @classmethod
    def setUpTestData(cls):
        provision_device()
        Language.objects.create(id="en", lang_code="en")
        Language.objects.create(id="es", lang_code="es")
        cls.channel_id1 = uuid.uuid4().hex
        cls.channel_id2 = uuid.uuid4().hex
        create_mini_channel(channel_name="math", channel_id=cls.channel_id1)
        channel2 = create_mini_channel(
            channel_name="science", channel_id=cls.channel_id2, root_lang="es"
        )
        set_channel_metadata_fields(channel2.id, public=True)

    def test_info_endpoint_unversioned(self):
        response = self.client.get(reverse("kolibri:core:info-list"))
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        settings = DeviceSettings.objects.get()
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["kolibri_version"], kolibri.__version__)
        self.assertEqual(response.data["instance_id"], instance_model.id)
        self.assertEqual(response.data["device_name"], settings.name)
        self.assertEqual(response.data["operating_system"], platform.system())
        self.assertIsNone(response.data.get("subset_of_users_device"))

    def test_info_endpoint_v1(self):
        response = self.client.get(reverse("kolibri:core:info-list"), data={"v": "1"})
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        settings = DeviceSettings.objects.get()
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["kolibri_version"], kolibri.__version__)
        self.assertEqual(response.data["instance_id"], instance_model.id)
        self.assertEqual(response.data["device_name"], settings.name)
        self.assertEqual(response.data["operating_system"], platform.system())
        self.assertIsNone(response.data.get("subset_of_users_device"))

    def test_info_endpoint_v2(self):
        response = self.client.get(reverse("kolibri:core:info-list"), data={"v": "2"})
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        settings = DeviceSettings.objects.get()
        self.assertEqual(response.data["application"], "kolibri")
        self.assertEqual(response.data["kolibri_version"], kolibri.__version__)
        self.assertEqual(response.data["instance_id"], instance_model.id)
        self.assertEqual(response.data["device_name"], settings.name)
        self.assertEqual(response.data["operating_system"], platform.system())
        self.assertEqual(
            response.data["subset_of_users_device"], settings.subset_of_users_device
        )

    def test_public_channel_list(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/"))
        data = response.json()
        self.assertEqual(len(data), 2)

    def test_public_channel_list_filter_keyword(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/", keyword="zzz"))
        self.assertEqual(len(response.json()), 0)
        response = self.client.get(get_channel_lookup_url(baseurl="/", keyword="math"))
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id1)

    def test_public_channel_list_filter_language(self):
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="zu"))
        self.assertEqual(len(response.json()), 0)
        # filter based on contentnode languages
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="en"))
        self.assertEqual(len(response.json()), 2)
        # filter based on root contentnode language
        response = self.client.get(get_channel_lookup_url(baseurl="/", language="es"))
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id2)

    def test_public_channel_list_filter_keyword_language(self):
        response = self.client.get(
            get_channel_lookup_url(baseurl="/", keyword="zzz", language="es")
        )
        self.assertEqual(len(response.json()), 0)
        response = self.client.get(
            get_channel_lookup_url(baseurl="/", keyword="science", language="es")
        )
        self.assertEqual(len(response.json()), 1)
        self.assertEqual(response.json()[0]["id"], self.channel_id2)

    def test_public_channel_list_no_version(self):
        response = self.client.get(get_channel_lookup_url(version="100000"))
        self.assertEqual(response.status_code, 404)

    def test_public_channel_lookup(self):
        response = self.client.get(
            get_channel_lookup_url(identifier=self.channel_id2), format="json"
        )
        data = response.json()
        self.assertEqual(len(data), 1)
        data = data[0]
        expected = {
            "id": self.channel_id2,
            "name": "science",
            "language": "es",  # root node language
            "description": "",
            "total_resource_count": 3,  # should account for nodes with duplicate content_ids
            "version": 0,
            "published_size": 20,
            "last_published": None,
            "icon_encoding": "",
            "matching_tokens": [],
            "public": True,
        }
        for key, value in expected.items():
            self.assertEqual(data[key], value)
        # we don't care what order these elements are in
        self.assertSetEqual(set(["en", "es"]), set(data["included_languages"]))

    def test_public_channel_lookup_no_version(self):
        response = self.client.get(
            get_channel_lookup_url(identifier=uuid.uuid4().hex, version="100000")
        )
        self.assertEqual(response.status_code, 404)

    def test_public_channel_lookup_no_channel(self):
        response = self.client.get(get_channel_lookup_url(identifier=uuid.uuid4().hex))
        self.assertEqual(response.status_code, 404)

    def test_public_checksum_lookup_no_checksums(self):
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=[],
            format="json",
        )
        self.assertEqual(int(response.content), 0)

    def test_public_checksum_lookup_not_available(self):
        LocalFile.objects.all().update(available=True)
        test = LocalFile.objects.all().first()
        test.available = False
        test.save()
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=[test.id],
            format="json",
        )
        self.assertEqual(int(response.content), 0)

    def test_public_checksum_lookup_two_available(self):
        LocalFile.objects.all().update(available=True)
        ids = LocalFile.objects.all()[:2].values_list("id", flat=True)
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=ids,
            format="json",
        )
        self.assertEqual(int(response.content), 3)

    def test_public_checksum_lookup_one_available(self):
        LocalFile.objects.all().update(available=True)
        ids = LocalFile.objects.all().order_by("id")[:2].values_list("id", flat=True)
        test = LocalFile.objects.all().order_by("id")[0]
        test.available = False
        test.save()
        response = self.client.post(
            reverse("kolibri:core:get_public_file_checksums", kwargs={"version": "v1"}),
            data=ids,
            format="json",
        )
        self.assertEqual(int(response.content), 2)

    def test_public_filter_unlisted(self):
        set_device_settings(allow_peer_unlisted_channel_import=False)
        unlisted_channel_id = uuid.uuid4().hex
        create_mini_channel(channel_name="math 2", channel_id=unlisted_channel_id)
        set_channel_metadata_fields(unlisted_channel_id, public=False)

        response = self.client.get(get_channel_lookup_url(baseurl="/"))
        data = response.json()
        self.assertEqual(len(data), 2)


class SyncQueueViewSetTestCase(APITestCase):
    """
    IMPORTANT: These tests are to never be changed. They are enforcing a
    public API contract. If the tests fail, then the implementation needs
    to be changed, and not the tests themselves.
    """

    databases = "__all__"

    def setUp(self):
        setup_device()
        self.facility = Facility.get_default_facility()
        self.learner = FacilityUser.objects.create(
            username="test",
            password="***",
            facility=self.facility,
        )
        self.instance_id = uuid.uuid4().hex

    @mock.patch(
        "kolibri.core.public.api.get_device_setting",
        return_value=True,
    )
    def test_soud(self, mock_device_setting):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            {"user": uuid.uuid4().hex, "instance": uuid.uuid4().hex},
            format="json",
        )
        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_allow_sync(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            {
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        assert response.status_code == status.HTTP_200_OK
        assert response.data["status"] == SyncQueueStatus.Ready

    def test_create_user_required(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={"instance": self.instance_id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_create_instance_id_required(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={"user": self.learner.id},
            format="json",
        )
        self.assertEqual(response.status_code, 400)

    def test_create_user_not_exist(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": uuid.uuid4().hex,
                "instance": self.instance_id,
            },
            format="json",
        )
        self.assertEqual(response.status_code, 404)

    def test_create_empty_queue_should_sync(self):
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Ready)

    def test_create_stale_queue_should_sync(self):
        for i in range(0, 10):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Queued,
                keep_alive=10,
                updated=time.time() - STALE_QUEUE_TIME * 2,
            )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Ready)

    def test_create_skip_the_queue_should_sync(self):
        for i in range(0, 10):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Queued,
                keep_alive=10,
                last_sync=time.time() + 10,
            )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Ready)

    def test_create_full_queue_should_queue(self):
        for i in range(0, MAX_CONCURRENT_SYNCS):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Syncing,
                keep_alive=10,
            )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Queued)
        queue_id = data["id"]
        self.assertTrue(
            SyncQueue.objects.filter(id=queue_id, user_id=self.learner.id).exists()
        )

    def test_create_active_transfer_should_queue(self):
        for i in range(0, 2):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Queued,
                keep_alive=10,
                last_sync=0,
            )
        syncdata = {
            "id": uuid.uuid4().hex,
            "start_timestamp": timezone.now(),
            "last_activity_timestamp": timezone.now(),
            "active": False,
            "is_server": True,
            "extra_fields": {},
            "client_instance_id": self.instance_id,
        }
        syncsession1 = SyncSession.objects.create(**syncdata)
        TransferSession.objects.create(
            id=uuid.uuid4().hex,
            filter="no-filter",
            push=True,
            active=False,
            sync_session=syncsession1,
            last_activity_timestamp=timezone.now(),
            transfer_stage=transfer_stages.CLEANUP,
            transfer_stage_status=transfer_statuses.COMPLETED,
        )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={
                "user": self.learner.id,
                "instance": self.instance_id,
            },
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Queued)
        queue_id = data["id"]
        self.assertTrue(
            SyncQueue.objects.filter(
                id=queue_id, user_id=self.learner.id, instance_id=self.instance_id
            ).exists()
        )

    def test_update_stale_queue_item_should_queue(self):
        SyncQueue.objects.create(
            user_id=self.learner.id,
            instance_id=self.instance_id,
            status=SyncQueueStatus.Queued,
            updated=time.time() - STALE_QUEUE_TIME * 2,
            keep_alive=10,
            last_sync=100,
        )
        for i in range(0, MAX_CONCURRENT_SYNCS):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Queued,
                keep_alive=10,
                last_sync=0,
            )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={"user": self.learner.id, "instance": self.instance_id},
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["status"], SyncQueueStatus.Queued)
        queue_id = data["id"]
        self.assertTrue(
            SyncQueue.objects.filter(
                id=queue_id, user_id=self.learner.id, instance_id=self.instance_id
            ).exists()
        )

    def test_update_full_queue_should_scale_keep_alive(self):
        for i in range(0, 3):
            learner = FacilityUser.objects.create(
                username="test{}".format(i),
                password="***",
                facility=self.facility,
            )
            SyncQueue.objects.create(
                user_id=learner.id,
                instance_id=uuid.uuid4().hex,
                status=SyncQueueStatus.Queued,
                keep_alive=10,
                last_sync=0,
            )
        SyncQueue.objects.create(
            user_id=self.learner.id,
            instance_id=self.instance_id,
            keep_alive=10,
            last_sync=100,
        )
        response = self.client.post(
            reverse("kolibri:core:syncqueue"),
            data={"user": self.learner.id, "instance": self.instance_id},
            format="json",
        )
        data = response.json()
        self.assertEqual(response.status_code, 200)
        self.assertEqual(data["keep_alive"], 3 * HANDSHAKING_TIME)
