from django.utils import six
from rest_framework import status
from rest_framework.views import exception_handler

from kolibri.core import error_constants


def custom_exception_handler(exc, context):
    # Call REST framework's default exception handler first,
    # to get the standard error response.
    response = exception_handler(exc, context)
    # customize the error response
    if response is not None:
        # we are adding custom error ids so the frontend can immediately know the error
        # without doing introspection of different variables
        if response.status_code == status.HTTP_400_BAD_REQUEST:
            response.data = _handle_400_format(response)

        elif response.status_code == status.HTTP_403_FORBIDDEN:
            response.data = _handle_403_format(response, context)

        elif response.status_code == status.HTTP_404_NOT_FOUND:
            response.data = _handle_404_format(response, context)

    return response


def _handle_400_format(response):
    errors = []
    if isinstance(response.data, dict):
        for key, value in six.iteritems(response.data):
            # handle drf error responses
            if isinstance(value, list):
                for detail in value:
                    errors.append(
                        {
                            "id": detail.code.upper(),
                            "metadata": {"field": key, "message": str(detail)},
                        }
                    )
    return errors or response.data


def _handle_403_format(response, context):
    errors = [
        {
            "id": response.data["detail"].code.upper(),
            "metadata": {"view": context["view"].get_view_name()},
        }
    ]
    return errors


def _handle_404_format(response, context):
    errors = [
        {
            "id": error_constants.NOT_FOUND,
            "metadata": {"view": context["view"].get_view_name()},
        }
    ]
    return errors
