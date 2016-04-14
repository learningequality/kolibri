from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView


class RiotDemoView(TemplateView):
    template_name = "kolibri/riot_demo_django.html"
