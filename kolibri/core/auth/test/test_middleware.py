from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.core.exceptions import ImproperlyConfigured
from django.test import override_settings
from django.test import TestCase

from ..middleware import _get_user
from ..middleware import CustomAuthenticationMiddleware
from ..middleware import get_anonymous_user_model
from ..models import KolibriAnonymousUser


class DummyRequestObject(object):
    def __init__(self):
        self.session = {}


class AuthMiddlewareTestCase(TestCase):
    def test_custom_anonymous_user(self):
        request = DummyRequestObject()
        mw = CustomAuthenticationMiddleware()
        mw.process_request(request)
        self.assertIsInstance(request.user, KolibriAnonymousUser)

    def test_custom_anonymous_user_caching(self):
        # this test specifically helps with code coverage by checking user caching
        request = DummyRequestObject()
        user = _get_user(request)
        self.assertIsInstance(user, KolibriAnonymousUser)
        user = _get_user(request)
        self.assertIsInstance(user, KolibriAnonymousUser)

    @override_settings(AUTH_ANONYMOUS_USER_MODEL=None)
    def test_custom_anonymous_user_customization_invalid_setting(self):
        with self.assertRaisesRegexp(ImproperlyConfigured, "not a string"):
            get_anonymous_user_model()

    @override_settings(AUTH_ANONYMOUS_USER_MODEL="kolibriauth")
    def test_custom_anonymous_user_customization_only_app_name(self):
        with self.assertRaisesRegexp(
            ImproperlyConfigured,
            "AUTH_ANONYMOUS_USER_MODEL must be of the form 'app_label.model_name'",
        ):
            get_anonymous_user_model()

    @override_settings(
        AUTH_ANONYMOUS_USER_MODEL="not_a_real_app_name.KolibriAnonymousUser"
    )
    def test_custom_anonymous_user_customization_invalid_app_name(self):
        with self.assertRaisesRegexp(ImproperlyConfigured, "has not been installed"):
            get_anonymous_user_model()

    @override_settings(
        AUTH_ANONYMOUS_USER_MODEL="kolibriauth.NotTheKolibriAnonymousUser"
    )
    def test_custom_anonymous_user_customization_invalid_model_name(self):
        with self.assertRaisesRegexp(
            ImproperlyConfigured, "that does not exist in the app"
        ):
            get_anonymous_user_model()
