from urllib.parse import urlparse

from rest_framework import viewsets
from rest_framework.response import Response

from kolibri.core.device.permissions import IsCoachOrAdmin
from kolibri.core.device.utils import get_request_url
from kolibri.core.device.utils import get_server_urls
from kolibri.core.device.utils import is_loopback_url
from kolibri.utils.server import get_local_hostnames


def _get_network_urls(request):
    urls = [url for url in get_server_urls(request) if not is_loopback_url(url)]
    request_url = get_request_url(request)
    if not urls and not is_loopback_url(request_url):
        return [request_url]
    return urls


class ConnectionUrlsViewSet(viewsets.ViewSet):
    permission_classes = (IsCoachOrAdmin,)

    def list(self, request):
        local_hostnames = get_local_hostnames()
        return Response(
            [
                {
                    "url": url,
                    "is_local_hostname": urlparse(url).hostname in local_hostnames,
                }
                for url in _get_network_urls(request)
            ]
        )
