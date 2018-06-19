from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.test import TestCase

from kolibri.core.templatetags import kolibri_tags


class KolibriTagNavigationTestCase(TestCase):

    def test_navigation_tag(self):
        self.assertTrue(
            len(list(kolibri_tags.kolibri_navigation_actions())) > 0
        )
