from django.test import TestCase

from kolibri.core.auth.models import Session
from kolibri.core.auth.test.helpers import clear_process_cache
from kolibri.core.auth.test.helpers import create_os_user
from kolibri.core.auth.test.helpers import create_privileged_os_users
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.core.auth.test.test_api import FacilityUserFactory
from kolibri.core.auth.upgrade import sign_out_privileged_os_users
from kolibri.core.device.utils import set_device_settings


class SignOutPrivilegedOSUsersTestCase(TestCase):
    databases = "__all__"

    @classmethod
    def setUpTestData(cls):
        provision_device()
        cls.facility = FacilityFactory.create()

    def _sign_in(self, user):
        session = Session.get_session_store_class()()
        session["_auth_user_id"] = str(user.id)
        session.create()

    def _has_session(self, user):
        return Session.objects.filter(user_id=user.id).exists()

    def test_privileged_os_users_are_signed_out(self):
        privileged_os_users = create_privileged_os_users(self.facility)
        learner = create_os_user(self.facility, "os_learner")
        admin = FacilityUserFactory.create(facility=self.facility)
        self.facility.add_admin(admin)
        for user in [*privileged_os_users, learner, admin]:
            self._sign_in(user)

        sign_out_privileged_os_users()

        for user in privileged_os_users:
            with self.subTest(username=user.username):
                self.assertFalse(self._has_session(user))
        for user in (learner, admin):
            with self.subTest(username=user.username):
                self.assertTrue(self._has_session(user))

    def test_privileged_os_users_stay_signed_in_on_learner_only_device(self):
        set_device_settings(subset_of_users_device=True)
        self.addCleanup(clear_process_cache)
        privileged_os_users = create_privileged_os_users(self.facility)
        for user in privileged_os_users:
            self._sign_in(user)

        sign_out_privileged_os_users()

        for user in privileged_os_users:
            with self.subTest(username=user.username):
                self.assertTrue(self._has_session(user))
