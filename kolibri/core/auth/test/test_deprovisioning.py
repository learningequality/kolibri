import uuid

from django.core.management import call_command
from django.test import override_settings
from django.test import TestCase
from mock import patch
from morango.models import Certificate
from morango.models import DatabaseIDModel
from morango.models import DatabaseMaxCounter
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store
from morango.registry import syncable_models
from morango.sync.controller import MorangoProfileController

from .. import models as auth_models
from .helpers import setup_device
from .test_api import ClassroomFactory
from .test_api import LearnerGroupFactory
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.utils.deprovision import deprovision as deprovision_func
from kolibri.core.content import models as content_models
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.models import DeviceSettings
from kolibri.core.logger.models import AttemptLog
from kolibri.core.logger.models import ContentSessionLog
from kolibri.core.logger.models import ContentSummaryLog
from kolibri.core.logger.test.factory_logger import ContentSessionLogFactory
from kolibri.core.logger.test.factory_logger import ContentSummaryLogFactory
from kolibri.core.logger.test.factory_logger import FacilityUserFactory
from kolibri.core.logger.test.factory_logger import UserSessionLogFactory

MODELS_DELETED_BY_DEPROVISION = [
    AttemptLog,
    ContentSessionLog,
    ContentSummaryLog,
    auth_models.FacilityUser,
    auth_models.FacilityDataset,
    HardDeletedModels,
    Certificate,
    DatabaseIDModel,
    Store,
    DevicePermissions,
    DeletedModels,
    DeviceSettings,
    DatabaseMaxCounter,
]


def count_instances(models):
    return sum([model.objects.count() for model in models])


@override_settings(MORANGO_TEST_POSTGRESQL=True)
class DeprovisionCommandTestCase(TestCase):
    """
    Tests for the deprovision command.
    """

    databases = "__all__"
    fixtures = ["content_test.json"]

    def setUp(self):
        facility, superuser = setup_device()
        ContentSessionLogFactory.create(
            content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
        )
        for classroom in [ClassroomFactory.create(parent=facility) for _ in range(3)]:
            for group in [
                LearnerGroupFactory.create(parent=classroom) for _ in range(3)
            ]:
                user = FacilityUserFactory.create(facility=facility)
                auth_models.Membership.objects.create(collection=classroom, user=user)
                auth_models.Membership.objects.create(collection=group, user=user)
                ContentSessionLogFactory.create(
                    user=user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
                )
                ContentSummaryLogFactory.create(
                    user=user, content_id=uuid.uuid4().hex, channel_id=uuid.uuid4().hex
                )
                UserSessionLogFactory.create(user=user)
        MorangoProfileController(PROFILE_FACILITY_DATA).serialize_into_store()

    @patch("kolibri.core.auth.management.commands.deprovision.confirm_or_exit")
    def test_deprovision_deletes_user_data_preserves_content(
        self, confirm_or_exit_mock
    ):
        models_that_should_remain = [
            content_models.LocalFile,
            content_models.ContentNode,
            content_models.File,
            content_models.AssessmentMetaData,
        ]
        assert count_instances(MODELS_DELETED_BY_DEPROVISION) > 0
        initial_model_count = count_instances(models_that_should_remain)
        assert initial_model_count > 0
        call_command("deprovision")
        assert count_instances(MODELS_DELETED_BY_DEPROVISION) == 0
        assert count_instances(models_that_should_remain) == initial_model_count


@override_settings(MORANGO_TEST_POSTGRESQL=True)
class TestDeprovisionDeletesAllFacilityModels(TestCase):
    """
    Verify that deprovision deletes all syncable facility model records,
    complementing the structural check in TestDeleteFacilityDeletesAllFacilityModels.
    """

    databases = "__all__"

    def setUp(self):
        facility, superuser = setup_device()
        # Create some data so models have records to delete
        for classroom in [ClassroomFactory.create(parent=facility) for _ in range(2)]:
            for group in [
                LearnerGroupFactory.create(parent=classroom) for _ in range(2)
            ]:
                user = FacilityUserFactory.create(facility=facility)
                auth_models.Membership.objects.create(collection=classroom, user=user)
                auth_models.Membership.objects.create(collection=group, user=user)
                ContentSessionLogFactory.create(
                    user=user,
                    content_id=uuid.uuid4().hex,
                    channel_id=uuid.uuid4().hex,
                )
                ContentSummaryLogFactory.create(
                    user=user,
                    content_id=uuid.uuid4().hex,
                    channel_id=uuid.uuid4().hex,
                )
                UserSessionLogFactory.create(user=user)
        MorangoProfileController(PROFILE_FACILITY_DATA).serialize_into_store()

    @patch("kolibri.core.auth.utils.deprovision.job_storage")
    def test_deprovision_deletes_all_syncable_facility_models(self, mock_job_storage):
        all_facility_models = set(syncable_models.get_models(PROFILE_FACILITY_DATA))
        # Verify data exists before deletion
        self.assertTrue(
            any(model.objects.count() > 0 for model in all_facility_models),
            "setUp failed to create any syncable facility model data",
        )
        deprovision_func()
        for model in all_facility_models:
            self.assertEqual(
                model.objects.count(),
                0,
                f"{model.__name__} was not fully deleted by deprovision",
            )


@override_settings(MORANGO_TEST_POSTGRESQL=True)
class TestDeprovisionCleanup(TestCase):
    """
    Tests that deprovision performs the same cleanup operations as delete_facility.
    """

    databases = "__all__"

    def setUp(self):
        setup_device()

    @patch("kolibri.core.auth.utils.deprovision.job_storage")
    @patch("kolibri.core.auth.utils.deprovision.clean_up_legacy_counters")
    def test_deprovision_calls_clean_up_legacy_counters(
        self, mock_cleanup, mock_job_storage
    ):
        deprovision_func()
        mock_cleanup.assert_called_once()

    @patch("kolibri.core.auth.utils.deprovision.job_storage")
    @patch("kolibri.core.auth.utils.deprovision.dataset_cache")
    def test_deprovision_clears_dataset_cache(self, mock_cache, mock_job_storage):
        deprovision_func()
        mock_cache.clear.assert_called_once()
