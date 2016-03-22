from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView


class ComponentDemoView(TemplateView):
    template_name = "kolibri/component_demo.html"
