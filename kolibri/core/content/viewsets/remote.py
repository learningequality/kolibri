from django.core.cache import cache
from django.http import Http404
from rest_framework import status
from rest_framework.response import Response

from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.content.utils.cache import REMOTE_ETAG_CACHE_KEY
from kolibri.core.content.utils.cache import REMOTE_URL_PARAM
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.utils.conf import OPTIONS


class RemoteMixin:
    def _should_proxy_request(self, request):
        return REMOTE_URL_PARAM in request.GET

    def _get_request_headers(self, request):
        return {
            "Accept": request.META.get("HTTP_ACCEPT"),
            # Don't proxy client's accept encoding headers as it may include br for brotli
            # that we cannot rely on having decompression for available on the server.
            "Accept-Language": request.META.get("HTTP_ACCEPT_LANGUAGE"),
            "Content-Type": request.META.get("CONTENT_TYPE"),
            "If-None-Match": request.META.get("HTTP_IF_NONE_MATCH", ""),
        }

    def _get_response_headers(self, response):
        headers = {}
        header_names = ["Cache-Control", "Etag", "Expires", "Date", "Last-Modified"]
        for header_name in header_names:
            if header_name in response.headers:
                headers[header_name] = response.headers[header_name.lower()]
        return headers

    def _cache_etag(self, baseurl, headers):
        if "Etag" in headers:
            cache_key = REMOTE_ETAG_CACHE_KEY.format(baseurl)
            cache.set(cache_key, headers["Etag"], 3600)

    def update_data(self, response_data, baseurl):
        return response_data

    def update_request_params(self, params, device_info):
        # Hook for subclasses that proxy to a remote peer: rewrite query params
        # so a request keeps working regardless of the Kolibri version exposing
        # the endpoint being proxied to (e.g. remapping renamed params).
        # Default is a no-op; device_info describes the peer being queried.
        return params

    def _hande_proxied_request(self, request):
        full_path = request.get_full_path().split("?")[0]
        remote_path = full_path.replace(
            "/{}api/content/".format(
                OPTIONS["Deployment"]["URL_PATH_PREFIX"].lstrip("/")
            ),
            "/api/public/v2/",
        )
        baseurl = request.GET[REMOTE_URL_PARAM]
        qs = request.GET.copy()
        del qs[REMOTE_URL_PARAM]
        try:
            client = NetworkClient.build_for_address(baseurl)
        except NetworkLocationNotFound:
            raise Http404("Remote resource not found")
        qs = self.update_request_params(qs, client.device_info)
        remote_url = remote_path
        try:
            response = client.get(
                remote_url, params=qs, headers=self._get_request_headers(request)
            )

            # If Etag is set on the response we have returned here, any further Etag will not be modified
            # by the django etag decorator, so this should allow us to transparently proxy the remote etag.
            try:
                content = self.update_data(response.json(), baseurl)
            except ValueError:
                content = response.content
            headers = self._get_response_headers(response)
            self._cache_etag(baseurl, headers)
            return Response(
                content,
                status=response.status_code,
                headers=headers,
            )
        except NetworkLocationResponseFailure as e:
            if e.response.status_code == status.HTTP_404_NOT_FOUND:
                raise Http404("Remote resource not found")
            raise ResourceGoneError


class RemoteViewSet(ReadOnlyValuesViewset, RemoteMixin):
    def retrieve(self, request, pk=None):
        if pk is None:
            raise Http404
        if self._should_proxy_request(request):
            return self._hande_proxied_request(request)
        return super().retrieve(request, pk=pk)

    def list(self, request, *args, **kwargs):
        if self._should_proxy_request(request):
            return self._hande_proxied_request(request)
        return super().list(request, *args, **kwargs)
