import json
import os
from urllib.error import URLError
from urllib.parse import urlencode
from urllib.parse import urlsplit
from urllib.parse import urlunsplit
from urllib.request import Request
from urllib.request import urlopen


# Globals that are determined by importing modules from Kolibri. This is
# separate from globals because importing it will cause Kolibri to permanently
# set its options from the value of os.environ. We should replace this module
# with functions in kolibri_service.py that talk to the kolibri_service_main
# process.

if "KOLIBRI_HTTP_PORT" in os.environ:
    KOLIBRI_HTTP_PORT = int(os.environ.get("KOLIBRI_HTTP_PORT"))
else:
    from kolibri.utils.conf import OPTIONS

    KOLIBRI_HTTP_PORT = OPTIONS["Deployment"]["HTTP_PORT"]

KOLIBRI_URL = "http://localhost:{}".format(KOLIBRI_HTTP_PORT)
KOLIBRI_URL_SPLIT = urlsplit(KOLIBRI_URL)


class KolibriAPIError(Exception):
    pass


def is_kolibri_responding():
    # Check if Kolibri is responding to http requests at the expected URL.
    try:
        info = kolibri_api_get_json("/api/public/info")
    except KolibriAPIError:
        return False
    else:
        return info.get("application") == "kolibri"


def kolibri_api_get_json(path, query={}):
    request_url = KOLIBRI_URL_SPLIT._replace(path=path, query=urlencode(query))
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
