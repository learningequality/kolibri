import requests
from django.core.management.base import CommandError
from django.urls import reverse
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.exceptions import PermissionDenied
from six.moves.urllib.parse import urljoin

from kolibri.core.auth.backends import FACILITY_CREDENTIAL_KEY
from kolibri.core.auth.models import AdHocGroup
from kolibri.core.auth.models import Membership


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
