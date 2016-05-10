from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase

from ..middleware import _get_user, CustomAuthenticationMiddleware
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
