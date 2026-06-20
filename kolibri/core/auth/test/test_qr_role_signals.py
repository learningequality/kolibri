from django.test import TestCase

from ..constants import role_kinds
from ..models import Classroom
from ..models import Facility
from ..models import FacilityUser
from ..models import Role
from ..utils.qr_tokens import assign_qr_login_token
from .helpers import disable_qr_login
from .helpers import enable_qr_login


class RoleSaveClearsQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="RoleSaveQRFacility")

    def test_creating_role_clears_existing_qr_login_token(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        learner.qr_login_token = "a" * 43
        learner.save(update_fields=["qr_login_token"])

        Role.objects.create(
            user=learner,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )

        learner.refresh_from_db()
        self.assertIsNone(learner.qr_login_token)


class RoleDeleteReassignsQRLoginTokenTestCase(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = Facility.objects.create(name="RoleDeleteQRFacility")
        enable_qr_login(cls.facility)

    def test_last_role_deleted_assigns_qr_login_token(self):
        learner = FacilityUser.objects.create(
            username="learner", facility=self.facility
        )
        assign_qr_login_token(learner)
        self.assertIsNotNone(learner.qr_login_token)

        role = Role.objects.create(
            user=learner,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )
        learner.refresh_from_db()
        self.assertIsNone(learner.qr_login_token)

        role.delete()

        learner.refresh_from_db()
        self.assertIsNotNone(learner.qr_login_token)
        self.assertGreaterEqual(len(learner.qr_login_token), 16)

    def test_remaining_role_prevents_qr_login_token_assignment(self):
        learner = FacilityUser.objects.create(
            username="tworoles", facility=self.facility
        )
        role1 = Role.objects.create(
            user=learner,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )
        classroom = Classroom.objects.create(parent=self.facility)
        Role.objects.create(
            user=learner,
            collection=classroom,
            kind=role_kinds.COACH,
        )

        role1.delete()

        learner.refresh_from_db()
        self.assertIsNone(learner.qr_login_token)
        self.assertTrue(Role.objects.filter(user=learner).exists())

    def test_no_assignment_when_qr_login_disabled(self):
        disable_qr_login(self.facility)
        learner = FacilityUser.objects.create(
            username="nologinqr", facility=self.facility
        )
        role = Role.objects.create(
            user=learner,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )

        role.delete()

        learner.refresh_from_db()
        self.assertIsNone(learner.qr_login_token)

    def test_existing_qr_login_token_not_overwritten(self):
        learner = FacilityUser.objects.create(
            username="alreadyhas", facility=self.facility
        )
        role = Role.objects.create(
            user=learner,
            collection=self.facility,
            kind=role_kinds.ADMIN,
        )
        FacilityUser.objects.filter(pk=learner.pk).update(qr_login_token="b" * 43)

        role.delete()

        learner.refresh_from_db()
        self.assertEqual(learner.qr_login_token, "b" * 43)
