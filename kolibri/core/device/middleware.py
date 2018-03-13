from django.middleware.locale import LocaleMiddleware
from django.utils import translation

from .translation import get_language_from_request


class KolibriLocaleMiddleware(LocaleMiddleware):

    def process_request(self, request):
        language = get_language_from_request(request)
        translation.activate(language)
        request.LANGUAGE_CODE = translation.get_language()
