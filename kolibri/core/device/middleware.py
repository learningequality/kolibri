from django.conf import settings
from django.db import OperationalError
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.shortcuts import redirect
from django.urls import is_valid_path
from django.urls import resolve
from django.urls import Resolver404
from django.utils import translation
from django.views.generic.base import RedirectView

from kolibri.core.device.hooks import SetupHook
from kolibri.core.device.utils import device_provisioned
from kolibri.utils.conf import OPTIONS

from .translation import get_language_from_request_and_is_from_path


class KolibriLocaleMiddleware:
    """
    Copied and then modified into a new style middleware from:
    https://github.com/django/django/blob/stable/3.2.x/django/middleware/locale.py#L10
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

    def _language_url(self, request, language):
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
            return request.get_full_path(force_append_slash=path_needs_slash).replace(
                script_prefix, "%s%s/" % (script_prefix, language), 1
            )

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

        # If the URL is missing a language prefix, check whether the language-prefixed
        # path resolves to a RedirectView subclass. If so, rewrite the path before
        # dispatching so that auth and other downstream middleware run once with the
        # correct path, collapsing the two-hop chain into a single redirect response.
        if language is not None and not language_from_path:
            language_url = self._language_url(request, language)
            try:
                inner_match = resolve(language_url)
                view_class = getattr(inner_match.func, "view_class", None)
                if view_class is not None and issubclass(view_class, RedirectView):
                    request.path_info = language_url
            except Resolver404:
                pass

        response = self.get_response(request)

        if language is not None:
            language = translation.get_language()

            if response.status_code == 404 and not language_from_path:
                language_url = self._language_url(request, language)
                if language_url is not None:
                    return HttpResponseRedirect(language_url)

            # Add a content language header to the response if not already present.
            if "Content-Language" not in response.headers:
                response.headers["Content-Language"] = language

        return response


class ProvisioningErrorHandler:
    def __init__(self, get_response):
        self.get_response = get_response
        self._provision_app_name = None

    def __call__(self, request):
        # Resolve the URL first — this is cheap in-memory pattern matching.
        # If it's not a translated endpoint (i.e. not a plugin page view),
        # return early without hitting the database for provisioning checks.
        try:
            match = resolve(request.path_info)
        except Resolver404:
            return self.get_response(request)

        # Only redirect plugin page views, not API endpoints.
        # Page views served through i18n_patterns have 'translated' set on their callback.
        # API endpoints are not translated and are always filtered out here.
        if not getattr(match.func, "translated", False) or device_provisioned():
            return self.get_response(request)

        try:
            provision_url = SetupHook.provision_url()
        except StopIteration:
            return self.get_response(request)

        if self._provision_app_name is None:
            self._provision_app_name = resolve(provision_url).app_name

        # Redirect only other plugins' page views to the provisioning URL.
        # Core views like set_language are also translated (they're inside
        # i18n_patterns for language prefix routing) but must remain accessible
        # so the setup wizard can function (e.g. changing language during setup).
        if (
            match.app_name != self._provision_app_name
            and "kolibri:core" not in match.app_name
        ):
            return redirect(provision_url)

        return self.get_response(request)


class DatabaseBusyErrorHandler:
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
        response.headers["Retry-After"] = 10
        return response

    def __call__(self, request):
        return self.get_response(request)
