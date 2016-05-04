import importlib

from django.conf import settings
from django.contrib.auth import get_user
from django.contrib.auth.middleware import AuthenticationMiddleware

module, klass = settings.AUTH_ANONYMOUS_USER_MODEL.rsplit('.', 1)
CustomAnonymousUser = getattr(importlib.import_module(module), klass)


class CustomAuthenticationMiddleware(AuthenticationMiddleware):
    """
    Adaptation of Django's ``account.middleware.AuthenticationMiddleware``
    to replace the default AnonymousUser with a custom implementation.
    """

    def _get_cached_user(self, request):

        if not hasattr(request, '_cached_user'):
            user = get_user(request)
            if user.is_anonymous():
                user = CustomAnonymousUser()
            request._cached_user = user

        return request._cached_user

    def process_request(self, request):
        assert hasattr(request, 'session'), (
            "The authentication middleware requires session middleware "
            "to be installed. Edit your MIDDLEWARE_CLASSES setting to insert "
            "'django.contrib.sessions.middleware.SessionMiddleware' before "
            "'kolibri.auth.middleware.CustomAuthenticationMiddleware'."
        )
        request.user = self._get_cached_user(request)
