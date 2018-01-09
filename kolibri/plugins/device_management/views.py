from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView


class DeviceManagementView(TemplateView):
    template_name = "device_management.html"
