import json
import uuid

import mock
from django.test import TestCase
from morango.constants import transfer_statuses
from morango.models import DeletedModels
from morango.models import HardDeletedModels
from morango.models import Store

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.sync_operations import _INTEGRITY_ERROR_EXCEPTION
from kolibri.core.auth.sync_operations import PicturePasswordCollisionOperation
from kolibri.core.auth.test.helpers import make_sync_context


def _make_store(
    dataset_id,
    transfer_session_id,
    picture_password="1.2.3",
    deserialization_exception=_INTEGRITY_ERROR_EXCEPTION,
    dirty_bit=True,
    deleted=False,
):
    user_id = uuid.uuid4().hex
    store = Store.objects.create(
        id=user_id,
        profile=PROFILE_FACILITY_DATA,
        partition="{dataset_id}:user-ro:{user_id}".format(
            dataset_id=dataset_id, user_id=user_id
        ),
        source_id=user_id,
        model_name=FacilityUser.morango_model_name,
        serialized=json.dumps(
            {
                "id": user_id,
                "username": "remote_user_{}".format(user_id[:6]),
                "password": "pbkdf2_sha256$260000$fakesalt$fakehashedvalue=",
                "full_name": "Remote User",
                "is_superuser": False,
                "dataset_id": dataset_id,
                "picture_password": picture_password,
            }
        ),
        dirty_bit=dirty_bit,
        deleted=deleted,
        deserialization_exception=deserialization_exception,
        last_transfer_session_id=transfer_session_id,
        last_saved_instance=uuid.uuid4(),
        last_saved_counter=1,
    )
    return store


class PicturePasswordCollisionOperationTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="Test Facility")
        cls.dataset_id = cls.facility.dataset_id
        cls.transfer_session_id = uuid.uuid4()
        # A local learner already holds picture_password "1.2.3"
        FacilityUser.objects.create(
            username="local_learner",
            facility=cls.facility,
            picture_password="1.2.3",
        )

    def setUp(self):
        self.operation = PicturePasswordCollisionOperation()

    def _patch_super_handle(self, return_value=transfer_statuses.COMPLETED):
        return mock.patch(
            "kolibri.core.auth.sync_operations.ReceiverDeserializeOperation.handle",
            return_value=return_value,
        )

    def _patch_dataset_id(self):
        return mock.patch(
            "kolibri.core.auth.sync_operations.get_dataset_id",
            return_value=self.dataset_id,
        )

    def test_no_broken_records__returns_completed(self):
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id():
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)

    def test_non_completed_super_result__returns_immediately(self):
        store = _make_store(self.dataset_id, self.transfer_session_id)
        original_serialized = store.serialized
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(
            transfer_statuses.PENDING
        ), self._patch_dataset_id():
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.PENDING)
        store.refresh_from_db()
        self.assertEqual(store.serialized, original_serialized)

    def test_corrects_colliding_record__new_sequence_assigned(self):
        store = _make_store(self.dataset_id, self.transfer_session_id)
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id(), mock.patch(
            "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
            return_value=False,
        ), mock.patch(
            "kolibri.core.auth.sync_operations._deserialize_from_store"
        ) as mock_deserialize:
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        mock_deserialize.assert_called_once()
        store.refresh_from_db()
        # dirty_bit must stay True so the immediate re-deserialization retries the record
        self.assertTrue(store.dirty_bit)
        data = json.loads(store.serialized)
        self.assertNotEqual(data["picture_password"], "1.2.3")
        self.assertIsNotNone(data["picture_password"])

    def test_corrected_record__deleted_state_cleared(self):
        store = _make_store(self.dataset_id, self.transfer_session_id, deleted=True)
        DeletedModels.objects.create(id=store.id, profile=PROFILE_FACILITY_DATA)
        HardDeletedModels.objects.create(id=store.id, profile=PROFILE_FACILITY_DATA)
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id(), mock.patch(
            "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
            return_value=False,
        ), mock.patch("kolibri.core.auth.sync_operations._deserialize_from_store"):
            self.operation.handle(context)
        store.refresh_from_db()
        self.assertFalse(store.deleted)
        self.assertIsNone(store.deserialization_exception)
        self.assertIsNone(store.deserialization_error)
        self.assertTrue(store.dirty_bit)
        self.assertFalse(DeletedModels.objects.filter(id=store.id).exists())
        self.assertFalse(HardDeletedModels.objects.filter(id=store.id).exists())

    def test_exhausted_facility__sets_picture_password_none(self):
        store = _make_store(self.dataset_id, self.transfer_session_id)
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id(), mock.patch(
            "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
            return_value=True,
        ), mock.patch(
            "kolibri.core.auth.sync_operations._deserialize_from_store"
        ) as mock_deserialize:
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        mock_deserialize.assert_called_once()
        store.refresh_from_db()
        self.assertTrue(store.dirty_bit)
        data = json.loads(store.serialized)
        self.assertIsNone(data["picture_password"])

    def test_no_available_sequences__sets_exhausted_continues(self):
        store1 = _make_store(self.dataset_id, self.transfer_session_id)
        store2 = _make_store(self.dataset_id, self.transfer_session_id)
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id(), mock.patch(
            "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
            return_value=False,
        ), mock.patch(
            "kolibri.core.auth.sync_operations.get_all_valid_sequences",
            return_value=set(),
        ), mock.patch(
            "kolibri.core.auth.sync_operations._deserialize_from_store"
        ) as mock_deserialize:
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        mock_deserialize.assert_called_once()
        for store in [store1, store2]:
            store.refresh_from_db()
            data = json.loads(store.serialized)
            self.assertIsNone(data["picture_password"])

    def test_unrelated_error__not_touched(self):
        store = _make_store(
            self.dataset_id,
            self.transfer_session_id,
            deserialization_exception="django.db.utils.OperationalError",
        )
        original_serialized = store.serialized
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id():
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        store.refresh_from_db()
        self.assertEqual(store.serialized, original_serialized)
        self.assertEqual(
            store.deserialization_exception, "django.db.utils.OperationalError"
        )

    def test_clean_record__not_touched(self):
        store = _make_store(self.dataset_id, self.transfer_session_id, dirty_bit=False)
        original_serialized = store.serialized
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id():
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        store.refresh_from_db()
        self.assertEqual(store.serialized, original_serialized)

    def test_returns_completed_after_correction(self):
        _make_store(self.dataset_id, self.transfer_session_id)
        context = make_sync_context(self.transfer_session_id)
        with self._patch_super_handle(), self._patch_dataset_id(), mock.patch(
            "kolibri.core.auth.sync_operations.are_picture_passwords_exhausted",
            return_value=False,
        ), mock.patch(
            "kolibri.core.auth.sync_operations._deserialize_from_store"
        ) as mock_deserialize:
            result = self.operation.handle(context)
        self.assertEqual(result, transfer_statuses.COMPLETED)
        mock_deserialize.assert_called_once()
