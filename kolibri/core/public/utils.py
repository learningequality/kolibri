import datetime
import json
import logging
import platform
import random

import requests
from django.core.management import call_command
from django.core.urlresolvers import reverse
from morango.models import InstanceIDModel
from rest_framework import status

import kolibri
from kolibri.core.auth.models import FacilityUser
from kolibri.core.device.models import UserSyncStatus
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.core.device.utils import get_device_setting
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.tasks.api import prepare_soud_sync_job
from kolibri.core.tasks.api import prepare_sync_task
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.main import queue
from kolibri.core.tasks.main import scheduler


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


def startpeerusersync(server, user_id):
    """
    Initiate a SYNC (PULL + PUSH) of a specific user from another device.
    """

    user = FacilityUser.objects.get(pk=user_id)
    facility_id = user.facility.id

    device_info = get_device_info()

    extra_metadata = prepare_sync_task(
        facility_id,
        user_id,
        user.username,
        user.facility.name,
        device_info["device_name"],
        device_info["instance_id"],
        server,
        type="SYNCPEER/SINGLE",
    )

    job_data = prepare_soud_sync_job(
        server, facility_id, user_id, extra_metadata=extra_metadata
    )

    job_id = queue.enqueue(call_command, "sync", **job_data)

    return job_id


def begin_request_soud_sync(server, user):
    """
    Enqueue a task to request this SoUD to be
    synced with a server
    """
    info = get_device_info()
    if not info["subset_of_users_device"]:
        # this does not make sense unless this is a SoUD
        logger.warn("Only Subsets of Users Devices can do this")
        return
    logger.info("Queuing SoUD syncing request")
    queue.enqueue(request_soud_sync, server, user)


def request_soud_sync(server, user=None, queue_id=None, ttl=10):
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
    server_url = "{server}{endpoint}".format(server=server, endpoint=endpoint)

    try:
        if queue_id is None:
            data = {"user": user}
            response = requests.post(server_url, json=data)
        else:
            data = {"pk": queue_id}
            response = requests.put(server_url, json=data)

    except requests.exceptions.ConnectionError:
        # Algorithm to try several times if the server is not responding
        # Randomly it can be trying it up to 1560 seconds (26 minutes)
        # before desisting
        ttl -= 1
        if ttl == 0:
            logger.error("Give up trying to connect to the server")
            return
        interval = random.randint(1, 30 * (10 - ttl))
        job = Job(request_soud_sync, server, user, queue_id, ttl)
        dt = datetime.timedelta(seconds=interval)
        scheduler.enqueue_in(dt, job)
        logger.warn(
            "The server has some trouble. Trying to connect in {} seconds".format(
                interval
            )
        )
        return

    response_content = (
        response.content.decode()
        if isinstance(response.content, bytes)
        else response.content
    )
    server_response = json.loads(response_content or "{}")
    if response.status_code == status.HTTP_404_NOT_FOUND:
        return  # Request done to a server not owning this user's data

    if response.status_code == status.HTTP_200_OK:
        # In either case, we set the sync status for this user as queued
        # Once the sync starts, then this should get cleared and the SyncSession
        # set on the status, so that more info can be garnered.
        UserSyncStatus.objects.update_or_create(user_id=user, defaults={"queued": True})

        if server_response["action"] == SYNC:
            job_id = startpeerusersync(server, user)
            logger.info(
                "Enqueuing a sync task for user {} in job {}".format(user, job_id)
            )

        elif server_response["action"] == QUEUED:
            pk = server_response["id"]
            time_alive = server_response["keep_alive"]
            dt = datetime.timedelta(seconds=int(time_alive))
            job = Job(request_soud_sync, server, user, pk)
            scheduler.enqueue_in(dt, job)
            logger.info(
                "Server busy, will try again in {} seconds with pk={}".format(
                    time_alive, pk
                )
            )
