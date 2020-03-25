import uuid
from datetime import datetime, timedelta
from django.apps import apps
from django.conf import settings
from django.contrib.auth import get_user
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.core.exceptions import ImproperlyConfigured
from django.utils.functional import SimpleLazyObject


def get_anonymous_user_model():
    """
    Return the Anonymous User model that is active in this project.
    """
    try:
        app_name = settings.AUTH_ANONYMOUS_USER_MODEL.split(".")[0]
    except AttributeError:
        raise ImproperlyConfigured("AUTH_ANONYMOUS_USER_MODEL is not a string")
    try:
        model_name = settings.AUTH_ANONYMOUS_USER_MODEL.split(".")[1]
        app = apps.get_app_config(app_name)
        models_module = app.models_module
    except IndexError:
        raise ImproperlyConfigured(
            "AUTH_ANONYMOUS_USER_MODEL must be of the form 'app_label.model_name'"
        )
    except LookupError:
        raise ImproperlyConfigured(
            "AUTH_ANONYMOUS_USER_MODEL refers to an app '{}' that has not been installed".format(
                app_name
            )
        )
    try:
        return getattr(models_module, model_name)
    except AttributeError:
        raise ImproperlyConfigured(
            "AUTH_ANONYMOUS_USER_MODEL refers to a model '{}' that does not exist in the app '{}'".format(
                model_name, app_name
            )
        )


def _get_user(request):

    if not hasattr(request, "_cached_user"):
        user = get_user(request)
        if user.is_anonymous():
            AnonymousUser = get_anonymous_user_model()
            user = AnonymousUser()
        request._cached_user = user

    return request._cached_user


class CustomAuthenticationMiddleware(AuthenticationMiddleware):
    """
    Adaptation of Django's ``account.middleware.AuthenticationMiddleware``
    to replace the default AnonymousUser with a custom implementation.
    """

    def process_request(self, request):
        assert hasattr(request, "session"), (
            "The authentication middleware requires session middleware "
            "to be installed. Edit your MIDDLEWARE_CLASSES setting to insert "
            "'django.contrib.sessions.middleware.SessionMiddleware' before "
            "'kolibri.core.auth.middleware.CustomAuthenticationMiddleware'."
        )
        request.user = SimpleLazyObject(lambda: _get_user(request))

    def process_response(self, request, response):
        # If we don't have a session, just return the response.
        # We do this because we cannot ask request.user.is_anonymous()
        # if WSGIRequest doesn't have a session
        if not hasattr(request, "session"):
            return response

        # If we have a non-anonymous user, delete the cookie and respond
        if not request.user.is_anonymous():
            response.delete_cookie("anonymous_session_id")
            return response

        # Now we know user is anonymous - get 1200s cookie expiry from utcnow
        cookie_expiry = datetime.utcnow() + timedelta(seconds=1200)

        if not request.COOKIES.get("anonymous_session_id"):
            # Establish a cookie if there isn't one
            response.set_cookie(
                "anonymous_session_id", str(uuid.uuid4()), expires=cookie_expiry
            )
        else:
            # If the cookie isn't expired, reset the expiry because we know it is
            # an anonymous user and the cookie isn't expired yet because it came in the request.
            response.set_cookie(
                "anonymous_session_id",
                request.COOKIES.get("anonymous_session_id"),
                expires=cookie_expiry,
            )
        return response
