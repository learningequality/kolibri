import json
import uuid

import mock
from django.test import TestCase
from morango.constants import transfer_statuses
from morango.errors import MorangoSkipOperation
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store
from morango.sync.context import LocalSessionContext

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.sync_operations import _INTEGRITY_ERROR_EXCEPTION
from kolibri.core.auth.sync_operations import PicturePasswordCollisionOperation

COLLISION_PASSWORD = "1.2.3"
OTHER_EXCEPTION = "django.core.exceptions.ValidationError"


def _make_context(transfer_session_id=None, is_receiver=True):
    ctx = mock.MagicMock(spec=LocalSessionContext)
    ctx.is_receiver = is_receiver
    ctx.filter = mock.MagicMock()
    ctx.transfer_session.id = transfer_session_id or uuid.uuid4().hex
    ctx.sync_session.profile = PROFILE_FACILITY_DATA
    return ctx


def _make_broken_store(
    dataset_id, transfer_session_id, picture_password=COLLISION_PASSWORD, **overrides
):
    """Create a Store record that looks like a failed deserialization of an incoming FacilityUser."""
    store_id = uuid.uuid4().hex
    serialized = json.dumps(
        {"picture_password": picture_password, "username": "remote_user"}
    )
    defaults = dict(
        id=store_id,
        serialized=serialized,
        deleted=False,
        last_saved_instance=uuid.uuid4().hex,
        last_saved_counter=1,
        hard_deleted=False,
        model_name=FacilityUser.morango_model_name,
        profile=PROFILE_FACILITY_DATA,
        partition="{}:user-ro:{}".format(dataset_id, store_id),
        source_id=store_id,
        dirty_bit=True,
        deserialization_exception=_INTEGRITY_ERROR_EXCEPTION,
        deserialization_error="UNIQUE constraint failed: kolibriauth_facilityuser.dataset_id, kolibriauth_facilityuser.picture_password",
        last_transfer_session_id=transfer_session_id,
    )
    defaults.update(overrides)
    Store.objects.create(**defaults)
    return store_id


