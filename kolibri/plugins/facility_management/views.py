from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView


class FacilityManagementView(TemplateView):
    template_name = "facility_management.html"
