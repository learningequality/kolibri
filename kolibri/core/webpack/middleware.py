import logging

from django.shortcuts import render

from .hooks import WebpackError


logger = logging.getLogger(__name__)


class WebpackErrorHandler:
    def __init__(self, get_response):
        self.get_response = get_response

    def process_exception(self, request, exception):
        if isinstance(exception, WebpackError):
            logger.error("WebpackError: {}".format(str(exception)))
            for key in exception.extra_info:
                logger.error("{}: {}".format(key, exception.extra_info[key]))
            context = {"message": str(exception), "extra_info": exception.extra_info}
            return render(request, "kolibri/webpack_error.html", context)
        return None

    def __call__(self, request):
        return self.get_response(request)
