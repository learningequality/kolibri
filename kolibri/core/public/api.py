import gzip
import io
import json
import time

from django.db import transaction
from django.db.models import Q
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseNotFound
from django.utils import timezone
from django.utils.cache import patch_cache_control
from django.utils.decorators import method_decorator
from django.utils.http import http_date
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.gzip import gzip_page
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import exceptions
from rest_framework import filters
from rest_framework import serializers
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework.views import APIView

from .. import error_constants
from kolibri.core.api import BaseValuesViewset
from kolibri.core.api import ReadOnlyValuesViewset
from kolibri.core.auth.middleware import session_exempt
from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.api import BaseChannelMetadataMixin
from kolibri.core.content.api import BaseContentNodeMixin
from kolibri.core.content.api import BaseContentNodeTreeViewset
from kolibri.core.content.api import metadata_cache
from kolibri.core.content.api import OptionalContentNodePagination
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.serializers import PublicChannelSerializer
from kolibri.core.content.utils.file_availability import checksum_regex
from kolibri.core.content.utils.file_availability import generate_checksum_integer_mask
from kolibri.core.device import soud
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.utils import allow_peer_unlisted_channel_import
from kolibri.core.device.utils import get_device_info
from kolibri.core.device.utils import get_device_setting
from kolibri.core.public.constants.user_sync_options import HANDSHAKING_TIME
from kolibri.core.public.constants.user_sync_options import MAX_CONCURRENT_SYNCS
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.utils.conf import OPTIONS


class InfoViewSet(viewsets.ViewSet):
    """
    An equivalent endpoint in studio which allows kolibri devices to know
    if this device can serve content.
    Spec doc: https://docs.google.com/document/d/1XKXQe25sf9Tht6uIXvqb3T40KeY3BLkkexcV08wvR9M/edit#
    """

    def list(self, request):
        """Returns metadata information about the device"""
        # Default to version 1, as earlier versions of Kolibri
        # will not have sent a "v" query param.
        version = request.query_params.get("v", "1")

        return Response(get_device_info(version))


def _get_channel_list(version, params, identifier=None):
    if version == "v1":
        return _get_channel_list_v1(params, identifier=identifier)
    else:
        raise LookupError()


def _get_channel_list_v1(params, identifier=None):
    keyword = params.get("keyword", "").strip()
    language_id = params.get("language", "").strip()

    channels = None
    if identifier:
        channels = ChannelMetadata.objects.filter(pk=identifier)
    else:
        channels = ChannelMetadata.objects.all()

    if keyword != "":
        channels = channels.filter(
            Q(name__icontains=keyword) | Q(description__icontains=keyword)
        )

    if language_id != "":
        matching_tree_ids = (
            ContentNode.objects.prefetch_related("files")
            .filter(
                Q(lang__id__icontains=language_id)
                | Q(files__lang__id__icontains=language_id)
            )
            .values_list("tree_id", flat=True)
        )
        channels = channels.filter(
            Q(root__lang__id__icontains=language_id)
            | Q(root__tree_id__in=matching_tree_ids)
        )

    if not allow_peer_unlisted_channel_import():
        channels = channels.exclude(public=False)

    return channels.filter(root__available=True).distinct()


def public_metadata_cache(view_func):
    view_func = metadata_cache(view_func)

    def wrapped_view(*args, **kwargs):
        response = view_func(*args, **kwargs)
        patch_cache_control(
            response, max_age=300, stale_while_revalidate=100, public=True
        )
        response.headers["Expires"] = http_date(time.time() + 300)
        return response

    return session_exempt(wrapped_view)


@method_decorator(public_metadata_cache, name="dispatch")
class PublicChannelMetadataViewSet(BaseChannelMetadataMixin, ReadOnlyValuesViewset):
    def get_queryset(self):
        return (
            ChannelMetadata.objects.all()
            if allow_peer_unlisted_channel_import()
            else ChannelMetadata.objects.filter(public=True)
        )


