import collections
import json
import os
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.parse import urljoin
from urllib.parse import urlsplit
from urllib.parse import urlunsplit
from urllib.request import Request
from urllib.request import urlopen

# from kolibri.utils.conf import OPTIONS

# KOLIBRI_HTTP_PORT = OPTIONS["Deployment"]["HTTP_PORT"]
# KOLIBRI_URL_PATH_PREFIX = OPTIONS["Deployment"]["URL_PATH_PREFIX"]

# KOLIBRI_BASE_URL = urljoin(
#     "http://localhost:{}".format(KOLIBRI_HTTP_PORT), KOLIBRI_URL_PATH_PREFIX
# )


class KolibriAPIError(Exception):
    pass


def is_kolibri_responding(base_url):
    # Check if Kolibri is responding to http requests at the expected URL.
    try:
        info = kolibri_api_get_json(base_url, "api/public/info")
    except KolibriAPIError:
        return False
    else:
        if isinstance(info, collections.Mapping):
            return info.get("application") == "kolibri"
        else:
            return False


def kolibri_api_get_json(base_url, path, query={}):
    base_url = urlsplit(base_url)
    path = urljoin(base_url.path, path.lstrip("/"))
    request_url = base_url._replace(path=path, query=urlencode(query))
    request = Request(urlunsplit(request_url))

    try:
        response = urlopen(request)
    except URLError as error:
        raise KolibriAPIError(error)

    try:
        data = json.load(response)
    except json.JSONDecodeError as error:
        raise KolibriAPIError(error)

    return data
