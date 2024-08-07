from django.core.management.base import CommandError
from rest_framework.exceptions import AuthenticationFailed

from kolibri.core import error_constants
from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.constants.demographics import NOT_SPECIFIED
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Membership
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationConnectionFailure
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.urls import reverse_path


def create_adhoc_group_for_learners(classroom, learners):
    adhoc_group = AdHocGroup.objects.create(name="Ad hoc", parent=classroom)
    for learner in learners:
        Membership.objects.create(user=learner, collection=adhoc_group)
    return adhoc_group


def get_remote_users_info(baseurl, facility_id, username, password):
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
    except (
        CommandError,
        NetworkLocationResponseFailure,
        NetworkLocationConnectionFailure,
    ) as e:
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
                detail=str(e), code=error_constants.AUTHENTICATION_FAILED
            )
    auth_info = response.json()
    if len(auth_info) > 1:
        user_info = [u for u in response.json() if u["username"] == username][0]
    else:
        user_info = auth_info[0]
    facility_info = {"user": user_info, "users": auth_info}
    return facility_info
