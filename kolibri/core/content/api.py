import logging
from base64 import urlsafe_b64decode

from django.http import Http404
from django.http import HttpResponse
from django.utils.decorators import method_decorator
from django.views import View
from django.views.decorators.cache import cache_page
from django.views.decorators.http import etag
from le_utils.constants import content_kinds
from le_utils.constants import languages
from le_utils.constants import library as library_constants
from rest_framework import mixins
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.generics import get_object_or_404
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.serializers import CharField
from rest_framework.serializers import PrimaryKeyRelatedField
from rest_framework.serializers import Serializer
from rest_framework.views import APIView

from kolibri.core import error_constants
from kolibri.core.content import models
from kolibri.core.content import serializers
from kolibri.core.content.hooks import ShareFileHook
from kolibri.core.content.permissions import CanManageContent
from kolibri.core.content.utils.cache import get_cache_key
from kolibri.core.content.utils.cache import no_cache_on_method
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_studio,
)
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_storage_file_path
from kolibri.core.content.utils.paths import get_v2_channel_lookup_url
from kolibri.core.device.permissions import FromAppContextPermission
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_URL
from kolibri.core.utils.pagination import ValuesViewsetPageNumberPagination

logger = logging.getLogger(__name__)


class ChannelThumbnailView(View):
    def get(self, request, channel_id):
        channel = get_object_or_404(models.ChannelMetadata, id=channel_id)
        try:
            header, b_64_thumbnail = channel.thumbnail.split(",", 1)
            mimetype = header.split(":")[1].split(";")[0]
        except ValueError:
            raise Http404("No thumbnail available")
        thumbnail = urlsafe_b64decode(b_64_thumbnail)
        return HttpResponse(thumbnail, content_type=mimetype)


class OptionalPageNumberPagination(ValuesViewsetPageNumberPagination):
    """
    Pagination class that allows for page number-style pagination, when requested.
    To activate, the `page_size` argument must be set. For example, to request the first 20 records:
    `?page_size=20&page=1`
    """

    page_size = None
    page_size_query_param = "page_size"


@method_decorator(etag(get_cache_key), name="retrieve")
class ContentNodeGranularViewset(mixins.RetrieveModelMixin, viewsets.GenericViewSet):
    serializer_class = serializers.ContentNodeGranularSerializer

    def get_queryset(self):
        return (
            models.ContentNode.objects.all()
            .prefetch_related("files__local_file")
            .filter(renderable_contentnodes_q_filter)
            .distinct()
        )

    def get_serializer_context(self):
        context = super().get_serializer_context()
        if hasattr(self, "channel_stats"):
            context.update({"channel_stats": self.channel_stats})
        return context

    def retrieve(self, request, pk):
        queryset = self.get_queryset()
        instance = get_object_or_404(queryset, pk=pk)
        channel_id = instance.channel_id
        drive_id = self.request.query_params.get("importing_from_drive_id", None)
        peer_id = self.request.query_params.get("importing_from_peer_id", None)
        for_export = self.request.query_params.get("for_export", None)
        flag_count = sum(int(bool(flag)) for flag in (drive_id, peer_id, for_export))
        if flag_count > 1:
            raise serializers.ValidationError(
                "Must specify at most one of importing_from_drive_id, importing_from_peer_id, and for_export"
            )
        if not flag_count:
            self.channel_stats = get_channel_stats_from_studio(channel_id)
        if for_export:
            self.channel_stats = None
        if drive_id:
            try:
                self.channel_stats = get_channel_stats_from_disk(channel_id, drive_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The external drive with given drive id {} does not exist.".format(
                        drive_id
                    )
                )
        if peer_id:
            try:
                self.channel_stats = get_channel_stats_from_peer(channel_id, peer_id)
            except LocationError:
                raise serializers.ValidationError(
                    "The network location with the id {} does not exist".format(peer_id)
                )
        children = queryset.filter(parent=instance)
        parent_serializer = self.get_serializer(instance)
        parent_data = parent_serializer.data
        child_serializer = self.get_serializer(children, many=True)
        parent_data["children"] = child_serializer.data

        parent_data["ancestors"] = list(instance.get_ancestors().values("id", "title"))

        return Response(parent_data)


class FileViewset(viewsets.ReadOnlyModelViewSet):
    serializer_class = serializers.FileSerializer
    pagination_class = OptionalPageNumberPagination

    def get_queryset(self):
        return models.File.objects.all()


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


class ShareFileSerializer(Serializer):
    content_node = PrimaryKeyRelatedField(
        queryset=models.ContentNode.objects.filter(available=True).exclude(
            kind__in=[content_kinds.TOPIC, content_kinds.EXERCISE]
        )
    )
    message = CharField(max_length=1000)


class ShareFileView(APIView):
    permission_classes = (IsAuthenticated, FromAppContextPermission)

    def post(self, request):
        serializer = ShareFileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        content_node = serializer.validated_data["content_node"]
        message = serializer.validated_data["message"]
        # Rely on default priority ordering
        default_file = content_node.files.first()
        if not default_file:
            return Response(
                {"error": "No files found for content node"},
                status=status.HTTP_400_BAD_REQUEST,
            )
        filepath = get_content_storage_file_path(default_file.local_file.get_filename())
        try:
            ShareFileHook.execute_file_share(filepath, message)
        except Exception:
            # The hook is plugin-provided and its message could disclose local
            # paths, so it stays out of the response (#14717).
            logger.exception("file share hook failed")
            return Response(
                {"error": {"id": error_constants.SHARE_FILE_FAILED}},
                status=status.HTTP_400_BAD_REQUEST,
            )
        return Response(status=status.HTTP_201_CREATED)
