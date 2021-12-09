from django.conf import settings
from django.db import OperationalError
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import is_valid_path
from django.utils import translation

from .translation import get_language_from_request_and_is_from_path
from kolibri.core.device.hooks import SetupHook
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.utils.conf import OPTIONS


class KolibriLocaleMiddleware(object):
    """
    Copied and then modified into a new style middleware from:
    https://github.com/django/django/blob/stable/1.11.x/django/middleware/locale.py
    Also has several other changes to suit our purposes.
    The principal concern of this middleware is to activate translation for the current
    language, so that throughout the lifecycle of this request, any translation or language
    related functionality is set to the appropriate locale.
    Unlike the Django middleware, this middleware only runs on requests to URLs that are
    prefixed by a language code. Other URLs, such as for untranslated API endpoints do not
    have a language code set on them.
    """

    def __init__(self, get_response):
        # Standard boilerplate for a new style Django middleware.
        self.get_response = get_response

    def __call__(self, request):
        # First get the language code, and whether this was calculated from the path
        # i.e. was this a language-prefixed URL.
        language, language_from_path = get_language_from_request_and_is_from_path(
            request
        )
        # If this URL has been resolved to a view, and the view is not on a language prefixed
        # URL, then the function above will return None for the language code to indicate that
        # no translation is necessary.
        if language is not None:
            # Only activate translation if there is a language code returned.
            translation.activate(language)
            request.LANGUAGE_CODE = translation.get_language()

        response = self.get_response(request)

        if language is not None:

            language = translation.get_language()

            if response.status_code == 404 and not language_from_path:
                # Maybe the language code is missing in the URL? Try adding the
                # language prefix and redirecting to that URL.
                # First get any global prefix that is being used.
                script_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]
                # Replace the global prefix with the global prefix and the language prefix.
                language_path = request.path_info.replace(
                    script_prefix, "%s%s/" % (script_prefix, language), 1
                )

                # Get the urlconf from the request, default to the global settings ROOT_URLCONF
                urlconf = getattr(request, "urlconf", settings.ROOT_URLCONF)
                # Check if this is a valid path
                path_valid = is_valid_path(language_path, urlconf)
                # Check if the path is only invalid because it is missing a trailing slash
                path_needs_slash = not path_valid and (
                    settings.APPEND_SLASH
                    and not language_path.endswith("/")
                    and is_valid_path("%s/" % language_path, urlconf)
                )
                # If the constructed path is valid, or it would be valid with a trailing slash
                # then redirect to the prefixed path, with a trailing slash added if needed.
                if path_valid or path_needs_slash:
                    # Insert language after the script prefix and before the
                    # rest of the URL
                    language_url = request.get_full_path(
                        force_append_slash=path_needs_slash
                    ).replace(script_prefix, "%s%s/" % (script_prefix, language), 1)
                    return HttpResponseRedirect(language_url)

            # Add a content language header to the response if not already present.
            if "Content-Language" not in response:
                response["Content-Language"] = language

        return response


class ProvisioningErrorHandler(object):
    def __init__(self, get_response):
        self.get_response = get_response

    def process_exception(self, request, exception):
        if (
            isinstance(exception, DeviceNotProvisioned)
            and SetupHook.provision_url()
            and not request.path.startswith(SetupHook.provision_url())
        ):
            return redirect(SetupHook.provision_url())
        return None

    def __call__(self, request):
        return self.get_response(request)


class DatabaseBusyErrorHandler(object):
    """
    A middleware class to raise a 503 when the database is under heavy load
    For SQLite this will trigger for database locked errors.
    For Postgres this will trigger for deadlocks.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def process_exception(self, request, exception):
        if not isinstance(exception, OperationalError):
            return None
        if (
            OPTIONS["Database"]["DATABASE_ENGINE"] == "sqlite"
            and "database is locked" not in exception.args[0]
        ):
            return None
        if (
            OPTIONS["Database"]["DATABASE_ENGINE"] == "postgres"
            and "deadlock detected" not in exception.args[0]
        ):
            return None
        # Return a 503 response with a Retry-After of 10 seconds. In future we may be able to customize this value
        # based on what is currently happening on the server.
        response = HttpResponse(
            "Database is not available for write operations",
            status=503,
        )
        response["Retry-After"] = 10
        return response

    def __call__(self, request):
        return self.get_response(request)
