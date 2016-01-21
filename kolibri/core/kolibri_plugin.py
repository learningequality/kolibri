# -*- coding: utf-8 -*-
"""
The core app of Kolibri also uses the plugin API <3
"""
from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.utils.translation import ugettext as _
from django.core.urlresolvers import reverse


from kolibri.plugins.base import KolibriPluginBase
from kolibri.plugins.hooks import NAVIGATION_POPULATE


class KolibriCore(KolibriPluginBase):

    def main_navigation(self):
        return [{
            'menu_name': _("Start page"),
            'menu_url': reverse('kolibri:index'),
        }]

    def hooks(self):
        return {
            NAVIGATION_POPULATE: self.main_navigation
        }
