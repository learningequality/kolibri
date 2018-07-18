from django.utils import six
from rest_framework import status
from rest_framework.views import exception_handler

from kolibri.core import error_constants


def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)

    constants = []
    # customize the error response
    if response is not None:
        # we are adding custom error constants so the frontend can immediately know the error
        # without doing introspection of different variables
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            for key, value in six.iteritems(response.data):
                for detail in value:
                    if detail.code in error_constants.ERROR_CONSTANTS:
                        constants.append(detail.code)
        response.data['KOLIBRI_CONSTANTS'] = constants

    return response
