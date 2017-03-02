from __future__ import absolute_import, print_function, unicode_literals

from django.template import Template, RequestContext
from rest_framework.test import APITestCase

import json
import mock


class ContextProcessorTestCase(APITestCase):

    def setUp(self):
        self.request = mock.Mock()
        self.request.session = {}
        self.template = Template("My name is...")
        self.context = RequestContext(self.request)

    def test_context_added_with_context_processor(self):
        with mock.patch('kolibri.auth.api.SessionViewSet.get_session', return_value={"context": True}):
            with self.context.bind_template(self.template):
                self.assertEqual(json.loads(self.context['session'])['context'], True)

    def tearDown(self):
        self.request = None
        self.template = None
        self.context = None