@method_decorator(public_metadata_cache, name="dispatch")
class PublicContentNodeViewSet(BaseContentNodeMixin, ReadOnlyValuesViewset):
    pagination_class = OptionalContentNodePagination


@method_decorator(public_metadata_cache, name="dispatch")
class PublicContentNodeTreeViewSet(BaseContentNodeTreeViewset):
    pass


@api_view(["GET"])
def get_public_channel_list(request, version):
    """ Endpoint: /public/<version>/channels/?=<query params> """
    try:
        channel_list = _get_channel_list(version, request.query_params)
    except LookupError:
        return HttpResponseNotFound(
            json.dumps({"id": error_constants.NOT_FOUND, "metadata": {"view": ""}}),
            content_type="application/json",
        )
    return HttpResponse(
        json.dumps(PublicChannelSerializer(channel_list, many=True).data),
        content_type="application/json",
    )


@api_view(["GET"])
def get_public_channel_lookup(request, version, identifier):
    """ Endpoint: /public/<version>/channels/lookup/<identifier> """
    try:
        channel_list = _get_channel_list(
            version,
            request.query_params,
            identifier=identifier.strip().replace("-", ""),
        )
    except LookupError:
        return HttpResponseNotFound(
            json.dumps({"id": error_constants.NOT_FOUND, "metadata": {"view": ""}}),
            content_type="application/json",
        )

    if not channel_list.exists():
        return HttpResponseNotFound(
            json.dumps({"id": error_constants.NOT_FOUND, "metadata": {"view": ""}}),
            content_type="application/json",
        )
    return HttpResponse(
        json.dumps(PublicChannelSerializer(channel_list, many=True).data),
        content_type="application/json",
    )


@csrf_exempt
@gzip_page
def get_public_file_checksums(request, version):
    """ Endpoint: /public/<version>/file_checksums/ """
    if version == "v1":
        if request.content_type == "application/json":
            data = request.body
        elif request.content_type == "application/gzip":
            with gzip.GzipFile(fileobj=io.BytesIO(request.body)) as f:
                data = f.read()
        else:
            return HttpResponseBadRequest("POST body must be either json or gzip")
        try:
            checksums = json.loads(data.decode("utf-8"))
        except ValueError:
            return HttpResponseBadRequest("POST body must be valid json")

        checksums = [
            checksum for checksum in checksums if checksum_regex.match(checksum)
        ]
        available_checksums = set(
            LocalFile.objects.filter(available=True)
            .filter_by_uuids(checksums)
            .values_list("id", flat=True)
            .distinct()
        )
        return HttpResponse(
            generate_checksum_integer_mask(checksums, available_checksums),
            content_type="application/octet-stream",
        )
    return HttpResponseNotFound(
        json.dumps({"id": error_constants.NOT_FOUND, "metadata": {"view": ""}}),
        content_type="application/json",
    )


class QueueDeserializer(serializers.Serializer):
    user = HexOnlyUUIDField()
    instance = HexOnlyUUIDField()


