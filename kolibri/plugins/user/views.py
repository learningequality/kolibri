from __future__ import absolute_import, print_function, unicode_literals
from django.views.generic.base import TemplateView
from kolibri.auth.models import Facility


class UserView(TemplateView):
    template_name = "user/user.html"

    def get_context_data(self, **kwargs):
        context = super(UserView, self).get_context_data(**kwargs)

        # Put the default facility id into the page so that we can bootstrap the
        # dataset for this facility into the page and allow for quicker rendering
        # of the login page, without having to wait for an AJAX call.

        context['currentFacilityId'] = getattr(Facility.get_default_facility(), 'id', None)

        return context
