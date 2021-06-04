import datetime
import json
import logging
import platform
import random

import requests
from django.core.urlresolvers import reverse
from morango.models import InstanceIDModel
from rest_framework import status

import kolibri
from kolibri.core.device.utils import DeviceNotProvisioned
from kolibri.core.device.utils import get_device_setting
from kolibri.core.public.constants.user_sync_statuses import QUEUED
from kolibri.core.public.constants.user_sync_statuses import SYNC
from kolibri.core.tasks.job import Job
from kolibri.core.tasks.main import queue
from kolibri.core.tasks.main import scheduler

logger = logging.getLogger(__name__)


def get_device_info():
    """Returns metadata information about the device"""

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]
    try:
        device_name = get_device_setting("name")
        subset_of_users_device = get_device_setting("subset_of_users_device")
    # When Koliri starts at the first time, and device hasn't been created
    except DeviceNotProvisioned:
        device_name = instance_model.hostname
        subset_of_users_device = False

    info = {
        "application": "kolibri",
        "kolibri_version": kolibri.__version__,
        "instance_id": instance_model.id,
        "device_name": device_name,
        "operating_system": platform.system(),
        "subset_of_users_device": subset_of_users_device,
    }
    return info


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
        if server_response["action"] == SYNC:
            # TODO: queue a sync task in the server, when this is developed
            logger.info("Enqueuing a sync task for user {}".format(user))

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
