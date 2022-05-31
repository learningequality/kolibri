from django.contrib.auth import SESSION_KEY
from rest_framework.test import APITestCase

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.test.helpers import create_superuser
from kolibri.core.auth.test.helpers import provision_device
from kolibri.core.auth.test.test_api import FacilityFactory
from kolibri.plugins.app.test.helpers import register_capabilities
from kolibri.plugins.app.utils import GET_OS_USER
from kolibri.plugins.app.utils import interface
from kolibri.plugins.utils.test.helpers import plugin_enabled


class InitializeEndpointTestCase(APITestCase):
    @classmethod
    def setUpTestData(cls):
        cls.facility = FacilityFactory.create()
        provision_device(default_facility=cls.facility)
        cls.superuser = create_superuser(cls.facility)

    def test_os_user_capability_enabled_log_in(self):
        with plugin_enabled("kolibri.plugins.app"), register_capabilities(
            **{GET_OS_USER: lambda x: ("test_user", False)}
        ):
            initialize_url = interface.get_initialize_url(auth_token="test")
            self.client.get(initialize_url)
            session_data = self.client.session.load()
            user_id = session_data.get(SESSION_KEY)
            user = FacilityUser.objects.get(id=user_id)
            self.assertTrue(user.os_user)
            self.assertEqual(user.os_user.os_username, "test_user")
            self.assertNotEqual(self.superuser.id, user.id)

    def test_no_os_user_capability_no_log_in(self):
        with plugin_enabled("kolibri.plugins.app"):
            initialize_url = interface.get_initialize_url()
            self.client.get(initialize_url)
            session_data = self.client.session.load()
            user_id = session_data.get(SESSION_KEY)
            self.assertIsNone(user_id)

    def test_os_user_capability_enabled_already_logged_in_no_change(self):
        with plugin_enabled("kolibri.plugins.app"), register_capabilities(
            **{GET_OS_USER: lambda x: ("test_user", False)}
        ):
            self.client.login(username=self.superuser.username, password="password")
            initialize_url = interface.get_initialize_url(auth_token="test")
            self.client.get(initialize_url)
            session_data = self.client.session.load()
            user_id = session_data.get(SESSION_KEY)
            user = FacilityUser.objects.get(id=user_id)
            self.assertFalse(hasattr(user, "os_user"))
            self.assertEqual(self.superuser.id, user.id)