class PicturePasswordCollisionOperationTestCase(TestCase):
    def setUp(self):
        self.operation = PicturePasswordCollisionOperation()
        self.facility = Facility.objects.create(name="Test Facility")
        self.dataset_id = self.facility.dataset_id
        self.transfer_session_id = uuid.uuid4().hex
        self.context = _make_context(self.transfer_session_id)

    # --- context guards ---

    def test_guard_raises_when_not_receiver(self):
        """Operation must skip (raise MorangoSkipOperation) when context.is_receiver is False."""
        self.context.is_receiver = False
        with self.assertRaises(MorangoSkipOperation):
            self.operation.handle(self.context)

    # --- super().handle() passthrough ---

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.PENDING,
    )
    def test_returns_immediately_if_super_not_completed(self, mock_super):
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.PENDING, result)
        mock_super.assert_called_once_with(self.context)

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.ERRORED,
    )
    def test_returns_immediately_if_super_errored(self, mock_super):
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.ERRORED, result)

    # --- no broken stores ---

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_completed_with_no_broken_stores(self, mock_get_dataset_id, mock_super):
        mock_get_dataset_id.return_value = self.dataset_id
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.COMPLETED, result)

    # --- Store with different exception is not touched ---

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_ignores_store_with_different_exception(
        self, mock_get_dataset_id, mock_super
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        store_id = _make_broken_store(
            self.dataset_id,
            self.transfer_session_id,
            deserialization_exception=OTHER_EXCEPTION,
            deserialization_error="some error",
        )
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.COMPLETED, result)
        store = Store.objects.get(id=store_id)
        self.assertEqual(OTHER_EXCEPTION, store.deserialization_exception)

    # --- Store with dirty_bit=False is not touched ---

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_ignores_store_with_clean_dirty_bit(self, mock_get_dataset_id, mock_super):
        mock_get_dataset_id.return_value = self.dataset_id
        store_id = _make_broken_store(
            self.dataset_id,
            self.transfer_session_id,
            dirty_bit=False,
            deserialization_error="UNIQUE constraint",
        )
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.COMPLETED, result)
        store = Store.objects.get(id=store_id)
        self.assertEqual(_INTEGRITY_ERROR_EXCEPTION, store.deserialization_exception)

    # --- no matching local users ---

    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_completed_when_no_local_user_matches(
        self, mock_get_dataset_id, mock_super
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        _make_broken_store(
            self.dataset_id, self.transfer_session_id, picture_password="9.8.7"
        )
        result = self.operation.handle(self.context)
        self.assertEqual(transfer_statuses.COMPLETED, result)

    # --- core collision resolution ---

    @mock.patch(
        "kolibri.core.auth.sync_operations._deserialize_from_store",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_local_user_reassigned_new_password(
        self, mock_get_dataset_id, mock_super, mock_deserialize
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        local_user = FacilityUser.objects.create(
            username="local_learner",
            facility=self.facility,
            picture_password=COLLISION_PASSWORD,
        )
        broken_store_id = _make_broken_store(self.dataset_id, self.transfer_session_id)

        result = self.operation.handle(self.context)

        self.assertEqual(transfer_statuses.COMPLETED, result)
        local_user.refresh_from_db()
        self.assertNotEqual(COLLISION_PASSWORD, local_user.picture_password)
        self.assertIsNotNone(local_user.picture_password)

        # incoming Store serialized field must not change
        broken_store = Store.objects.get(id=broken_store_id)
        self.assertEqual(
            COLLISION_PASSWORD, json.loads(broken_store.serialized)["picture_password"]
        )

        # errors cleared
        self.assertIsNone(broken_store.deserialization_error)
        self.assertIsNone(broken_store.deserialization_exception)

        # _deserialize_from_store called for retry
        mock_deserialize.assert_called_once()

    @mock.patch(
        "kolibri.core.auth.sync_operations._deserialize_from_store",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    def test_deleted_models_cleaned_up(
        self, mock_get_dataset_id, mock_super, mock_deserialize
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        FacilityUser.objects.create(
            username="local_learner",
            facility=self.facility,
            picture_password=COLLISION_PASSWORD,
        )
        broken_store_id = _make_broken_store(self.dataset_id, self.transfer_session_id)
        DeletedModels.objects.create(id=broken_store_id, profile=PROFILE_FACILITY_DATA)
        HardDeletedModels.objects.create(
            id=broken_store_id, profile=PROFILE_FACILITY_DATA
        )

        self.operation.handle(self.context)

        self.assertFalse(DeletedModels.objects.filter(id=broken_store_id).exists())
        self.assertFalse(HardDeletedModels.objects.filter(id=broken_store_id).exists())

    @mock.patch(
        "kolibri.core.auth.sync_operations._deserialize_from_store",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
        return_value=True,
    )
    def test_local_user_set_to_none_when_exhausted(
        self, mock_exhausted, mock_get_dataset_id, mock_super, mock_deserialize
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        local_user = FacilityUser.objects.create(
            username="local_learner",
            facility=self.facility,
            picture_password=COLLISION_PASSWORD,
        )
        _make_broken_store(self.dataset_id, self.transfer_session_id)

        self.operation.handle(self.context)

        local_user.refresh_from_db()
        self.assertIsNone(local_user.picture_password)

    @mock.patch(
        "kolibri.core.auth.sync_operations._deserialize_from_store",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
        return_value=transfer_statuses.COMPLETED,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_dataset_id",
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
        return_value=False,
    )
    @mock.patch(
        "kolibri.core.auth.sync_operations.get_all_valid_sequences",
        return_value=set(),
    )
    def test_local_user_set_to_none_when_no_sequences_available(
        self,
        mock_sequences,
        mock_exhausted,
        mock_get_dataset_id,
        mock_super,
        mock_deserialize,
    ):
        mock_get_dataset_id.return_value = self.dataset_id
        local_user = FacilityUser.objects.create(
            username="local_learner",
            facility=self.facility,
            picture_password=COLLISION_PASSWORD,
        )
        _make_broken_store(self.dataset_id, self.transfer_session_id)

        self.operation.handle(self.context)

        local_user.refresh_from_db()
        self.assertIsNone(local_user.picture_password)
