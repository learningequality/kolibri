from django.conf import settings
from django.core.urlresolvers import reverse
from django.shortcuts import redirect
from django.utils.deprecation import MiddlewareMixin

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import KolibriAnonymousUser

ALLOWED_PATH_LIST = [
    'deviceprovision',
    'kolibri:setupwizardplugin:setupwizard',
    'kolibri:set_language',
    'session-list'
    'admin:index',
]


class RedirectToSignInPageIfNoGuestAccessAndNoActiveSession(MiddlewareMixin):
    """
    Redirect to the sign in page if facility does not allow guest access and user
    has not signed into the facility.
    """

    def process_request(self, request):
        # Don't redirect for URLs that are required for the setup wizard
        allowed_paths = [reverse(name) for name in ALLOWED_PATH_LIST]
        if settings.DEBUG:  # allow anonymous rest api browsing
            allowed_paths.append('/api')
        if any(request.path.startswith(path_prefix) for path_prefix in allowed_paths):
            return

        if isinstance(request.user, KolibriAnonymousUser):
            dataset = getattr(Facility.get_default_facility(), 'dataset', None)
            if dataset and not dataset.allow_guest_access:
                if not request.path.startswith(reverse("kolibri:user:user")):
                    return redirect(reverse("kolibri:user:user"))
