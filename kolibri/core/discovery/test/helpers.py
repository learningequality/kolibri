import mock
import requests

info = {
    "application": "kolibri",
    "device_name": "skynet",
    "instance_id": "a" * 32,
    "operating_system": "windows",
    "kolibri_version": "0.11.0",
}


def mock_request(session, url, *args, **kwargs):
    response = mock.Mock()
    response.status_code = 200
    response.url = url
    response.json = lambda: info

    if url == "https://kolibrihappyurl.qqq/api/public/info/":
        return response
    elif url == "https://nonkolibrihappyurl.qqq/":
        return response
    elif url.startswith("http://timeoutonport80url.qqq/"):
        raise requests.Timeout("Snooooooorrrrrrrre!")
    elif url.startswith("http://timeoutonport80url.qqq:8080/"):
        return response
    else:
        raise requests.ConnectionError("No can do!")
