from django.core.management.base import CommandError
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import NotFound

from kolibri.core import error_constants
from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Membership
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.utils.urls import reverse_path


def create_adhoc_group_for_learners(classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name="Ad hoc", parent=classroom)
    for learner in learners:
        Membership.objects.create(user=learner, collection=adhoc_group)
    return adhoc_group


class _RemoteFacilityUserSerializer(serializers.Serializer):
    id = serializers.UUIDField(format="hex")
    username = serializers.CharField()
    full_name = serializers.CharField(allow_blank=True)
    facility = serializers.UUIDField(format="hex")
    is_superuser = serializers.BooleanField()
    id_number = serializers.CharField(allow_blank=True)
    gender = serializers.CharField(allow_blank=True)
    birth_year = serializers.CharField(allow_blank=True)
    roles = serializers.ListField(child=serializers.CharField())


def get_remote_users_info(baseurl, facility_id, username, password, client=None):
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
    if not client:
        client = NetworkClient.build_for_address(baseurl)
    user_info_url = reverse_path("kolibri:core:publicuser-list")
    params = {"facility_id": facility_id}
    try:
        response = client.get(
            user_info_url,
            params=params,
            auth=(
                "username={}&{}={}".format(
                    username, FACILITY_CREDENTIAL_KEY, facility_id
                ),
                password,
            ),
        )
    except NetworkLocationConnectionFailure:
        raise ResourceGoneError()
    except (
        CommandError,
        NetworkLocationResponseFailure,
    ):
        if password == NOT_SPECIFIED or not password:
            facility_info_url = reverse_path(
                "kolibri:core:publicfacility-detail",
                args=[
                    facility_id,
                ],
            )
            try:
                response = client.get(facility_info_url)
            except NetworkLocationResponseFailure as e:
                response = e.response
            if response.json()["learner_can_login_with_no_password"]:
                raise AuthenticationFailed(
                    detail="The username can not be found",
                    code=error_constants.INVALID_USERNAME,
                )
            else:
                raise AuthenticationFailed(
                    detail="Password is required", code=error_constants.MISSING_PASSWORD
                )
        else:
            raise AuthenticationFailed(
                detail="Authentication failed",
                code=error_constants.AUTHENTICATION_FAILED,
            )
    serializer = _RemoteFacilityUserSerializer(data=response.json(), many=True)
    auth_info = serializer.data if serializer.is_valid() else []
    if len(auth_info) > 1:
        user_info = [u for u in auth_info if u["username"] == username][0]
    else:
        user_info = auth_info[0]
    return {"user": user_info, "users": auth_info}


def get_remote_user_info(client, facility_id, adminUsername, adminPassword, user_id):
    """
    Using basic auth returns info from
    the requested user_id.
    The adminUsername must have admin rights to get the user info.

    :param client: NetworkClient instance to make the request
    :param facility_id: Id of the facility to authenticate and get the user info
    :param adminUsername: Username of the admin user that's going to authenticate
    :param adminPassword: Password of the admin user that's going to authenticate
    :param user_id: Id of the user whose info is being requested
    :return: Dict with the info of the requested user_id
    """
    user_info_url = reverse_path("kolibri:core:publicuser-detail", args=[user_id])
    params = {"facility_id": facility_id}
    try:
        response = client.get(
            user_info_url,
            params=params,
            auth=(
                "username={}&{}={}".format(
                    adminUsername, FACILITY_CREDENTIAL_KEY, facility_id
                ),
                adminPassword,
            ),
        )
        if response.status_code == 200:
            return response.json()
        elif response.status_code == 404:
            raise NotFound()
        elif response.status_code in (401, 403):
            raise AuthenticationFailed(
                detail="Authentication failed",
                code=error_constants.AUTHENTICATION_FAILED,
            )
        else:
            raise ResourceGoneError()
    except NetworkLocationConnectionFailure:
        raise ResourceGoneError()
    except NetworkLocationResponseFailure as e:
        if e.response is not None and e.response.status_code in (401, 403):
            raise AuthenticationFailed(
                detail="Authentication failed",
                code=error_constants.AUTHENTICATION_FAILED,
            )
        raise ResourceGoneError()
    except CommandError:
        raise ResourceGoneError()
