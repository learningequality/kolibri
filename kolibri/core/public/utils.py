import datetime
import hashlib
import json
import logging
import platform
import random

import requests
from django.core.management import call_command
from django.core.urlresolvers import reverse
from django.utils import timezone
from morango.errors import MorangoResumeSyncError
from morango.models import InstanceIDModel
from morango.models import SyncSession
from requests.exceptions import ConnectionError
from rest_framework import status
from six.moves.urllib.parse import urljoin

import kolibri
from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import ScopeDefinitions
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.core.device.utils import get_device_setting
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.tasks.api import prepare_soud_resume_sync_job
from kolibri.core.tasks.api import prepare_soud_sync_job
from kolibri.core.tasks.api import prepare_sync_task
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.job import State
from kolibri.core.tasks.main import queue
from kolibri.core.tasks.main import scheduler
from kolibri.utils.conf import OPTIONS


logger = logging.getLogger(__name__)


device_info_keys = {
    "1": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
    ],
    "2": [
        "application",
        "kolibri_version",
        "instance_id",
        "device_name",
        "operating_system",
        "subset_of_users_device",
    ],
}

DEVICE_INFO_VERSION = "2"


def get_device_info(version=DEVICE_INFO_VERSION):
    """
    Returns metadata information about the device
    The default kwarg version should always be the latest
    version of device info that this function supports.
    We maintain historic versions for backwards compatibility
    """

    if version not in device_info_keys:
        version = DEVICE_INFO_VERSION

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]
    try:
        device_name = get_device_setting("name")
        subset_of_users_device = get_device_setting("subset_of_users_device")
    # When Koliri starts at the first time, and device hasn't been created
    except DeviceNotProvisioned:
        device_name = instance_model.hostname
        subset_of_users_device = False

    all_info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": device_name,
        "operating_system": platform.system(),
        "subset_of_users_device": subset_of_users_device,
    }

    info = {}

    # By this point, we have validated that the version is in device_info_keys
    for key in device_info_keys.get(version, []):
        info[key] = all_info[key]

    return info


def find_soud_sync_sessions(using=None, **filters):
    """
    :param using: Database alias string
    :param filters: A dict of queryset filter
    :return: A SyncSession queryset
    """
    qs = SyncSession.objects.all()
    if using is not None:
        qs = qs.using(using)

    return qs.filter(
        active=True,
        connection_kind="network",
        profile=PROFILE_FACILITY_DATA,
        client_certificate__scope_definition_id=ScopeDefinitions.SINGLE_USER,
        **filters
    ).order_by("-last_activity_timestamp")


def find_soud_sync_session_for_resume(user, base_url, using=None):
    """
    Finds the most recently active sync session for a SoUD sync

    :type user: FacilityUser
    :param base_url: The server url
    :type base_url: str
    :param using: Database alias string
    :rtype: SyncSession|None
    """
    # SoUD requests sync with server, so for resume we filter by client and matching base url
    sync_sessions = find_soud_sync_sessions(
        is_server=False,
        connection_path__startswith=base_url.rstrip("/"),
        using=using,
    )

    # ensure the certificate is for the user we're checking for
    for sync_session in sync_sessions:
        scope_params = json.loads(sync_session.client_certificate.scope_params)
        dataset_id = scope_params.get("dataset_id")
        user_id = scope_params.get("user_id")
        if user_id == user.id and user.dataset_id == dataset_id:
            return sync_session

    return None


def peer_sync(command, **kwargs):
    cleanup = False
    resync_interval = kwargs["resync_interval"]
    try:
        call_command(command, **kwargs)
    except Exception as e:
        cleanup = True
        if isinstance(e, MorangoResumeSyncError):
            # override to reschedule a sync sooner in this case
            resync_interval = 5
            logger.warning(
                "Failed to resume sync session for user {} to server {}; queuing its cleanup".format(
                    kwargs["user"], kwargs["baseurl"]
                )
            )
        else:
            logger.error(
                "Error syncing user {} to server {}".format(
                    kwargs["user"], kwargs["baseurl"]
                )
            )
            raise
    finally:
        # cleanup session on error if we tried to resume it
        if cleanup and command == "resumesync":
            # for resume we should have id kwarg
            queue_soud_sync_cleanup(kwargs["id"])
        # schedule a new sync
        schedule_new_sync(kwargs["baseurl"], kwargs["user"], interval=resync_interval)


