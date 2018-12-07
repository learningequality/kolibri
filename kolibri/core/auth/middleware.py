from django.contrib.auth import get_user
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.utils.functional import SimpleLazyObject

from .models import KolibriAnonymousUser


def _get_user(request):

    if not hasattr(request, '_cached_user'):
        user = get_user(request)
        if user.is_anonymous():
            user = KolibriAnonymousUser()
        request._cached_user = user

    return request._cached_user


class CustomAuthenticationMiddleware(AuthenticationMiddleware):
    """
    Adaptation of Django's ``account.middleware.AuthenticationMiddleware``
    to replace the default AnonymousUser with a custom implementation.
    """

    def process_request(self, request):
        assert hasattr(request, 'session'), (
            "The authentication middleware requires session middleware "
            "to be installed. Edit your MIDDLEWARE_CLASSES setting to insert "
            "'django.contrib.sessions.middleware.SessionMiddleware' before "
            "'kolibri.core.auth.middleware.CustomAuthenticationMiddleware'."
        )
        request.user = SimpleLazyObject(lambda: _get_user(request))
