from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView


class FacilityManagementView(TemplateView):
    template_name = "facility_management.html"
