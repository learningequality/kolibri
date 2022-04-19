import os
import platform
import sys
import uuid
from collections import namedtuple
from datetime import timedelta

import mock
from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.urlresolvers import reverse
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
from kolibri.core.auth.constants.role_kinds import ADMIN
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.models import Role
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import ClassroomFactory
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.public.constants import user_sync_statuses
from kolibri.core.public.constants.user_sync_options import DELAYED_SYNC
from kolibri.utils.tests.helpers import override_option


DUMMY_PASSWORD = "password"


class DeviceProvisionTestCase(APITestCase):
    def setUp(self):
        clear_process_cache()

    superuser_data = {"username": "superuser", "password": "password"}
    facility_data = {"name": "Wilson Elementary"}
    preset_data = "nonformal"
    dataset_data = {
        "learner_can_edit_username": True,
        "learner_can_edit_name": True,
        "learner_can_edit_password": True,
        "learner_can_sign_up": True,
        "learner_can_delete_account": True,
        "learner_can_login_with_no_password": False,
    }
    settings = {}
    allow_guest_access = True

    language_id = "en"

    def _default_provision_data(self):
        return {
            "device_name": None,
            "superuser": self.superuser_data,
            "facility": self.facility_data,
            "preset": self.preset_data,
            "settings": self.settings,
            "language_id": self.language_id,
            "allow_guest_access": self.allow_guest_access,
        }

    def _post_deviceprovision(self, data):
        return self.client.post(
            reverse("kolibri:core:deviceprovision"), data, format="json"
        )

    def test_personal_setup_defaults(self):
        data = self._default_provision_data()
        data["preset"] = "informal"
        # Client should pass an empty Dict for settings
        data["settings"] = {}
        self._post_deviceprovision(data)
        settings = FacilityDataset.objects.get()
        self.assertEqual(settings.learner_can_edit_username, True)
        self.assertEqual(settings.learner_can_edit_name, True)
        self.assertEqual(settings.learner_can_edit_password, True)
        self.assertEqual(settings.learner_can_sign_up, True)
        self.assertEqual(settings.learner_can_delete_account, True)
        self.assertEqual(settings.learner_can_login_with_no_password, False)
        self.assertEqual(settings.show_download_button_in_learn, True)

        device_settings = DeviceSettings.objects.get()
        self.assertEqual(device_settings.allow_guest_access, True)

    def test_cannot_post_if_provisioned(self):
        provision_device()
        data = self._default_provision_data()
        response = self._post_deviceprovision(data)
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_superuser_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(
            FacilityUser.objects.get().username, self.superuser_data["username"]
        )

    def test_superuser_password_set_correctly(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertTrue(
            FacilityUser.objects.get().check_password(self.superuser_data["password"])
        )

    def test_superuser_device_permissions_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(
            DevicePermissions.objects.get(),
            FacilityUser.objects.get().devicepermissions,
        )

    def test_facility_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Facility.objects.get().name, self.facility_data["name"])

    def test_admin_role_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Role.objects.get().kind, ADMIN)

    def test_facility_role_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(Role.objects.get().collection.name, self.facility_data["name"])

    def test_dataset_set_created(self):
        data = self._default_provision_data()
        self._post_deviceprovision(data)
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_username,
            self.dataset_data["learner_can_edit_username"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_name,
            self.dataset_data["learner_can_edit_name"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_edit_password,
            self.dataset_data["learner_can_edit_password"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_sign_up,
            self.dataset_data["learner_can_sign_up"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_delete_account,
            self.dataset_data["learner_can_delete_account"],
        )
        self.assertEqual(
            FacilityDataset.objects.get().learner_can_login_with_no_password,
            self.dataset_data["learner_can_login_with_no_password"],
        )

    def test_device_settings_created(self):
        data = self._default_provision_data()
        self.assertEqual(DeviceSettings.objects.count(), 0)
        self._post_deviceprovision(data)
        self.assertEqual(DeviceSettings.objects.count(), 1)

    def test_device_settings_values(self):
        data = self._default_provision_data()
        data["allow_guest_access"] = False
        self._post_deviceprovision(data)
        device_settings = DeviceSettings.objects.get()
        self.assertEqual(device_settings.default_facility, Facility.objects.get())
        self.assertFalse(device_settings.allow_guest_access)
        self.assertFalse(device_settings.allow_peer_unlisted_channel_import)
        self.assertTrue(device_settings.allow_learner_unassigned_resource_access)


class DeviceSettingsTestCase(APITestCase):
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
        super(DeviceSettingsTestCase, self).setUp()
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


class DevicePermissionsTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
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
    def setUp(self):
        provision_device()
        self.facility = FacilityFactory.create()
        self.superuser = create_superuser(self.facility)
        self.user = FacilityUserFactory.create(facility=self.facility)
        self.client.login(
            username=self.superuser.username,
            password=DUMMY_PASSWORD,
            facility=self.facility,
        )

    def test_posix_freespace(self):
        if not sys.platform.startswith("win"):
            with mock.patch("kolibri.utils.system.os.statvfs") as os_statvfs_mock:
                statvfs_result = namedtuple("statvfs_result", ["f_frsize", "f_bavail"])
                os_statvfs_mock.return_value = statvfs_result(f_frsize=1, f_bavail=2)

                response = self.client.get(
                    reverse("kolibri:core:freespace"), {"path": "test"}
                )

                os_statvfs_mock.assert_called_with(os.path.realpath("test"))
                self.assertEqual(response.data, {"freespace": 2})

    def test_win_freespace_fail(self):
        if sys.platform.startswith("win"):
            ctypes_mock = mock.MagicMock()
            with mock.patch.dict("sys.modules", ctypes=ctypes_mock):
                ctypes_mock.windll.kernel32.GetDiskFreeSpaceExW.return_value = 0
                ctypes_mock.winError.side_effect = OSError
                try:
                    self.client.get(reverse("kolibri:core:freespace"), {"path": "test"})
                except OSError:
                    # check if ctypes.winError() has been called
                    ctypes_mock.winError.assert_called_with()


class DeviceInfoTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        provision_device()
        DatabaseIDModel.objects.create()
        cls.facility = FacilityFactory.create()
        cls.superuser = create_superuser(cls.facility)

    def setUp(self):
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
        self.assertFalse(len(response.data["urls"]) == 0)
        for url in response.data["urls"]:
            # Make sure each url is a valid link
            self.assertTrue(url.startswith("http://"))

    @patch(
        "kolibri.core.device.api.get_urls",
        return_value=(1, ["http://127.0.0.1:8000", "http://kolibri.com"]),
    )
    def test_no_localhost_urls_when_others_available(self, get_urls_mock):
        response = self.client.get(reverse("kolibri:core:deviceinfo"), format="json")
        self.assertEqual(len(response.data["urls"]), 1)
        self.assertEqual(response.data["urls"][0], "http://kolibri.com")

    @patch(
        "kolibri.core.device.api.get_urls", return_value=(1, ["http://127.0.0.1:8000"])
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
    @classmethod
    def setUpTestData(cls):
        cls.device_name = {"name": "test device"}
        cls.facility = FacilityFactory.create()
        provision_device(language_id="es", default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)
        cls.user = FacilityUserFactory.create(facility=cls.facility)

    def setUp(self):
        super(DeviceNameTestCase, self).setUp()
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
            InstanceIDModel.get_or_create_current_instance()[0].hostname,
        )

    def test_patch(self):
        device_settings = DeviceSettings.objects.get()
        self.assertEqual(
            device_settings.name,
            InstanceIDModel.get_or_create_current_instance()[0].hostname,
        )

        response = self.client.patch(
            reverse("kolibri:core:devicename"), self.device_name, format="json"
        )
        self.assertEqual(response.data, self.device_name)
        device_settings.refresh_from_db()

        self.assertEqual(device_settings.name, self.device_name["name"])
        self.assertNotEqual(
            device_settings.name,
            InstanceIDModel.get_or_create_current_instance()[0].hostname,
        )

    def test_device_name_max_length(self):
        with self.assertRaises(ValidationError):
            exceeds_max_length_name = {"name": "a" * 60}
            self.client.patch(
                reverse("kolibri:core:devicename"),
                exceeds_max_length_name,
                format="json",
            )


class UserSyncStatusTestCase(APITestCase):
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
            "client_instance": True,
            "server_instance": False,
            "extra_fields": {},
        }
        cls.syncsession1 = SyncSession.objects.create(**syncdata)
        data1 = {
            "user_id": cls.user1.id,
            "sync_session": cls.syncsession1,
            "queued": True,
        }
        cls.syncstatus1 = UserSyncStatus.objects.create(**data1)

        syncdata2 = {
            "id": uuid.uuid4().hex,
            "start_timestamp": timezone.now(),
            "last_activity_timestamp": timezone.now(),
            "active": False,
            "is_server": False,
            "client_instance": True,
            "server_instance": False,
            "extra_fields": {},
        }
        cls.syncsession2 = SyncSession.objects.create(**syncdata2)
        data2 = {
            "user_id": cls.user2.id,
            "sync_session": cls.syncsession2,
            "queued": False,
        }
        cls.syncstatus2 = UserSyncStatus.objects.create(**data2)

    def setUp(self):
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
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=True,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
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
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=True,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
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
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=True,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now() - timedelta(seconds=100),
            transfer_stage_status=transfer_statuses.ERRORED,
        )
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=True,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
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
        self.syncstatus1.queued = False
        self.syncstatus1.save()
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=False,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
            transfer_stage_status=transfer_statuses.COMPLETED,
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

        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=False,
            sync_session=self.syncsession1,
            last_activity_timestamp=timezone.now(),
            transfer_stage_status=transfer_statuses.COMPLETED,
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
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=False,
            sync_session=self.syncsession1,
            last_activity_timestamp=last_sync,
            transfer_stage_status=transfer_statuses.COMPLETED,
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
        self.syncstatus1.queued = False
        self.syncstatus1.save()
        last_sync = timezone.now() - timedelta(seconds=DELAYED_SYNC * 2)
        self.syncsession1.last_activity_timestamp = last_sync
        self.syncsession1.save()
        TransferSession.objects.create(
            id=uuid.uuid4(),
            filter="no-filter",
            push=True,
            active=False,
            sync_session=self.syncsession1,
            last_activity_timestamp=last_sync,
            transfer_stage_status=transfer_statuses.COMPLETED,
        )

        response = self.client.get(reverse("kolibri:core:usersyncstatus-list"))
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]["user"], self.user1.id)
        self.assertEqual(
            response.data[0]["status"], user_sync_statuses.NOT_RECENTLY_SYNCED
        )
