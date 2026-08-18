import logging

from django.http import Http404
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from le_utils.constants import languages
from le_utils.constants import library as library_constants
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from kolibri.core.content import models
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.cache import no_cache_on_method
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_v2_channel_lookup_url
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL

logger = logging.getLogger(__name__)


@method_decorator(cache_page(60 * 5), name="dispatch")
class RemoteChannelViewSet(viewsets.ViewSet):
    permission_classes = (CanManageContent,)

    http_method_names = ["get"]

    def _make_channel_endpoint_request(
        self, identifier=None, baseurl=None, keyword=None, language=None
    ):
        if baseurl is not None:
            try:
                client = NetworkClient.build_for_address(baseurl)
            except NetworkLocationNotFound:
                baseurl = None
        if baseurl is None:
            client = NetworkClient(CENTRAL_CONTENT_BASE_URL)
        url = get_channel_lookup_url(
            identifier=identifier, keyword=keyword, language=language
        )
        try:
            resp = client.get(url)
        except NetworkLocationResponseFailure as e:
            if (
                e.response is not None
                and e.response.status_code == status.HTTP_404_NOT_FOUND
            ):
                raise Http404(
                    "The requested channel does not exist on the content server"
                )
            raise
        # map the channel list into the format the Kolibri client-side expects
        return list(map(self._studio_response_to_kolibri_response, resp.json()))

    @staticmethod
    def _get_lang_native_name(code):
        try:
            lang_name = languages.getlang(code).native_name
        except AttributeError:
            logger.warning(
                "Did not find language code {} in our le_utils.constants!".format(code)
            )
            lang_name = None

        return lang_name

    @classmethod
    def _studio_response_to_kolibri_response(cls, studioresp):
        """
        This modifies the JSON response returned by Kolibri Studio,
        and then transforms its keys that are more in line with the keys
        we return with /api/channels.
        """

        # See the spec at:
        # https://docs.google.com/document/d/1FGR4XBEu7IbfoaEy-8xbhQx2PvIyxp0VugoPrMfo4R4/edit#

        # Go through the channel's included_languages and add in the native name
        # for each language
        included_languages = {}
        for code in studioresp.get("included_languages", []):
            included_languages[code] = cls._get_lang_native_name(code)

        channel_lang_name = cls._get_lang_native_name(studioresp.get("language"))

        resp = {
            "id": studioresp["id"],
            "description": studioresp.get("description"),
            "tagline": studioresp.get("tagline", None),
            "name": studioresp["name"],
            "lang_code": studioresp.get("language"),
            "lang_name": channel_lang_name,
            "thumbnail": studioresp.get("icon_encoding"),
            "public": studioresp.get("public", True),
            "total_resources": studioresp.get("total_resource_count", 0),
            "total_file_size": studioresp.get("published_size"),
            "version": studioresp.get("version") or 0,
            "included_languages": included_languages,
            "last_updated": studioresp.get("last_published"),
            "version_notes": studioresp.get("version_notes"),
        }

        return resp

    def list(self, request, *args, **kwargs):
        """
        Gets metadata about all public channels on kolibri studio.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        token = request.GET.get("token", None)
        try:
            channels = self._make_channel_endpoint_request(
                identifier=token, baseurl=baseurl, keyword=keyword, language=language
            )
        except NetworkClientError:
            return Response(
                {"status": "offline"}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        return Response(channels)

    def _retrieve_from_v2(self, channel_id):
        """Fetch a community library channel's approved version from Studio v2 API."""
        client = NetworkClient(CENTRAL_CONTENT_BASE_URL)
        url = get_v2_channel_lookup_url(channel_id)
        try:
            resp = client.get(url)
        except NetworkLocationResponseFailure as e:
            if (
                e.response is not None
                and e.response.status_code == status.HTTP_404_NOT_FOUND
            ):
                raise Http404(
                    "The requested channel does not exist on the content server"
                )
            raise
        return Response(self._studio_response_to_kolibri_response(resp.json()))

    @staticmethod
    def _is_community_channel(channel_id):
        try:
            library = (
                models.ChannelMetadata.objects.filter(id=channel_id)
                .values_list("library", flat=True)
                .first()
            )
        except ValueError:
            # an unparseable id cannot correspond to an installed channel
            return False
        return library == library_constants.COMMUNITY

    def retrieve(self, request, pk=None):
        """
        Gets metadata about a channel through a token or channel id.
        """
        baseurl = request.GET.get("baseurl", None)
        keyword = request.GET.get("keyword", None)
        language = request.GET.get("language", None)
        token = request.GET.get("token", None)

        try:
            # Use v2 only for installed community library channels queried through
            # the default Studio base URL (v2 is Studio-specific). Skip when a token
            # is provided — token lookups are for draft channels, not community library.
            if baseurl is None and token is None and self._is_community_channel(pk):
                return self._retrieve_from_v2(pk)
            channels = self._make_channel_endpoint_request(
                identifier=token or pk,
                baseurl=baseurl,
                keyword=keyword,
                language=language,
            )
        except NetworkClientError:
            return Response(
                {"status": "offline"}, status=status.HTTP_503_SERVICE_UNAVAILABLE
            )
        if not channels:
            raise Http404
        return Response(channels[0])

    # Under the class-level cache_page, the UI stayed on "Disconnected" after the
    # network came back (#11459).
    @action(detail=False)
    @no_cache_on_method
    def kolibri_studio_status(self, request, **kwargs):
        try:
            client = NetworkClient.build_for_address(CENTRAL_CONTENT_BASE_URL)
            resp = client.get("/api/public/info")
            data = resp.json()
            data["available"] = True
            data["status"] = "online"
            return Response(data)
        except (
            NetworkLocationResponseFailure,
            NetworkLocationConnectionFailure,
            NetworkLocationNotFound,
        ):
            return Response({"status": "offline", "available": False})
