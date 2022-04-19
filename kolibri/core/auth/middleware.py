from django.apps import apps
from django.conf import settings
from django.contrib.auth import _get_user_session_key
from django.contrib.auth import get_user
from django.contrib.auth.middleware import AuthenticationMiddleware
from django.contrib.sessions.middleware import SessionMiddleware
from django.core.cache import cache
from django.core.exceptions import ImproperlyConfigured
from django.db.models.signals import post_save
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


USER_SESSION_CACHE_KEY = "USER_BY_SESSION_CACHE_{}"


def _get_user(request):
    if not hasattr(request, "_cached_user"):
        try:
            user_id = _get_user_session_key(request)
            USER_CACHE_KEY = USER_SESSION_CACHE_KEY.format(user_id)
            user = cache.get(USER_CACHE_KEY)
            if not user:
                user = get_user(request)
                cache.set(USER_CACHE_KEY, user)
        except KeyError:
            user = get_user(request)
        if user.is_anonymous():
            AnonymousUser = get_anonymous_user_model()
            user = AnonymousUser()
        request._cached_user = user

    return request._cached_user


def clear_user_cache(sender, instance, created, **kwargs):
    if not created:
        cache.delete(USER_SESSION_CACHE_KEY.format(instance.id))


post_save.connect(clear_user_cache, sender=settings.AUTH_USER_MODEL)


class CustomAuthenticationMiddleware(AuthenticationMiddleware):
    """
    Adaptation of Django's ``account.middleware.AuthenticationMiddleware``
    to replace the default AnonymousUser with a custom implementation.
    """

    def process_request(self, request):
        if not hasattr(request, "session"):
            raise AssertionError(
                "The authentication middleware requires session middleware "
                "to be installed. Edit your MIDDLEWARE_CLASSES setting to insert "
                "'django.contrib.sessions.middleware.SessionMiddleware' before "
                "'kolibri.core.auth.middleware.CustomAuthenticationMiddleware'."
            )
        request.user = SimpleLazyObject(lambda: _get_user(request))


class XhrPreventLoginPromptMiddleware(object):
    """
    By default, HTTP 401 responses are sent with a ``WWW-Authenticate``
    header. Web browsers react to this header by displaying a login prompt
    dialog.  By removing the header, the login prompt can be avoided.  While
    this isn't recommended in general, there's a convention of removing it
    for XHR requests, so that unauthenticated XHR requests don't trigger a
    popup.

    See `here <https://stackoverflow.com/a/20221330>`_ for reference.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        response = self.get_response(request)
        if response and response.status_code == 401 and request.is_ajax():
            del response["WWW-Authenticate"]
        return response


SESSION_EXEMPT = "_session_exempt"


def session_exempt(view):
    def wrapper_func(*args, **kwargs):
        return view(*args, **kwargs)

    setattr(wrapper_func, SESSION_EXEMPT, True)
    return wrapper_func


class KolibriSessionMiddleware(SessionMiddleware):
    def _is_exempt(self, obj):
        return hasattr(obj, SESSION_EXEMPT)

    def process_view(self, request, callback, callback_args, callback_kwargs):
        if self._is_exempt(callback):
            setattr(request, SESSION_EXEMPT, True)
        return None

    def process_response(self, request, response):
        if self._is_exempt(request):
            return response
        return super(KolibriSessionMiddleware, self).process_response(request, response)
