from rest_framework import status
from rest_framework.exceptions import APIException

from .... import error_constants


class NetworkError(Exception):
    code = error_constants.INVALID


class NetworkClientError(NetworkError):
    pass


class NetworkLocationNotFound(NetworkClientError):
    code = error_constants.NETWORK_LOCATION_NOT_FOUND


class NetworkLocationConnectionFailure(NetworkClientError):
    """
    Connecting to the network location failed before we could read anything about the server
    """

    pass


class NetworkLocationResponseTimeout(NetworkClientError):
    """
    Successfully connected to the network location but the request timed out
    """

    pass


class NetworkLocationResponseFailure(NetworkClientError):
    """
    Successfully connected to the network location but the response is malformed or an HTTP failure
    """

    def __init__(self, *args, **kwargs):
        self.response = kwargs.pop("response", None)
        super(NetworkLocationResponseFailure, self).__init__(*args, **kwargs)


class NetworkLocationInvalidResponse(NetworkClientError):
    """
    Successfully connected to the network location and received an okay response, but the location
    doesn't appear to be a compatible Kolibri or Studio instance
    """

    pass


class NetworkLocationConflict(NetworkError):
    """
    When a conflict occurs, like the instance ID doesn't match what we expect
    """

    pass


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


class IncompatibleVersionError(APIException):
    """
    API error for when a peer is not a compatible version
    """

    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = "Kolibri version is incompatible"