class SyncQueueAPIView(APIView):
    def get_response_data(self, queue_object):
        return dict(
            id=queue_object.id,
            status=queue_object.status,
            keep_alive=queue_object.keep_alive,
        )

    def check_queue(self, queue_object):
        # first, ensure no expired devices are in the queue
        SyncQueue.clean_stale()

        # open a transaction for claiming the next ready queue position, if applicable
        with transaction.atomic():
            current_count = SyncQueue.objects.filter(
                status__in=[
                    SyncQueueStatus.Ready,
                    SyncQueueStatus.Syncing,
                ]
            ).count()
            if current_count < MAX_CONCURRENT_SYNCS:
                next_id = SyncQueue.find_next_id_in_queue()
                if next_id == queue_object.id:
                    queue_object.status = SyncQueueStatus.Ready
                    queue_object.set_next_attempt(HANDSHAKING_TIME)
                    queue_object.save()

        if queue_object.status != SyncQueueStatus.Ready:
            # score the active queue objects
            scored_queue = SyncQueue.objects.filter(
                status__in=[
                    SyncQueueStatus.Queued,
                    SyncQueueStatus.Ready,
                    SyncQueueStatus.Syncing,
                ]
            ).annotate_score()
            # get the score of the current queue object
            score = (
                scored_queue.filter(id=queue_object.id)
                .values_list("score", flat=True)
                .first()
            )
            # get the position of the current queue object
            position = scored_queue.filter(score__gt=score).count()
            # set next attempt in increments of HANDSHAKING_TIME, up to HANDSHAKING_TIME less than
            # the sync interval
            queue_object.set_next_attempt(
                max(
                    HANDSHAKING_TIME,
                    min(
                        HANDSHAKING_TIME * position,
                        OPTIONS["Deployment"]["SYNC_INTERVAL"] - HANDSHAKING_TIME,
                    ),
                )
            )
            queue_object.save()

    def validation_error(self, content, code):
        exc = exceptions.ValidationError(content)
        exc.status_code = code
        return exc

    def create_or_update(self, request):
        if get_device_setting("subset_of_users_device"):
            content = "I'm a Subset of users device. Nothing to do here"
            raise self.validation_error(content, status.HTTP_400_BAD_REQUEST)

        serializer = QueueDeserializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_id = serializer.validated_data["user"]
        instance_id = serializer.validated_data["instance"]

        if not FacilityUser.objects.filter(id=user_id).exists():
            content = "This user is not registered in any of this server facilities"
            raise exceptions.NotFound(content)

        with transaction.atomic():
            queue_object, created = SyncQueue.objects.get_or_create(
                user_id=user_id,
                instance_id=instance_id,
                defaults=dict(
                    status=SyncQueueStatus.Queued,
                ),
            )

        if not created:
            queue_object.status = SyncQueueStatus.Queued
            queue_object.datetime = timezone.now()
            queue_object.set_next_attempt(HANDSHAKING_TIME)

        if queue_object.last_sync is None:
            last_sync = soud.get_last_successful_sync(instance_id)

            if last_sync:
                # Use this rather than the .timestamp() method for Python 2 compatibility
                queue_object.last_sync = time.mktime(last_sync.timetuple())
            else:
                queue_object.last_sync = (
                    time.time() - OPTIONS["Deployment"]["SYNC_INTERVAL"]
                )

        queue_object.save()

        self.check_queue(queue_object)
        return queue_object

    def post(self, request):
        queue_object = self.create_or_update(request)
        return Response(self.get_response_data(queue_object))


class FacilitySearchUsernameViewSet(BaseValuesViewset):
    filter_backends = (DjangoFilterBackend, filters.SearchFilter)
    filterset_fields = ("facility",)
    search_fields = ("^username",)

    values = ("id", "username")

    def list(self, request, *args, **kwargs):
        facility_id = request.query_params.get("facility", None)
        if facility_id is None:
            content = "Missing parameter: facility is required"
            return Response(content, status=status.HTTP_412_PRECONDITION_FAILED)
        try:
            facility = Facility.objects.get(id=facility_id)
        except (AttributeError, Facility.DoesNotExist, ValueError):
            content = "The facility does not exist in this device"
            return Response(content, status=status.HTTP_404_NOT_FOUND)

        if facility.dataset.learner_can_login_with_no_password:
            queryset = self.filter_queryset(self.get_queryset())
            return Response(self.serialize(queryset))
        else:
            username = request.query_params.get("search", None)
            queryset = self.get_queryset().filter(
                facility=facility_id, username__iexact=username
            )
            response = (
                [
                    {"username": username, "id": None},
                ]
                if queryset
                else []
            )
            return Response(response)

    def get_queryset(self):
        return FacilityUser.objects.filter(roles=None).filter(
            Q(devicepermissions__is_superuser=False) | Q(devicepermissions__isnull=True)
        )
