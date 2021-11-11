import requests
from django.core.management import call_command
from django.core.management.base import CommandError
from django.urls import reverse
from morango.models import InstanceIDModel
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied
from rest_framework.exceptions import ValidationError
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants.user_kinds import ADMIN
from kolibri.core.auth.constants.user_kinds import ASSIGNABLE_COACH
from kolibri.core.auth.constants.user_kinds import COACH
from kolibri.core.auth.constants.user_kinds import SUPERUSER
from kolibri.core.device.permissions import IsSuperuser
from kolibri.core.device.permissions import LODUserHasSyncPermissions
from kolibri.core.device.permissions import NotProvisionedCanPost
from kolibri.core.error_constants import DEVICE_LIMITATIONS
from kolibri.core.tasks.api import prepare_soud_sync_job
from kolibri.core.tasks.api import prepare_sync_task
from kolibri.core.tasks.api import validate_and_create_sync_credentials
from kolibri.core.tasks.decorators import register_task


def getusersinfo(request):
    """
    Using basic auth returns info from
    the requested username.
    If the requested username has admin rights it will return also
    the list of users of the facility

    :param baseurl: First part of the url of the server that's going to be requested
    :param facility_id: Id of the facility to authenticate and get the list of users
    :param username: Username of the user that's going to authenticate
    :param password: Password of the user that's going to authenticate
    :return: Dict with two keys: 'user' containing info of the user that authenticated and
             'users' containing the list of users of the facility if the user had rights.
    """
    baseurl = request.data.get("baseurl", None)
    facility_id = request.data.get("facility_id", None)
    username = request.data.get("username", None)
    password = request.data.get("password", None)

    user_info_url = urljoin(baseurl, reverse("kolibri:core:publicuser-list"))
    params = {
        "facility_id": facility_id,
    }
    try:
        response = requests.get(
            user_info_url,
            data=params,
            auth=(
                "username={}&{}={}".format(
                    username, FACILITY_CREDENTIAL_KEY, facility_id
                ),
                password,
            ),
        )
        response.raise_for_status()
    except (CommandError, HTTPError, ConnectionError) as e:
        if not username and not password:
            raise PermissionDenied()
        else:
            raise AuthenticationFailed(e)
    auth_info = response.json()
    if len(auth_info) > 1:
        user_info = [u for u in response.json() if u["username"] == username][0]
    else:
        user_info = auth_info[0]
    facility_info = {"user": user_info, "users": auth_info}
    return facility_info


def validate_soud_credentials(request, task_description):
    baseurl = request.data.get("baseurl", None)
    facility_id = request.data.get("facility_id", None)
    username = request.data.get("username", None)
    password = request.data.get("password", None)
    user_id = request.data.get("user_id", None)
    device_name = request.data.get("device_name", None)

    facility_info = getusersinfo(request)
    user_info = facility_info["user"]
    full_name = user_info["full_name"]
    roles = user_info["roles"]

    # syncing as a normal user, not using an admin account:
    if user_id is None:
        not_syncable = (SUPERUSER, COACH, ASSIGNABLE_COACH, ADMIN)
        if any(role in roles for role in not_syncable):
            raise ValidationError(
                detail={
                    "id": DEVICE_LIMITATIONS,
                    "full_name": full_name,
                    "roles": ", ".join(roles),
                }
            )
        user_id = user_info["id"]

    instance_model = InstanceIDModel.get_or_create_current_instance()[0]

    validate_and_create_sync_credentials(
        baseurl, facility_id, username, password, user_id=user_id
    )
    extra_metadata = prepare_sync_task(
        facility_id,
        user_id,
        username,
        None,  # uneeded facility_name
        None,  # ignored by prepare_sync_task with SYNCPEER/SINGLE
        instance_model.id,
        baseurl,
        type="SYNCPEER/SINGLE",
    )
    if device_name is not None:  # Needed when first provisioning a device
        extra_metadata["device_name"] = device_name
    extra_metadata["full_name"] = full_name

    return {
        "user_id": user_id,
        "extra_metadata": extra_metadata,
        "baseurl": baseurl,
        "facility_id": facility_id,
    }


@register_task(
    validator=validate_soud_credentials,
    cancellable=True,
    track_progress=True,
    queue="kolibri",
    permission_classes=[
        IsSuperuser | NotProvisionedCanPost | LODUserHasSyncPermissions
    ],
)
def startprovisionsoud(
    baseurl=None,
    facility_id=None,
    user_id=None,
    extra_metadata=None,
):
    if extra_metadata is None:
        extra_metadata = {}
    job_data = prepare_soud_sync_job(
        baseurl, facility_id, user_id, extra_metadata=extra_metadata
    )
    call_command("sync", **job_data)
