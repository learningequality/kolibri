from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from unittest import TestCase

import mock

from kolibri.core.context_processors.custom_context_processor import pass_browser_entry


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
