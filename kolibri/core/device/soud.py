import datetime
import json
import logging
import time

from django.core.management import call_command
from django.db import transaction
from django.db.models import F
from django.db.models import Q
from django.utils.functional import cached_property
from morango.constants import transfer_stages
from morango.constants import transfer_statuses
from morango.errors import MorangoResumeSyncError
from morango.models.core import InstanceIDModel
from morango.models.core import SyncSession
from morango.models.core import TransferSession
from rest_framework import status

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.models import FacilityDataset
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import SyncQueue
from kolibri.core.device.models import SyncQueueStatus
from kolibri.core.device.utils import is_full_facility_import
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkClientError
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.utils.urls import reverse_path
from kolibri.utils.conf import OPTIONS


logger = logging.getLogger(__name__)
WINDOW_SEC = 3
MAX_ATTEMPTS = 5


class Context(object):
    """
    A helper class to hold the context of a SoUD sync request, providing access to the necessary
    models and data.
    """

    def __init__(self, user_id, instance_id):
        self.user_id = user_id
        self.instance_id = instance_id

    @cached_property
    def user(self):
        return FacilityUser.objects.get(id=self.user_id)

    @property
    def has_sync_queue(self):
        return SyncQueue.objects.filter(
            user_id=self.user_id, instance_id=self.instance_id
        ).exists()

    @property
    def sync_queue(self):
        queue, _ = SyncQueue.objects.get_or_create(
            user_id=self.user_id,
            instance_id=self.instance_id,
            defaults=dict(
                status=SyncQueueStatus.Pending,
            ),
        )
        return queue

    @cached_property
    def network_location(self):
        return NetworkLocation.objects.filter(
            instance_id=self.instance_id,
            connection_status=ConnectionStatus.Okay,
            application="kolibri",
        ).first()

    @property
    def dataset_id(self):
        return self.user.dataset_id

    @cached_property
    def request_data(self):
        instance_model = InstanceIDModel.get_or_create_current_instance()[0]
        return dict(user=self.user_id, instance=instance_model.id)

    def __str__(self):
        return "[user={}] [server={}]".format(self.user_id, self.instance_id)


def find_client_sync_session(context):
    """
    Finds the most recently active sync session for a SoUD sync
    """
    # SoUD requests sync with server, so for resume we filter by client and matching instance
    sync_sessions = SyncSession.objects.filter(
        active=True,
        connection_kind="network",
        profile=PROFILE_FACILITY_DATA,
        client_certificate__scope_definition_id=ScopeDefinitions.SINGLE_USER,
        is_server=False,
        server_instance_id=context.instance_id,
    ).order_by("-last_activity_timestamp")

    # ensure the certificate is for the user we're checking for
    for sync_session in sync_sessions:
        scope_params = json.loads(sync_session.client_certificate.scope_params)
        dataset_id = scope_params.get("dataset_id")
        user_id = scope_params.get("user_id")
        if user_id == context.user_id and context.dataset_id == dataset_id:
            return sync_session

    return None


def get_last_successful_sync(with_instance_id, as_server=True):
    """
    Returns the datetime of the last successful sync with the given instance_id.
    :param with_instance_id: The instance ID of the other device
    :param as_server: Whether this device was the server or not
    :rtype: datetime.datetime
    """
    sync_session_filter = {"sync_session__is_server": as_server}
    if as_server:
        sync_session_filter["sync_session__client_instance_id"] = with_instance_id
    else:
        sync_session_filter["sync_session__server_instance_id"] = with_instance_id

    transfer_session = (
        TransferSession.objects.filter(
            active=False,
            transfer_stage=transfer_stages.CLEANUP,
            transfer_stage_status=transfer_statuses.COMPLETED,
            **sync_session_filter
        )
        .order_by("-last_activity_timestamp")
        .first()
    )

    if transfer_session:
        return transfer_session.last_activity_timestamp
    return None


class SoudNetworkClient(NetworkClient):
    def request_sync_queue(self, context):
        """
        Request a sync from the device with the given instance_id.
        """
        logger.debug("{} Requesting SoUD sync with server".format(context))
        return self.post(
            reverse_path("kolibri:core:syncqueue"),
            json=context.request_data,
        )


