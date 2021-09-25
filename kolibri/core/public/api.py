import datetime
import gzip
import io
import json
import time

from django.db.models import Q
from django.http import HttpResponse
from django.http import HttpResponseBadRequest
from django.http import HttpResponseNotFound
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.gzip import gzip_page
from morango.constants import transfer_statuses
from morango.models.core import TransferSession
from rest_framework import status
from rest_framework import viewsets
from rest_framework.decorators import api_view
from rest_framework.response import Response

from .. import error_constants
from .constants.user_sync_statuses import QUEUED
from .constants.user_sync_statuses import SYNC
from .utils import get_device_info
from .utils import get_device_setting
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.serializers import PublicChannelSerializer
from kolibri.core.content.utils.file_availability import generate_checksum_integer_mask
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import allow_peer_unlisted_channel_import
from kolibri.core.public.constants.user_sync_options import DELAYED_SYNC
from kolibri.core.public.constants.user_sync_options import HANDSHAKING_TIME
from kolibri.core.public.constants.user_sync_options import MAX_CONCURRENT_SYNCS
from kolibri.core.public.constants.user_sync_options import STALE_QUEUE_TIME
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
        checksums = json.loads(data.decode("utf-8"))
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


class SyncQueueViewSet(viewsets.ViewSet):
    def get_response_data(self, user, instance, pos, sync_interval, queue_object):
        current_transfers = (
            TransferSession.objects.filter(
                Q(
                    active=True,
                    last_activity_timestamp__gte=timezone.now()
                    - datetime.timedelta(minutes=5),
                )
                | Q(
                    last_activity_timestamp__gte=timezone.now()
                    - datetime.timedelta(seconds=10)
                )
            )
            .exclude(transfer_stage_status=transfer_statuses.ERRORED)
            .count()
        )
        if MAX_CONCURRENT_SYNCS - current_transfers > pos:
            data = {"action": SYNC, "sync_interval": sync_interval}
            if queue_object is not None:
                queue_object.delete()
        else:
            # polling time at least HANDSHAKING_TIME seconds per position in the queue to
            # be greater than the time needed for the handshake part of the ssl protocol
            # we add one to the zero based position, as if the position is zero and it
            # got to here, it means the sync queue is currently full, so we need to wait.
            # we make sure that it is never less than half of the stale queue time, as the keep alive
            # that we set here will be used to determine after what interval we should be expiring
            # the queue item as stale - the keep_alive is doubled in order to achieve this, so
            # by setting half the STALE_QUEUE_TIME to keep_alive, we are indirectly enforcing
            # a stale queue time via the keep_alive.
            polling = min(HANDSHAKING_TIME * (pos + 1), STALE_QUEUE_TIME / 2)
            data = {
                "action": QUEUED,
                "keep_alive": polling,
            }
            if queue_object is not None:
                # If the queue object exists, update it here.
                queue_object.updated = time.time()
                queue_object.keep_alive = polling
                queue_object.save()
            else:
                # If no queue object, either because there was no pk
                # or the pk was stale, generate a new object here.
                queue_object = SyncQueue.objects.create(
                    user_id=user,
                    instance_id=instance,
                    keep_alive=polling,
                )

            data["id"] = queue_object.id
        return data

    def check_queue(self, request, pk=None):
        is_SoUD = get_device_setting("subset_of_users_device", False)
        if is_SoUD:
            content = "I'm a Subset of users device. Nothing to do here"
            # would love to use HTTP 418, but it's not fully usable in browsers
            return Response(content, status=status.HTTP_400_BAD_REQUEST)

        user = request.data.get("user") or request.query_params.get("user")
        if user is None:
            content = "Missing parameter: user is required"
            return Response(content, status=status.HTTP_412_PRECONDITION_FAILED)

        instance = request.data.get("instance") or request.query_params.get("instance")
        if instance is None:
            content = "Missing parameter: instance is required"
            return Response(content, status=status.HTTP_412_PRECONDITION_FAILED)

        if not FacilityUser.objects.filter(id=user).exists():
            content = "This user is not registered in any of this server facilities"
            return Response(content, status=status.HTTP_404_NOT_FOUND)

        # first, ensure no expired devices are in the queue
        SyncQueue.clean_stale()

        # Calculate the total size of the queue to scale things
        total_queue_size = SyncQueue.objects.count()

        # Scale the sync_interval we send to clients based on the total number of
        # queued single user sync requests.
        # Make sure it is no longer than half the time by which we measure 'recently synced'
        # to make sure we are never letting syncing drift too far.
        sync_interval = min(
            OPTIONS["Deployment"]["SYNC_INTERVAL"] * (total_queue_size + 1),
            DELAYED_SYNC / 2,
        )

        if pk is not None:
            queue_object = SyncQueue.objects.filter(id=pk).first()
        else:
            queue_object = SyncQueue.objects.filter(
                user_id=user, instance_id=instance
            ).first()

        # Default the position to the total queue size, so that
        # if the id does not exist, send them to the back of the queue
        pos = total_queue_size
        if queue_object is not None:
            if queue_object.user_id != user:
                return Response(
                    "Queue did not match user in request",
                    status=status.HTTP_400_BAD_REQUEST,
                )
            if queue_object.instance_id != instance:
                return Response(
                    "Queue did not match instance in request",
                    status=status.HTTP_400_BAD_REQUEST,
                )
            # To work out the position in the queue, find all queued sync requests
            # that were made before this request. If pk is None or the queue
            # has expired (3 minutes), we will set the position to the length of the
            # queue.
            before_client = SyncQueue.objects.filter(datetime__lt=queue_object.datetime)
            pos = before_client.count()

        data = self.get_response_data(user, instance, pos, sync_interval, queue_object)

        UserSyncStatus.objects.update_or_create(
            user_id=user, defaults={"queued": data["action"] == QUEUED}
        )
        return Response(data)

    def create(self, request):
        return self.check_queue(request)

    def update(self, request, pk=None):
        return self.check_queue(request, pk=pk)
