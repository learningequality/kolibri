from django.core.management import call_command
from django.core.management.base import CommandError
from morango.models import ScopeDefinition
from morango.sync.controller import MorangoProfileController
from requests.exceptions import HTTPError
from rest_framework import status
from rest_framework.exceptions import APIException
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import ParseError
from rest_framework.exceptions import PermissionDenied

from kolibri.core.auth.constants.morango_sync import PROFILE_FACILITY_DATA
from kolibri.core.auth.constants.morango_sync import State as FacilitySyncState
from kolibri.core.auth.management.utils import get_client_and_server_certs
from kolibri.core.auth.management.utils import get_facility_dataset_id
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import URLParseError


class ResourceGoneError(APIException):
    """
    API error for when a peer no longer is online
    """

    status_code = status.HTTP_410_GONE
    default_detail = "Unable to connect"


def validate_facility(request):
    # ensure we have the facility
    try:
        facility_id = request.data.get("facility")
        if not facility_id:
            raise KeyError()
    except KeyError:
        raise ParseError("Missing `facility` parameter")

    return facility_id


def validate_sync_task(request):
    facility_id = validate_facility(request)
    user_id = request.user.pk
    username = request.user.username
    facility_name = request.data.get("facility_name", "")
    device_name = request.data.get("device_name", "")
    device_id = request.data.get("device_id", "")
    baseurl = request.data.get("baseurl", "")
    return (
        facility_id,
        user_id,
        username,
        facility_name,
        device_name,
        device_id,
        baseurl,
    )


def prepare_sync_job(**kwargs):
    job_data = dict(
        chunk_size=200,
        noninteractive=True,
    )

    job_data.update(kwargs)
    return job_data


def validate_peer_sync_job(request):
    # validate the baseurl
    try:
        address = request.data.get("baseurl")
        if not address:
            raise KeyError()

        baseurl = NetworkClient(address=address).base_url
    except KeyError:
        raise ParseError("Missing `baseurl` parameter")
    except URLParseError:
        raise ParseError("Invalid URL")
    except NetworkLocationNotFound:
        raise ResourceGoneError()

    facility_id = validate_facility(request)

    username = request.data.get("username", None)
    password = request.data.get("password", None)

    return (baseurl, facility_id, username, password)


def prepare_sync_task(
    facility_id,
    user_id,
    username,
    facility_name,
    device_name,
    device_id,
    baseurl,
    **kwargs
):
    task_data = dict(
        facility=facility_id,
        started_by=user_id,
        started_by_username=username,
        sync_state=FacilitySyncState.PENDING,
        bytes_sent=0,
        bytes_received=0,
    )

    task_type = kwargs.get("type")
    if task_type in ["SYNCPEER/PULL", "SYNCPEER/FULL"]:
        # Extra metadata that can be passed from the client
        extra_task_data = dict(
            facility_name=facility_name,
            device_name=device_name,
            device_id=device_id,
            baseurl=baseurl,
        )
        task_data.update(extra_task_data)
    elif task_type == "SYNCDATAPORTAL":
        # Extra metadata that can be passed from the client
        extra_task_data = dict(facility_name=facility_name)
        task_data.update(extra_task_data)

    task_data.update(kwargs)
    return task_data


def validate_and_create_sync_credentials(
    baseurl, facility_id, username, password, user_id=None
):
    """
    Validates user credentials for syncing by performing certificate verification, which will also
    save any certificates after successful authentication

    :param user_id: Optional user ID for SoUD use case
    """
    # call this in case user directly syncs without migrating database
    if not ScopeDefinition.objects.filter():
        call_command("loaddata", "scopedefinitions")

    controller = MorangoProfileController(PROFILE_FACILITY_DATA)
    network_connection = controller.create_network_connection(baseurl)

    # try to get the certificate, which will save it if successful
    try:
        # make sure we get the dataset ID
        facility_id, dataset_id = get_facility_dataset_id(
            baseurl, identifier=facility_id, noninteractive=True
        )

        # username and password are not required for this to succeed unless there is no cert
        get_client_and_server_certs(
            username,
            password,
            dataset_id,
            network_connection,
            user_id=user_id,
            facility_id=facility_id,
            noninteractive=True,
        )
    except (CommandError, HTTPError) as e:
        if not username and not password:
            raise PermissionDenied()
        else:
            raise AuthenticationFailed(e)


def prepare_peer_sync_job(baseurl, facility_id, **kwargs):
    """
    Initializes and validates connection to peer with username and password for the sync command. If
    already initialized, the username and password do not need to be supplied
    """
    return prepare_sync_job(facility=facility_id, baseurl=baseurl, **kwargs)