def get_all_user_ids():
    """
    Returns a generator of all user ids that are eligible for SoUD syncing.
    :return: Generator of user ids
    :rtype: generator<str>
    """
    for dataset_id in FacilityDataset.objects.values_list("id", flat=True):
        if is_full_facility_import(dataset_id):
            continue

        for user_id in FacilityUser.objects.filter(dataset_id=dataset_id).values_list(
            "id", flat=True
        ):
            yield user_id


def request_sync_hook(network_location):
    """
    Kolibri plugin hook logic to request a sync from a device when discovered as accessible
    on the network.
    """
    for user_id in get_all_user_ids():
        context = Context(user_id, network_location.instance_id)

        with transaction.atomic():
            # context getter does get_or_create, so check if queue already exists before accessing
            had_queue = context.has_sync_queue
            sync_queue = context.sync_queue

            if had_queue and sync_queue.is_active:
                # if it's active, we don't want to reset it
                continue

            # reset sync queue when network location changes and it's inactive
            sync_queue.reset_next_attempt(0)  # now
            sync_queue.status = SyncQueueStatus.Pending
            sync_queue.save()

        logger.info("{} Checking SoUD sync".format(context))
        request_sync(context, network_location=network_location)


def validate_sync_queue_for_sync_request(sync_queue):
    if sync_queue.status == SyncQueueStatus.Ready:
        # if ready, the server has told us to sync so we shouldn't request a queue position until
        # we've synced
        return False
    elif sync_queue.attempts > MAX_ATTEMPTS:
        # if we have tried to sync more than 5 times, we should stop trying, unless provided
        # with a network location, which means a potential network change and possible chance for
        # success
        return False
    elif (
        sync_queue.status == SyncQueueStatus.Queued
        and sync_queue.attempt_at > attempt_execute_window()
    ):
        # if we have a queue id and it's not time to recheck, don't re-request. this protects
        # against potential flippant network connections
        return False
    # otherwise, we're good to go
    return True


def handle_sync_request_response(context, sync_queue, response):
    data = response.json()
    if data["status"] == SyncQueueStatus.Ready:
        logger.info("{} SoUD sync ready".format(context))
        sync_queue.status = SyncQueueStatus.Ready
        sync_queue.reset_next_attempt(0)  # now
        sync_session = find_client_sync_session(context)
        if sync_session:
            sync_queue.sync_session_id = sync_session.id
    elif data["status"] == SyncQueueStatus.Queued:
        logger.info("{} SoUD sync queued".format(context))
        sync_queue.status = SyncQueueStatus.Queued
        sync_queue.reset_next_attempt(int(data.get("keep_alive", 0)))
    else:
        logger.warning(
            "{} Unknown response action for SoUD sync request | {}".format(
                context, data
            )
        )
        sync_queue.status = SyncQueueStatus.Pending


def request_sync(context, network_location=None):
    """
    Request a sync from the device with the given instance_id.
    """
    from kolibri.core.auth.tasks import queue_soud_sync_cleanup

    sync_queue = context.sync_queue
    if not validate_sync_queue_for_sync_request(sync_queue):
        return

    network_location = network_location or context.network_location

    # the SoUD syncing is currently dependent on network discovery, but as long as we have a
    # network location, we can request a sync
    if network_location is None or not network_location.available:
        logger.info("{} Network location unavailable".format(context))
        if sync_queue.sync_session_id:
            # remove sync session
            queue_soud_sync_cleanup(sync_queue.sync_session_id)
            sync_queue.sync_session_id = None
        sync_queue.increment_and_backoff_next_attempt()
        sync_queue.save()
        return

    try:
        with SoudNetworkClient.build_from_network_location(network_location) as client:
            response = client.request_sync_queue(context)
    except (NetworkClientError, NetworkLocationNotFound):
        logger.warning(
            "{} Unable to request SoUD sync from unavailable network location".format(
                context
            )
        )
        sync_queue.increment_and_backoff_next_attempt()
    else:
        if response.status_code == status.HTTP_200_OK:
            handle_sync_request_response(context, sync_queue, response)
        elif response.status_code == status.HTTP_404_NOT_FOUND:
            logger.debug(
                "{} User was not found requesting SoUD sync from server".format(context)
            )
            sync_queue.status = SyncQueueStatus.Ineligible
        else:
            logger.warning(
                "{} {} response for SoUD sync request | {}".format(
                    context, response.status_code, response.content
                )
            )
            sync_queue.status = SyncQueueStatus.Pending
            sync_queue.increment_and_backoff_next_attempt()
    finally:
        sync_queue.save()


