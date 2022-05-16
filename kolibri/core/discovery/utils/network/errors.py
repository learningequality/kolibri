from rest_framework import status
from rest_framework.exceptions import APIException

from .... import error_constants


class NetworkError(Exception):
    code = error_constants.INVALID


class NetworkClientError(NetworkError):
    pass


class NetworkLocationNotFound(NetworkClientError):
    code = error_constants.NETWORK_LOCATION_NOT_FOUND


class InvalidNetworkLocationFormat(NetworkClientError):
    code = error_constants.INVALID_NETWORK_LOCATION_FORMAT


class URLParseError(NetworkError):
    code = error_constants.INVALID_NETWORK_LOCATION_FORMAT


class InvalidScheme(URLParseError):
    pass


class InvalidHostname(URLParseError):
    pass


class InvalidPort(URLParseError):
    pass


class ResourceGoneError(APIException):
    """
    API error for when a peer no longer is online
    """

    status_code = status.HTTP_410_GONE
    default_detail = "Unable to connect"