def startpeerusersync(
    server, user_id, resync_interval=OPTIONS["Deployment"]["SYNC_INTERVAL"]
):
    """
    Initiate a SYNC (PULL + PUSH) of a specific user from another device.
    """

    user = FacilityUser.objects.get(pk=user_id)
    facility_id = user.facility.id

    device_info = get_device_info()
    command = "sync"
    common_job_args = dict(
        keep_alive=True,
        resync_interval=resync_interval,
        job_id=hashlib.md5("{}::{}".format(server, user).encode()).hexdigest(),
        extra_metadata=prepare_sync_task(
            facility_id,
            user_id,
            user.username,
            user.facility.name,
            device_info["device_name"],
            device_info["instance_id"],
            server,
            type="SYNCPEER/SINGLE",
        ),
    )
    job_data = None
    # attempt to resume an existing session
    sync_session = find_soud_sync_session_for_resume(user, server)
    if sync_session is not None:
        command = "resumesync"
        # if resuming encounters an error, it should close the session to avoid a loop
        job_data = prepare_soud_resume_sync_job(
            server, sync_session.id, user_id, **common_job_args
        )

    # if not resuming, prepare normal job
    if job_data is None:
        job_data = prepare_soud_sync_job(
            server, facility_id, user_id, **common_job_args
        )

    job_id = queue.enqueue(peer_sync, command, **job_data)
    return job_id


def stoppeerusersync(server, user_id):
    """
    Close the sync session with a server
    """
    logger.debug(
        "Stopping SoUD syncs for user {} against server {}".format(user_id, server)
    )

    user = FacilityUser.objects.get(pk=user_id)
    sync_session = find_soud_sync_session_for_resume(user, server)

    # clear jobs with matching ID
    job_id = hashlib.md5("{}::{}".format(server, user_id).encode()).hexdigest()
    queue.clear_job(job_id)
    scheduler.cancel(job_id)

    # skip if we couldn't find one for resume
    if sync_session is None:
        return

    logger.debug("Enqueuing cleanup of SoUD sync session {}".format(sync_session.id))
    return queue_soud_sync_cleanup(sync_session.id)


def begin_request_soud_sync(server, user):
    """
    Enqueue a task to request this SoUD to be
    synced with a server
    """
    info = get_device_info()
    if not info["subset_of_users_device"]:
        # this does not make sense unless this is a SoUD
        logger.warning("Only Subsets of Users Devices can do automated SoUD syncing.")
        return
    users = UserSyncStatus.objects.filter(user_id=user).values(
        "queued", "sync_session__last_activity_timestamp"
    )
    if users:
        SYNC_INTERVAL = OPTIONS["Deployment"]["SYNC_INTERVAL"]
        dt = datetime.timedelta(seconds=SYNC_INTERVAL)
        if timezone.now() - users[0]["sync_session__last_activity_timestamp"] < dt:
            schedule_new_sync(server, user)
            return

        if users[0]["queued"]:
            failed_jobs = [
                j
                for j in queue.jobs
                if j.state == State.FAILED
                and j.extra_metadata.get("started_by", None) == user
                and j.extra_metadata.get("type", None) == "SYNCPEER/SINGLE"
            ]
            queued_jobs = [
                j
                for j in queue.jobs
                if j.state == State.QUEUED
                and j.extra_metadata.get("started_by", None) == user
                and j.extra_metadata.get("type", None) == "SYNCPEER/SINGLE"
            ]
            if failed_jobs:
                for j in failed_jobs:
                    queue.clear_job(j.job_id)
                # if previous sync jobs have failed, unblock UserSyncStatus to try again:
                UserSyncStatus.objects.update_or_create(
                    user_id=user, defaults={"queued": False}
                )
            elif queued_jobs:
                return  # If there are pending and not failed jobs, don't enqueue a new one

    logger.info(
        "Queuing SoUD syncing request against server {} for user {}".format(
            server, user
        )
    )
    queue.enqueue(request_soud_sync, server, user)


def stop_request_soud_sync(server, user):
    """
    Cleanup steps to stop SoUD syncing
    """
    info = get_device_info()
    if not info["subset_of_users_device"]:
        # this does not make sense unless this is a SoUD
        logger.warning("Only Subsets of Users Devices can do this")
        return

    # close active sync session
    stoppeerusersync(server, user)


