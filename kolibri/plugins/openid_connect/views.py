from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.contrib.auth import logout as auth_logout
from django.shortcuts import redirect
from django.views.generic.base import TemplateView
from mozilla_django_oidc.utils import is_authenticated

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


def logout(request):
    if is_authenticated(request.user):
        auth_logout(request)
    return redirect('/')
