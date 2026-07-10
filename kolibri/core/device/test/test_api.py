import os
import platform
import tempfile
import uuid
from collections import namedtuple
from datetime import timedelta

import mock
from django.conf import settings
from django.contrib.auth import SESSION_KEY
from django.core.exceptions import ValidationError
from django.urls import reverse
from django.utils import timezone
from mock import patch
from morango.constants import transfer_statuses
from morango.models import DatabaseIDModel
from morango.models import InstanceIDModel
from morango.models import SyncSession
from morango.models import TransferSession
from rest_framework import status
from rest_framework.test import APITestCase

import kolibri
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.models import StatusSentiment
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import app_initialize_url
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.public.constants import user_sync_statuses
from kolibri.core.public.constants.user_sync_options import DELAYED_SYNC
from kolibri.utils.conf import OPTIONS
from kolibri.utils.tests.helpers import override_option

DUMMY_PASSWORD = "password"


class DeviceSettingsTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.settings = {
            "language_id": "en",
            "allow_guest_access": False,
            "allow_peer_unlisted_channel_import": True,
            "allow_learner_unassigned_resource_access": False,
        }

        cls.facility = FacilityFactory.create()
        provision_device(language_id="es", default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        super().setUp()
        clear_process_cache()
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_cannot_post(self):
        response = self.client.post(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_cannot_put(self):
        response = self.client.put(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_405_METHOD_NOT_ALLOWED)

    def test_patch(self):
        device_settings = DeviceSettings.objects.get()
        self.assertEqual("es", device_settings.language_id)
        self.assertTrue(device_settings.allow_guest_access)
        self.assertFalse(device_settings.allow_peer_unlisted_channel_import)
        self.assertTrue(device_settings.allow_learner_unassigned_resource_access)

        self.client.patch(
            reverse("kolibri:core:devicesettings"), self.settings, format="json"
        )
        device_settings.refresh_from_db()

        self.assertEqual("en", device_settings.language_id)
        self.assertFalse(device_settings.allow_guest_access)
        self.assertTrue(device_settings.allow_peer_unlisted_channel_import)
        self.assertFalse(device_settings.allow_learner_unassigned_resource_access)

    def test_patch_allow_other_browsers_to_connect(self):
        device_settings = DeviceSettings.objects.get()
        self.assertTrue(device_settings.allow_other_browsers_to_connect)

        response = self.client.patch(
            reverse("kolibri:core:devicesettings"),
            {"allow_other_browsers_to_connect": False},
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)

        device_settings.refresh_from_db()
        self.assertFalse(device_settings.allow_other_browsers_to_connect)

    def test_get_includes_allow_other_browsers_to_connect(self):
        response = self.client.get(
            reverse("kolibri:core:devicesettings"),
            format="json",
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertTrue(response.data["allow_other_browsers_to_connect"])


class DevicePermissionsTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        clear_process_cache()
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_superuser_delete_own_permissions(self):
        response = self.client.delete(
            reverse(
                "kolibri:core:devicepermissions-detail",
                kwargs={"pk": self.superuser.devicepermissions.pk},
            ),
            format="json",
        )
        self.assertEqual(response.status_code, 403)

    def test_superuser_update_own_permissions(self):
        response = self.client.patch(
            reverse(
                "kolibri:core:devicepermissions-detail",
                kwargs={"pk": self.superuser.devicepermissions.pk},
            ),
            {"is_superuser": False},
            format="json",
        )
        self.assertEqual(response.status_code, 403)


@override_option("Deployment", "MINIMUM_DISK_SPACE", 0)
class FreeSpaceTestCase(APITestCase):
    databases = "__all__"

    def setUp(self):
        clear_process_cache()
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_freespace(self):
        with mock.patch("kolibri.utils.system.shutil.disk_usage") as diskusage_mock:
            diskusage_result = namedtuple("diskusage_result", ["free"])
            diskusage_mock.return_value = diskusage_result(free=2)

            response = self.client.get(
                reverse("kolibri:core:freespace"), {"path": "Content"}
            )

            diskusage_mock.assert_called_with(OPTIONS["Paths"]["CONTENT_DIR"])
            self.assertEqual(response.data, {"freespace": 2})


class DeviceInfoTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        DatabaseIDModel.objects.create()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        clear_process_cache()
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_has_version(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.data["version"], kolibri.__version__)

    def test_urls(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertNotEqual(len(response.data["urls"]), 0)
        for url in response.data["urls"]:
            # Make sure each url is a valid link
            self.assertTrue(url.startswith("http://"))

    @patch(
        "kolibri.core.device.viewsets.device_info.get_urls",
        return_value=(1, ["http://127.0.0.1:8000", "http://kolibri.com"]),
    )
    def test_no_localhost_urls_when_others_available(self, get_urls_mock):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(len(response.data["urls"]), 1)
        self.assertEqual(response.data["urls"][0], "http://kolibri.com")

    @patch(
        "kolibri.core.device.viewsets.device_info.get_urls",
        return_value=(1, ["http://127.0.0.1:8000"]),
    )
    def test_localhost_urls_when_no_others_available(self, get_urls_mock):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(len(response.data["urls"]), 1)
        self.assertEqual(response.data["urls"][0], "http://127.0.0.1:8000")

    def test_database_path(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        db_engine = settings.DATABASES["default"]["ENGINE"]
        db_path = response.data["database_path"]
        if db_engine.endswith("sqlite3"):
            self.assertEqual(db_path, settings.DATABASES["default"]["NAME"])
        elif db_engine.endswith("postgresql"):
            self.assertEqual(db_path, "postgresql")
        else:
            self.assertEqual(db_path, "unknown")

    def test_os(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.data["os"], platform.platform())

    def test_device_id(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(
            response.data["device_id"],
            InstanceIDModel.get_or_create_current_instance()[0].id,
        )

    def test_time_zone(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertTrue(response.data["server_timezone"], settings.TIME_ZONE)

    def test_free_space(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(type(response.data["content_storage_free_space"]), int)

    def test_superuser_permissions(self):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 200)

    def test_user_permissions(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.logout()
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 403)

    def test_user_with_permissions(self):
        self.user = FacilityUserFactory.create(facility=self.facility)
        DevicePermissions.objects.create(user=self.user, can_manage_content=True)
        self.client.logout()
        self.client.login(
            username=self.user.username, password=DUMMY_PASSWORD, facility=self.facility
        )
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(response.status_code, 200)


class DeviceNameTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.device_name = {"name": "test device"}
        cls.facility = FacilityFactory.create()
        provision_device(language_id="es", default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        clear_process_cache()
        super().setUp()
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.post(
            reverse("kolibri:core:devicename"), self.device_name, format="json"
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_existing_device_name(self):
        response = self.client.get(reverse("kolibri:core:devicename"))
        self.assertEqual(
            response.data["name"],
            InstanceIDModel.get_or_create_current_instance()[0].hostname[:50],
        )

    def test_patch(self):
        device_settings = DeviceSettings.objects.get()
        self.assertEqual(
            device_settings.name,
            InstanceIDModel.get_or_create_current_instance()[0].hostname[:50],
        )

        response = self.client.patch(
            reverse("kolibri:core:devicename"), self.device_name, format="json"
        )
        self.assertEqual(response.data, self.device_name)
        device_settings.refresh_from_db()

        self.assertEqual(device_settings.name, self.device_name["name"])
        self.assertNotEqual(
            device_settings.name,
            InstanceIDModel.get_or_create_current_instance()[0].hostname[:50],
        )

    @mock.patch(
        "kolibri.core.device.viewsets.device_settings.update_zeroconf_broadcast"
    )
    def test_patch_triggers_zeroconf_update(self, mock_update_zeroconf):
        self.client.patch(
            reverse("kolibri:core:devicename"), self.device_name, format="json"
        )
        mock_update_zeroconf.assert_called_once_with()

    def test_device_name_max_length(self):
        with self.assertRaises(ValidationError):
            exceeds_max_length_name = {"name": "a" * 60}
            self.client.patch(
                reverse("kolibri:core:devicename"),
                exceeds_max_length_name,
                format="json",
            )


class UserSyncStatusTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)
        cls.user1 = FacilityUserFactory.create(facility=cls.facility)
        cls.user2 = FacilityUserFactory.create(facility=cls.facility)
        cls.classroom = ClassroomFactory.create(parent=cls.facility)
        cls.classroom.add_member(cls.user1)
        cls.classroom.add_coach(cls.superuser)
        syncdata = {
            "id": uuid.uuid4().hex,
            "start_timestamp": timezone.now(),
            "last_activity_timestamp": timezone.now(),
            "active": False,
            "is_server": False,
            "client_instance_id": None,
            "server_instance_id": None,
            "extra_fields": {},
        }
        cls.syncsession1 = SyncSession.objects.create(**syncdata)
        data1 = {
            "user_id": cls.user1.id,
            "sync_session": cls.syncsession1,
            "status": SyncQueueStatus.Queued,
        }
        cls.syncstatus1 = UserSyncStatus.objects.create(**data1)

        syncdata2 = {
            "id": uuid.uuid4().hex,
            "start_timestamp": timezone.now(),
            "last_activity_timestamp": timezone.now(),
            "active": False,
            "is_server": False,
            "client_instance_id": None,
            "server_instance_id": None,
            "extra_fields": {},
        }
        cls.syncsession2 = SyncSession.objects.create(**syncdata2)
        data2 = {
            "user_id": cls.user2.id,
            "sync_session": cls.syncsession2,
            "status": SyncQueueStatus.Pending,
        }
        cls.syncstatus2 = UserSyncStatus.objects.create(**data2)

    def _create_transfer_session(self, **data):
        defaults = dict(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=True,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
            transfer_stage_status=transfer_statuses.COMPLETED,
        )
        defaults.update(data)
        TransferSession.objects.create(**defaults)

    def _create_device_status(self, *status):
        instance_id = uuid.uuid4()
        return LearnerDeviceStatus.objects.create(
            instance_id=instance_id,
            user=self.user1,
            **dict(zip(("status", "status_sentiment"), status)),
        )

    def setUp(self):
        clear_process_cache()
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_usersyncstatus_list(self):
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        expected_count = UserSyncStatus.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_user_sync_status_class_single_user_for_filter(self):
        response = self.client.get(
            reverse("kolibri:core:usersyncstatus-list"),
            data={"user": self.user1.id},
        )
        expected_count = UserSyncStatus.objects.filter(user_id=self.user1.id).count()
        self.assertEqual(len(response.data), expected_count)

    def test_user_sync_status_class_list_for_filter(self):
        response = self.client.get(
            reverse("kolibri:core:usersyncstatus-list"),
            data={"member_of": self.classroom.id},
        )
        self.assertEqual(len(response.data), 1)

    def test_usersyncstatus_list_learner_permissions(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)

    def test_usersyncstatus_list_facility_admin_permissions(self):
        fadmin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(fadmin)
        self.client.login(
            username=fadmin.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        expected_count = UserSyncStatus.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_usersyncstatus_list_facility_coach_permissions(self):
        fcoach = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_coach(fcoach)
        self.client.login(
            username=fcoach.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        expected_count = UserSyncStatus.objects.count()
        self.assertEqual(len(response.data), expected_count)

    def test_usersyncstatus_list_class_coach_permissions(self):
        ccoach = FacilityUserFactory.create(facility=self.facility)
        self.classroom.add_coach(ccoach)
        self.client.login(
            username=ccoach.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)

    def test_usersyncstatus_list_learner_error_state(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            transfer_stage_status=transfer_statuses.ERRORED,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.UNABLE_TO_SYNC)

    def test_usersyncstatus_list_learner_syncing_state(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            transfer_stage_status=transfer_statuses.STARTED,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.SYNCING)

    def test_usersyncstatus_list_learner_syncing_state_old_error(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            last_activity_timestamp=timezone.now() - timedelta(seconds=100),
            transfer_stage_status=transfer_statuses.ERRORED,
        )
        self._create_transfer_session(
            transfer_stage_status=transfer_statuses.STARTED,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.SYNCING)

    def test_usersyncstatus_list_learner_recent_success(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self.syncstatus1.status = SyncQueueStatus.Pending
        self.syncstatus1.save()
        self._create_transfer_session(
            active=False,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.RECENTLY_SYNCED)

    def test_usersyncstatus_list_learner_queued(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        last_sync = timezone.now() - timedelta(seconds=DELAYED_SYNC * 2)
        self.syncsession1.last_activity_timestamp = last_sync
        self.syncsession1.save()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.QUEUED)

    def test_usersyncstatus_list_learner_queued_recent_success(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

        self._create_transfer_session(
            active=False,
        )
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.RECENTLY_SYNCED)

    def test_usersyncstatus_list_learner_queued_not_recent_success(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

        last_sync = timezone.now() - timedelta(seconds=DELAYED_SYNC * 2)
        self.syncsession1.last_activity_timestamp = last_sync
        self.syncsession1.save()
        self._create_transfer_session(
            active=False,
            last_activity_timestamp=last_sync,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.QUEUED)

    def test_usersyncstatus_list_learner_not_recent_success(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self.syncstatus1.status = SyncQueueStatus.Pending
        self.syncstatus1.save()
        last_sync = timezone.now() - timedelta(seconds=DELAYED_SYNC * 2)
        self.syncsession1.last_activity_timestamp = last_sync
        self.syncsession1.save()
        self._create_transfer_session(
            active=False,
            last_activity_timestamp=last_sync,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(
            response.data[0]["status"], user_sync_statuses.NOT_RECENTLY_SYNCED
        )

    def test_usersyncstatus_list_learner_no_sync_session(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self.syncstatus1.status = SyncQueueStatus.Pending
        previous_sync_session = self.syncstatus1.sync_session
        self.syncstatus1.sync_session = None
        self.syncstatus1.save()

        try:
            response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
            self.assertEqual(len(response.data), 1)
            self.assertEqual(response.data[0]["user"], self.user1.id)
            self.assertEqual(
                response.data[0]["status"], user_sync_statuses.NOT_RECENTLY_SYNCED
            )
        finally:
            # Not doing this leads to weird unexpected test contagion.
            self.syncstatus1.sync_session = previous_sync_session
            self.syncstatus1.save()

    def test_usersyncstatus_list__insufficient_storage(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        device_status = self._create_device_status(*DeviceStatus.InsufficientStorage)
        self.syncsession1.client_instance_id = device_status.instance_id
        self.syncsession1.save()

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(
            response.data[0]["status"], user_sync_statuses.INSUFFICIENT_STORAGE
        )

    def test_usersyncstatus_list__unknown_negative_device_status(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        device_status = self._create_device_status("oopsie", StatusSentiment.Negative)
        self.syncsession1.client_instance_id = device_status.instance_id
        self.syncsession1.save()

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.UNABLE_TO_SYNC)

    def test_usersyncstatus_list__unknown_non_negative_device_status(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        device_status = self._create_device_status("oopsie", StatusSentiment.Neutral)
        self.syncsession1.client_instance_id = device_status.instance_id
        self.syncsession1.save()

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.RECENTLY_SYNCED)

    def test_downloads_queryset(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        content_request = ContentDownloadRequest.build_for_user(self.user1)
        content_request.contentnode_id = uuid.uuid4().hex
        device_status = self._create_device_status("oopsie", StatusSentiment.Neutral)
        self.syncsession1.client_instance_id = device_status.instance_id
        self.syncsession1.save()
        content_request.save()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(response.data[0]["status"], user_sync_statuses.RECENTLY_SYNCED)
        self.assertTrue(response.data[0]["has_downloads"])
        self.assertIsNone(response.data[0]["last_download_removed"])

    def test_downloads_queryset__content_request_removed(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        content_request = ContentDownloadRequest.build_for_user(self.user1)
        content_request.contentnode_id = uuid.uuid4().hex
        content_request.save()
        content_removal_request = ContentRemovalRequest.build_for_user(self.user1)
        content_removal_request.contentnode_id = content_request.contentnode_id
        content_removal_request.save()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertFalse(response.data[0]["has_downloads"])

    def test_downloads_queryset__sync_downloads_in_progress(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        content_request = ContentDownloadRequest.build_for_user(self.user1)
        content_request.contentnode_id = uuid.uuid4().hex
        content_request.reason = ContentRequestReason.SyncInitiated
        content_request.save()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertTrue(response.data[0]["sync_downloads_in_progress"])

    def test_downloads_queryset__sync_downloads_in_progress_removed(self):
        self.client.login(
            username=self.user1.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )
        self._create_transfer_session(
            active=False,
        )
        content_request = ContentDownloadRequest.build_for_user(self.user1)
        content_request.contentnode_id = uuid.uuid4().hex
        content_request.reason = ContentRequestReason.SyncInitiated
        content_request.save()
        content_removal_request = ContentRemovalRequest.build_for_user(self.user1)
        content_removal_request.contentnode_id = content_request.contentnode_id
        content_removal_request.reason = ContentRequestReason.SyncInitiated
        content_removal_request.save()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertFalse(response.data[0]["sync_downloads_in_progress"])

    def test_usersyncstatus_list_subset_of_users_device_no_peers_returns_empty(self):
        NetworkLocation.objects.filter(subset_of_users_device=False).delete()
        device_settings = DeviceSettings.objects.get()
        device_settings.subset_of_users_device = True
        device_settings.save()
        clear_process_cache()
        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(list(response.data), [])


class InitializeEndpointTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device(default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)

    def test_os_user_capability_enabled_log_in(self):
        with mock.patch(
            "kolibri.core.auth.models.GetOSUserHook.retrieve_os_user",
            return_value=("test_user", False),
        ):
            initialize_url = app_initialize_url(auth_token="test")
            self.client.get(initialize_url)
            session_data = self.client.session.load()
            user_id = session_data.get(SESSION_KEY)
            user = FacilityUser.objects.get(id=user_id)
            self.assertTrue(user.os_user)
            self.assertEqual(user.os_user.os_username, "test_user")
            self.assertNotEqual(self.superuser.id, user.id)

    def test_no_os_user_capability_no_log_in(self):
        initialize_url = app_initialize_url()
        self.client.get(initialize_url)
        session_data = self.client.session.load()
        user_id = session_data.get(SESSION_KEY)
        self.assertIsNone(user_id)

    def test_os_user_capability_enabled_already_logged_in_no_change(self):
        with mock.patch(
            "kolibri.core.auth.models.GetOSUserHook.retrieve_os_user",
            return_value=("test_user", False),
        ):
            self.client.login(username=self.superuser.username, password="password")
            initialize_url = app_initialize_url(auth_token="test")
            self.client.get(initialize_url)
            session_data = self.client.session.load()
            user_id = session_data.get(SESSION_KEY)
            user = FacilityUser.objects.get(id=user_id)
            self.assertFalse(hasattr(user, "os_user"))
            self.assertEqual(self.superuser.id, user.id)

    def test_redirect_relative_next_url(self):
        """A relative same-host path is accepted."""
        url = app_initialize_url(next_url="/learn/")
        response = self.client.get(url, follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/learn/")

    def test_redirect_absolute_same_host_next_url(self):
        """A fully-qualified URL pointing at the test host is accepted."""
        url = app_initialize_url(next_url="http://testserver/learn/")
        response = self.client.get(url, follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "http://testserver/learn/")

    def test_redirect_absolute_different_host_falls_back(self):
        """A fully-qualified URL pointing at a foreign host falls back to /."""
        url = app_initialize_url(next_url="http://evil.com/steal")
        response = self.client.get(url, follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/")

    def test_redirect_protocol_relative_falls_back(self):
        """A protocol-relative URL (//evil.com/foo) falls back to /."""
        url = app_initialize_url(next_url="//evil.com/foo")
        response = self.client.get(url, follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/")

    def test_redirect_absent_next_falls_back(self):
        """When ?next= is absent, the redirect target is /."""
        url = app_initialize_url()
        response = self.client.get(url, follow=False)
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/")

    def test_redirect_referer_ignored_with_invalid_next(self):
        """HTTP_REFERER is no longer used as a fallback."""
        url = app_initialize_url(next_url="http://evil.com/steal")
        response = self.client.get(
            url,
            follow=False,
            HTTP_REFERER="http://testserver/valid/",
        )
        self.assertEqual(response.status_code, 302)
        self.assertEqual(response["Location"], "/")


class PathPermissionViewTestCase(APITestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device(language_id="en", default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
        super().setUp()
        clear_process_cache()
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_requires_authentication(self):
        self.client.logout()
        response = self.client.get(
            reverse("kolibri:core:pathpermission"), {"path": "/tmp"}
        )
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_returns_submitted_path_not_realpath(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            link = os.path.join(tmpdir, "link")
            target = os.path.join(tmpdir, "target")
            os.mkdir(target)
            os.symlink(target, link)
            response = self.client.get(
                reverse("kolibri:core:pathpermission"), {"path": link}
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            # The response must echo the submitted path, not the symlink target
            self.assertEqual(response.data["path"], link)
            self.assertNotEqual(response.data["path"], target)

    def test_tilde_path_not_expanded(self):
        # ~root/.ssh must NOT be expanded to /root/.ssh
        response = self.client.get(
            reverse("kolibri:core:pathpermission"), {"path": "~root/.ssh"}
        )
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        # The response path must be the literal submitted string
        self.assertEqual(response.data["path"], "~root/.ssh")
        # directory check must be False (literal path does not exist)
        self.assertFalse(response.data["directory"])

    def test_real_dir_writable_and_directory(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            response = self.client.get(
                reverse("kolibri:core:pathpermission"), {"path": tmpdir}
            )
            self.assertEqual(response.status_code, status.HTTP_200_OK)
            self.assertTrue(response.data["directory"])
            self.assertTrue(response.data["writable"])
            self.assertEqual(response.data["path"], tmpdir)