def request_soud_sync(server, user, queue_id=None, ttl=4):
    """
    Make a request to the serverurl endpoint to sync this SoUD (Subset of Users Device)
        - If the server says "sync now" immediately queue a sync task for the server
        - If the server responds with an identifier and interval, schedule itself to run
        again in the future with that identifier as an argument, at the interval specified
    """

    if queue_id is None:
        endpoint = reverse("kolibri:core:syncqueue-list")
    else:
        endpoint = reverse("kolibri:core:syncqueue-detail", kwargs={"pk": queue_id})

    server_url = urljoin(server, endpoint)

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]

    logger.debug("Requesting SoUD sync for user {} and server {}".format(user, server))
    try:
        data = {"user": user, "instance": instance_model.id}
        if queue_id is None:
            # Set connection timeout to slightly larger than a multiple of 3, as per:
            # https://docs.python-requests.org/en/master/user/advanced/#timeouts
            # Use a relatively short connection timeout so that we don't block
            # waiting for servers that have dropped off the network.
            response = requests.post(server_url, json=data, timeout=(6.05, 30))
        else:
            # Use a blanket 30 second timeout for PUT requests, as we have already
            # got a place in the queue to sync with this server, so we can be
            # more sure that the server is actually available.
            response = requests.put(server_url, json=data, timeout=30)
        if response.status_code >= status.HTTP_500_INTERNAL_SERVER_ERROR:
            raise ConnectionError()
    except ConnectionError:
        # Algorithm to try several times if the server is not responding
        # Randomly it can be trying it up to 1560 seconds (26 minutes)
        # before desisting
        ttl -= 1
        if ttl == 0:
            logger.error(
                "Give up trying to connect to the server {} for user {}".format(
                    server, user
                )
            )
            return
        interval = random.randint(1, 30 * (10 - ttl))
        job = Job(request_soud_sync, server, user, queue_id, ttl)
        dt = datetime.timedelta(seconds=interval)
        scheduler.enqueue_in(dt, job)
        if queue_id:
            logger.warning(
                "Connection error connecting to server {} for user {}, for queue id {}. Trying to connect in {} seconds".format(
                    server, user, queue_id, interval
                )
            )
        else:
            logger.warning(
                "Connection error connecting to server {} for user {}. Trying to connect in {} seconds".format(
                    server, user, interval
                )
            )
        return

    if response.status_code == status.HTTP_404_NOT_FOUND:
        logger.debug(
            "User {} was not found requesting SoUD sync from server {}".format(
                user, server
            )
        )
        return  # Request done to a server not owning this user's data

    if response.status_code == status.HTTP_200_OK:
        handle_server_sync_response(response, server, user)
    else:
        logger.warning(
            "{} response for user {} SoUD sync request to server {} | {}".format(
                response.status_code, user, server, response.content
            )
        )


def handle_server_sync_response(response, server, user):
    # In either case, we set the sync status for this user as queued
    # Once the sync starts, then this should get cleared and the SyncSession
    # set on the status, so that more info can be garnered.
    JOB_ID = hashlib.md5("{}::{}".format(server, user).encode()).hexdigest()
    server_response = response.json()

    UserSyncStatus.objects.update_or_create(user_id=user, defaults={"queued": True})

    if server_response["action"] == SYNC:
        server_sync_interval = server_response.get(
            "sync_interval", str(OPTIONS["Deployment"]["SYNC_INTERVAL"])
        )
        job_id = startpeerusersync(server, user, server_sync_interval)
        logger.info(
            "Enqueuing a sync task for user {} with server {} in job {}".format(
                user, server, job_id
            )
        )

    elif server_response["action"] == QUEUED:
        pk = server_response["id"]
        time_alive = server_response["keep_alive"]
        dt = datetime.timedelta(seconds=int(time_alive))
        job = Job(request_soud_sync, server, user, pk, job_id=JOB_ID)
        scheduler.enqueue_in(dt, job)
        logger.info(
            "Server {} busy for user {}, will try again in {} seconds with pk={}".format(
                server, user, time_alive, pk
            )
        )


def schedule_new_sync(server, user, interval=OPTIONS["Deployment"]["SYNC_INTERVAL"]):
    # reschedule the process for a new sync
    logging.info(
        "Requeueing to sync with server {} for user {} in {} seconds".format(
            server, user, interval
        )
    )
    dt = datetime.timedelta(seconds=interval)
    JOB_ID = hashlib.md5("{}:{}".format(server, user).encode()).hexdigest()
    job = Job(request_soud_sync, server, user, job_id=JOB_ID)
    scheduler.enqueue_in(dt, job)


@register_task
def soud_sync_cleanup(**filters):
    """
    Targeted cleanup of active SoUD sessions

    :param filters: A dict of queryset filters for SyncSession model
    """
    logger.debug("Running SoUD sync cleanup | {}".format(filters))
    sync_sessions = find_soud_sync_sessions(**filters)
    clean_up_ids = sync_sessions.values_list("id", flat=True)

    if clean_up_ids:
        call_command("cleanupsyncs", ids=clean_up_ids, expiration=0)


def queue_soud_sync_cleanup(*sync_session_ids):
    """
    Queue targeted cleanup of active SoUD sessions

    :param sync_session_ids: ID's of sync sessions we should cleanup
    """
    return soud_sync_cleanup.enqueue(pk__in=sync_session_ids)


def queue_soud_server_sync_cleanup(client_ip):
    """
    A server oriented cleanup of active SoUD sessions

    :param client_ip: The IP address of the client
    """
    return soud_sync_cleanup.enqueue(client_ip=client_ip, is_server=True)
