from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import KolibriAnonymousUser


SESSION_URL = reverse('session-list')
USER_SIGNIN_URL = reverse("kolibri:user:user")


class RedirectToSignInPageIfNoGuestAccessAndNoActiveSession(MiddlewareMixin):
    """
    Redirect to the sign in page if facility does not allow guest access and user
    has not signed into the facility.
    """

    def process_request(self, request):
        if isinstance(request.user, KolibriAnonymousUser):
            dataset = getattr(Facility.get_default_facility(), 'dataset', None)
            if dataset and not dataset.allow_guest_access:
                if not request.path.startswith(USER_SIGNIN_URL) and not request.path.startswith(SESSION_URL):
                    return redirect(USER_SIGNIN_URL)
