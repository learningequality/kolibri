from urllib.parse import urljoin

import requests
from django.core.management import call_command
from django.urls import reverse
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.status import HTTP_201_CREATED

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import PeerImportSingleSyncJobValidator
from kolibri.core.auth.utils.migrate import merge_users
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import IsFacilityAdmin
from kolibri.core.tasks.permissions import IsSelf
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import PermissionsFromAny


class MergeUserValidator(PeerImportSingleSyncJobValidator):
    local_user_id = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all()
    )

    def validate(self, data):
        try:
            job_data = super(MergeUserValidator, self).validate(data)
        except AuthenticationFailed:
            self.create_remote_user(data)
            job_data = super(MergeUserValidator, self).validate(data)

        job_data["kwargs"]["local_user_id"] = data["local_user_id"].id
        return job_data

    def create_remote_user(self, data):
        baseurl = data["baseurl"]
        facility = data["facility"]
        user_data = {
            "username": data["username"],
            "password": data["password"],
            "facility": facility,
        }
        public_signup_url = urljoin(
            baseurl, reverse("kolibri:core:publicsignup-list").lstrip("/")
        )
        response = requests.post(public_signup_url, data=user_data)
        if response.status_code != HTTP_201_CREATED:
            raise serializers.ValidationError(response.json()[0]["id"])


@register_task(
    queue="soud",
    validator=MergeUserValidator,
    priority=Priority.HIGH,
    cancellable=False,
    track_progress=True,
    permission_classes=[
        PermissionsFromAny(IsSelf(), IsSuperAdmin(), IsFacilityAdmin())
    ],
)
def mergeuser(command, **kwargs):
    """
    This is an example of the POST payload to create this task:
    {
        "type": "kolibri.plugins.user_profile.tasks.mergeuser",
        "baseurl": "http://192.168.0.201:80/",
        "facility": "41d0e8bb1600347f17ab3d9172fff87a",
        "username": "uno",
        "local_user_id": "05685392311d1d259fe01c65c7a6c28e"
    }
    being baseurl, facility and username all parameters of the remote server.
    If the remote server requires password to authenticate user,
    a "password" parameter must be added, otherwise it's not needed.

    If the username/password does not exist in the remote server,
    this task will try to create the user.
    """

    local_user_id = kwargs.pop("local_user_id")
    local_user = FacilityUser.objects.get(id=local_user_id)
    call_command(command, **kwargs)

    remote_user = FacilityUser.objects.get(id=kwargs["user"])
    merge_users(local_user, remote_user)

    # Resync with the server to update the merged records
    call_command("sync", **kwargs)

    local_user.delete()
