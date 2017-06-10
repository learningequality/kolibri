from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView
from kolibri.auth.models import Facility


class UserView(TemplateView):
    template_name = "user/user.html"

    def get_context_data(self, **kwargs):
        context = super(UserView, self).get_context_data(**kwargs)

        context['currentFacilityId'] = Facility.get_default_facility().id

        return context
