from django.conf import settings
from django.http import HttpResponse
from django.http import HttpResponseRedirect
from django.urls import is_valid_path
from django.utils import translation

from .translation import get_language_from_request
from kolibri.utils.conf import OPTIONS


class KolibriLocaleMiddleware(object):
    """
    Copied and then modified into a new style middleware from:
    https://github.com/django/django/blob/stable/1.11.x/django/middleware/locale.py
    Also has several other changes to suit our purposes.
    """

    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        language, language_from_path = get_language_from_request(request)
        if language is not None:
            translation.activate(language)
            request.LANGUAGE_CODE = translation.get_language()

        response = self.get_response(request)

        if language is not None:

            language = translation.get_language()

            urlconf = getattr(request, "urlconf", settings.ROOT_URLCONF)

            if response.status_code == 404 and not language_from_path:
                # Maybe the language code is missing in the URL? Try adding the
                # language prefix and redirecting to that URL.
                script_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"].strip("/")
                if script_prefix:
                    language_path = request.path_info.replace(script_prefix, "%s/%s" % (script_prefix, language))
                else:
                    language_path = "/" + language + request.path_info
                path_valid = is_valid_path(language_path, urlconf)
                path_needs_slash = (
                    not path_valid and (
                        settings.APPEND_SLASH and not language_path.endswith("/")
                        and is_valid_path("%s/" % language_path, urlconf)
                    )
                )
                if path_valid or path_needs_slash:
                    script_prefix = OPTIONS["Deployment"]["URL_PATH_PREFIX"]
                    # Insert language after the script prefix and before the
                    # rest of the URL
                    language_url = request.get_full_path(force_append_slash=path_needs_slash).replace(
                        script_prefix,
                        "%s%s/" % (script_prefix, language),
                        1
                    )
                    return HttpResponseRedirect(language_url)

            if "Content-Language" not in response:
                response["Content-Language"] = language

        return response


class IgnoreGUIMiddleware(object):
    def __init__(self, get_response):
        self.get_response = get_response
        # One-time configuration and initialization.

    def __call__(self, request):
        # Code to be executed for each request before
        # the view (and later middleware) are called.

        response = self.get_response(request)

        # Code to be executed for each request/response after
        # the view is called.

        return response

    def process_view(self, request, view_func, view_args, view_kwargs):
        if request.META.get("HTTP_USER_AGENT", None) == "Kolibri session":
            return HttpResponse("")
        return None
