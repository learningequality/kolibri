import requests
from django.core.management import call_command
from rest_framework import serializers
from rest_framework.exceptions import AuthenticationFailed
from rest_framework.status import HTTP_201_CREATED

from .utils import TokenGenerator
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import PeerImportSingleSyncJobValidator
from kolibri.core.auth.utils.migrate import merge_users
from kolibri.core.device.models import DevicePermissions
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import IsFacilityAdmin
from kolibri.core.tasks.permissions import IsSelf
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import PermissionsFromAny
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.urls import reverse_remote


class MergeUserValidator(PeerImportSingleSyncJobValidator):
    local_user_id = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all()
    )
    new_superuser_id = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all(), required=False
    )

    def validate(self, data):
        try:
            job_data = super(MergeUserValidator, self).validate(data)
        except AuthenticationFailed:
            self.create_remote_user(data)
            job_data = super(MergeUserValidator, self).validate(data)

        job_data["kwargs"]["local_user_id"] = data["local_user_id"].id
        if data.get("new_superuser_id"):
            job_data["kwargs"]["new_superuser_id"] = data["new_superuser_id"].id

        return job_data

    def create_remote_user(self, data):
        baseurl = data["baseurl"]
        facility = data["facility"]
        user_data = {
            "username": data["username"],
            "password": data["password"],
            "facility": facility,
        }
        public_signup_url = reverse_remote(baseurl, "kolibri:core:publicsignup-list")
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
    new_superuser_id = kwargs.get("new_superuser_id")
    if new_superuser_id:
        new_superuser = FacilityUser.objects.get(id=new_superuser_id)
        # make the user a new super user for this device:
        new_superuser.facility.add_role(new_superuser, role_kinds.ADMIN)
        DevicePermissions.objects.create(
            user=new_superuser, is_superuser=True, can_manage_content=True
        )

    job = get_current_job()
    # create token to validate user in the new facility
    # after it's deleted in the current facility:
    remote_user_pk = job.kwargs["user"]
    remote_user = FacilityUser.objects.get(pk=remote_user_pk)
    token = TokenGenerator().make_token(remote_user)
    job.extra_metadata["token"] = token
    job.save_meta()
    job.update_progress(1.0, 1.0)
    local_user.delete()
