import mock
from requests import exceptions

info = {
    "application": "kolibri",
    "device_name": "skynet",
    "instance_id": "a" * 32,
    "operating_system": "windows",
    "kolibri_version": "0.11.0",
}


def mock_response(status_code):
    response = mock.MagicMock()
    response.__enter__.return_value = response
    response.status_code = status_code
    response.raw._connection.sock.getpeername.return_value = ("192.168.101.101", 123456)
    if status_code == 200:
        response.json.return_value = info
    elif status_code >= 500:
        response.raise_for_status.side_effect = exceptions.HTTPError("500 Server error")
    return response


def mock_request(session, method, url, *args, **kwargs):
    response = mock_response(200)
    response.url = url

    if url == "https://kolibrihappyurl.qqq/api/public/info/":
        return response
    elif url == "https://nonkolibrihappyurl.qqq/":
        return response
    elif url.startswith("http://timeoutonport80url.qqq/"):
        raise exceptions.Timeout("Snooooooorrrrrrrre!")
    elif url.startswith("http://timeoutonport80url.qqq:8080/"):
        return response
    else:
        raise exceptions.ConnectionError("Refusing connection to: {}".format(url))


def mock_happy_request(happy_url, default_error=exceptions.RequestException):
    def mock_request(session, method, url, *args, **kwargs):
        response = mock_response(200)
        response.url = url

        if url.startswith(happy_url):
            return response
        else:
            raise default_error("Refusing connection to: {}".format(url))

    return mock_request


def mock_sad_request(
    sad_url, status_code=500, default_error=exceptions.RequestException
):
    def mock_request(session, method, url, *args, **kwargs):
        response = mock_response(status_code)
        response.url = url

        if url.startswith(sad_url):
            return response
        else:
            raise default_error("Refusing connection to: {}".format(url))

    return mock_request


def mock_not_found(default_error=exceptions.ConnectTimeout):
    def mock_request(session, method, url, *args, **kwargs):
        raise default_error("Refusing connection to: {}".format(url))

    return mock_request
