from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

from django.views.generic.base import TemplateView

from kolibri.core.views import RootURLRedirectView


class UserAuthView(TemplateView):
    template_name = "user_auth/user_auth.html"

    def get(self, request):
        """
        When authenticated, redirect to the appropriate view
        """
        if request.user.is_authenticated():
            return RootURLRedirectView.as_view()(request)
        return super(UserAuthView, self).get(request)
