from __future__ import absolute_import, print_function, unicode_literals

from django.template import Template, RequestContext
from rest_framework.test import APITestCase
from unittest import TestCase

from kolibri.core.context_processors.custom_context_processor import pass_browser_entry

import json
import mock


class ContextProcessorTestCase(APITestCase):

    def setUp(self):
        self.request = mock.Mock()
        self.request.session = {}
        self.request.META = {}
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


class BrowserEntryTestCase(TestCase):
    def test_pass_browser_entry_patch_fail(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (4, 0, 1, )
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 4,
            'minor_version': 0,
            'patch_version': 2,
        }
        self.assertFalse(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_patch_pass(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (4, 0, 2, )
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 4,
            'minor_version': 0,
            'patch_version': 2,
        }
        self.assertTrue(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_minor_fail(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (4, 0, 1)
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 4,
            'minor_version': 1,
        }
        self.assertFalse(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_minor_pass(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (4, 1, 1)
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 4,
            'minor_version': 1,
        }
        self.assertTrue(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_major_fail(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (4, 0, 1)
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 5,
        }
        self.assertFalse(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_major_pass(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (5, 0, 1)
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'major_version': 5,
        }
        self.assertTrue(pass_browser_entry(user_agent, entry))

    def test_pass_browser_entry_black_fail(self):
        user_agent = mock.MagicMock()
        browser_mock = mock.MagicMock()
        browser_mock.family = 'Android'
        browser_mock.version = (5, 0, 1)
        user_agent.browser = browser_mock
        entry = {
            'family': 'Android',
            'blacklist': True,
        }
        self.assertFalse(pass_browser_entry(user_agent, entry))
