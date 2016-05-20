from __future__ import absolute_import, print_function, unicode_literals

from django.views.generic.base import TemplateView


class ManagementView(TemplateView):

    template_name = "management/management.html"
