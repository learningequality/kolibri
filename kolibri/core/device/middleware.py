from django.http import HttpResponse
from django.middleware.locale import LocaleMiddleware
from django.utils import translation

from .translation import get_language_from_request


class KolibriLocaleMiddleware(LocaleMiddleware):

    def process_request(self, request):
        language = get_language_from_request(request)
        translation.activate(language)
        request.LANGUAGE_CODE = translation.get_language()


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
            return HttpResponse('')
        return None
