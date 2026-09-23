from le_utils.uuidv5 import generate_ecosystem_namespaced_uuid

from kolibri.core.discovery.utils.network.errors import URLParseError
from kolibri.core.discovery.utils.network.urls import parse_address_into_components
from kolibri.utils import conf

# AKA Kolibri Studio
CENTRAL_CONTENT_BASE_URL = conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
CENTRAL_CONTENT_BASE_INSTANCE_ID = generate_ecosystem_namespaced_uuid(
    CENTRAL_CONTENT_BASE_URL
).hex

# AKA Kolibri Data Portal
DATA_PORTAL_SYNCING_BASE_URL = conf.OPTIONS["Urls"]["DATA_PORTAL_SYNCING_BASE_URL"]
DATA_PORTAL_BASE_INSTANCE_ID = "2a824768819aa2bec5cecbc06a31ec1e"


def _location(url):
    # The scheme is dropped: NetworkClient.connect() rewrites base_url from the
    # redirected /api/public/info URL, which may have upgraded it.
    _, hostname, port, path = parse_address_into_components(url)
    return hostname, port, path


def is_central_content_base_url(url):
    try:
        return _location(url) == _location(
            conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"]
        )
    except URLParseError:
        return False
