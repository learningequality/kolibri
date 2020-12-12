# -*- coding: utf-8 -*-
from __future__ import unicode_literals

from django.http import HttpRequest
from django.http import HttpResponse
from django.test import SimpleTestCase

from kolibri.core.auth.middleware import KolibriSessionMiddleware
from kolibri.core.auth.middleware import session_exempt


def view(request):
    return HttpResponse()


class CsrfViewMiddlewareTestMixin(SimpleTestCase):

    mw = KolibriSessionMiddleware()

    def test_process_request(self):
        req = HttpRequest()
        self.mw.process_request(req)
        req2 = self.mw.process_view(req, view, (), {})
        self.assertIsNone(req2)
        self.assertFalse(self.mw._is_exempt(req))

    def test_process_request_session_exempt_view(self):
        req = HttpRequest()
        self.mw.process_request(req)
        req2 = self.mw.process_view(req, session_exempt(view), (), {})
        self.assertIsNone(req2)
        self.assertTrue(self.mw._is_exempt(req))