def get_eligible_syncs():
    return SyncQueue.objects.exclude(
        Q(
            status__in=[
                SyncQueueStatus.Ineligible,
                SyncQueueStatus.Syncing,
            ]
        )
        | Q(attempts__gt=MAX_ATTEMPTS)
    ).annotate(attempt_at=F("updated") + F("keep_alive"))


def get_time_to_next_attempt():
    """
    Returns a datetime object representing the next time sync processing should occur
    """
    attempt_at = (
        get_eligible_syncs()
        .order_by("attempt_at")
        .values_list("attempt_at", flat=True)
        .first()
    )
    if attempt_at is None:
        return None
    return datetime.timedelta(seconds=max(attempt_at - time.time(), 0))


def attempt_execute_window():
    """
    Returns a datetime object representing the end of the current time window for executing syncs.
    """
    return time.time() + WINDOW_SEC


def execute_syncs():
    """
    Core SoUD sync processing logic that processes any syncs that
    """
    # since there should only ever be one processing job running at a time, if we encounter any in
    # the queue that are marked as syncing, we should reset their status to pending because it must
    # mean that the previous job was terminated unexpectedly
    SyncQueue.objects.filter(status=SyncQueueStatus.Syncing,).update(
        status=SyncQueueStatus.Pending,
        updated=time.time(),
        keep_alive=0,
    )

    base_qs = (
        get_eligible_syncs()
        .order_by("attempt_at")
        .values_list("user_id", "instance_id")
    )

    qs = base_qs.filter(attempt_at__lte=attempt_execute_window())
    while qs.exists():
        # first, try to sync any that are ready
        for user_id, instance_id in qs.filter(status=SyncQueueStatus.Ready):
            execute_sync(Context(user_id, instance_id))

        # then, try to recheck any that are waiting or need queued
        for user_id, instance_id in qs.filter(
            status__in=[SyncQueueStatus.Queued, SyncQueueStatus.Pending]
        ):
            request_sync(Context(user_id, instance_id))

        # reset time window for next loop
        qs = base_qs.filter(attempt_at__lte=attempt_execute_window())


def execute_sync(context):
    """
    Execute a SoUD sync for the given context.
    :param context: The context object
    :type context: Context
    """
    from kolibri.core.auth.tasks import queue_soud_sync_cleanup

    sync_queue = context.sync_queue
    sync_session_id = sync_queue.sync_session_id
    cleanup = False
    command = "sync"
    kwargs = dict(
        user=context.user_id,
        baseurl=context.network_location.base_url,
        keep_alive=True,
        noninteractive=True,
    )

    if sync_session_id:
        command = "resumesync"
        kwargs["id"] = sync_session_id
    else:
        kwargs["facility"] = context.user.facility_id

    sync_queue.status = SyncQueueStatus.Syncing
    sync_queue.save()

    try:
        # context filters the network location to only those marked available
        if not context.network_location:
            raise NetworkLocation.DoesNotExist

        call_command(command, **kwargs)
    except NetworkLocation.DoesNotExist:
        cleanup = True
        logger.debug("{} Network location unavailable".format(context))
        sync_queue.status = SyncQueueStatus.Pending
        sync_queue.increment_and_backoff_next_attempt()
    except Exception as e:
        cleanup = True
        if isinstance(e, MorangoResumeSyncError):
            # will be retried immediately with Ready status
            sync_queue.status = SyncQueueStatus.Ready
            logger.warning(
                "{} Failed to resume SoUD sync session: {}".format(context, str(e))
            )
        else:
            logger.error(
                "{} Critical error occurred during syncing: {}".format(context, str(e))
            )
            logger.exception(e)
            sync_queue.status = SyncQueueStatus.Pending
            sync_queue.increment_and_backoff_next_attempt()
    else:
        # success, so reset and set next attempt to be in the future according to settings
        sync_queue.status = SyncQueueStatus.Pending
        sync_queue.reset_next_attempt(OPTIONS["Deployment"]["SYNC_INTERVAL"])
    finally:
        # cleanup session on error if we tried to resume it
        if cleanup and sync_session_id:
            # remove sync session
            sync_queue.sync_session_id = None
            queue_soud_sync_cleanup(sync_session_id)
        sync_queue.save()
