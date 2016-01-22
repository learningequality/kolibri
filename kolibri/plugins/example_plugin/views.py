# -*- coding: utf-8 -*-
"""Views for ExamplePlugin


.. moduleauthor:: Learning Equality <info@learningequality.org>

"""
from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView


class MyView(TemplateView):
    template_name = "kolibri/plugins/example_plugin/index.html"
