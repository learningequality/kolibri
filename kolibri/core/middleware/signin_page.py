from django.conf import settings
from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin
from rest_framework.views import APIView

from kolibri.core.auth.constants import user_kinds
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import KolibriAnonymousUser
from kolibri.core.views import get_urls_by_role


class RedirectToSignInPageIfNoGuestAccessAndNoActiveSession(MiddlewareMixin):
    """
    Redirect to the sign in page if facility does not allow guest access and user
    has not signed into the facility.
    """
    def process_view(self, request, view_func, view_args, view_kwargs):
        if getattr(view_func, 'signin_redirect_exempt', False):
            return None

        # allow anonymous api browsing for any DRF views
        if settings.DEBUG:
            if hasattr(view_func, 'cls'):
                if issubclass(view_func.cls, APIView):
                    return None

        if isinstance(request.user, KolibriAnonymousUser):
            dataset = getattr(Facility.get_default_facility(), 'dataset', None)
            if dataset and not dataset.allow_guest_access:
                anon_urls = get_urls_by_role(user_kinds.ANONYMOUS)
                allowable_urls = list(anon_urls) + [reverse('admin:index')]
                if not any(map(lambda x: request.path.startswith(x), allowable_urls)):
                    return redirect(reverse('kolibri:core:redirect_user'))
