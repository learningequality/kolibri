import requests
from django.core.management import call_command
from morango.errors import MorangoError
from rest_framework import serializers
from rest_framework.exceptions import ValidationError
from rest_framework.status import HTTP_201_CREATED

from .utils import TokenGenerator
from kolibri.core import error_constants
from kolibri.core.auth.constants import role_kinds
from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import PeerImportSingleSyncJobValidator
from kolibri.core.auth.utils.delete import delete_facility
from kolibri.core.auth.utils.migrate import merge_users
from kolibri.core.device.models import DevicePermissions
from kolibri.core.device.utils import set_device_settings
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import JobStatus
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import IsFacilityAdmin
from kolibri.core.tasks.permissions import IsSelf
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import PermissionsFromAny
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.utils.urls import reverse_remote
from kolibri.utils.translation import gettext as _


class MergeUserValidator(PeerImportSingleSyncJobValidator):
    local_user_id = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all()
    )
    new_superuser_id = serializers.PrimaryKeyRelatedField(
        queryset=FacilityUser.objects.all(), required=False
    )
    facility_name = serializers.CharField(default="")
    set_as_super_user = serializers.BooleanField(required=False)

    def validate(self, data):
        try:
            job_data = super(MergeUserValidator, self).validate(data)
        except ValidationError as e:
            details = e.detail if isinstance(e.detail, list) else [e.detail]
            for detail in details:
                # If any of the errors are authentication related, then we need to create the user
                if detail.code == error_constants.AUTHENTICATION_FAILED:
                    self.create_remote_user(data)
                    job_data = super(MergeUserValidator, self).validate(data)
                    break
            else:
                # If we didn't break out of the loop, then we need to raise the original error
                raise

        job_data["args"].append(data["local_user_id"].id)
        job_data["extra_metadata"].update(user_fullname=data["local_user_id"].full_name)
        if data.get("new_superuser_id"):
            job_data["kwargs"]["new_superuser_id"] = data["new_superuser_id"].id
        if data.get("set_as_super_user"):
            job_data["kwargs"]["set_as_super_user"] = data["set_as_super_user"]

        return job_data

    def create_remote_user(self, data):
        baseurl = data["baseurl"]
        facility = data["facility"]
        user_data = {
            "username": data["username"],
            "password": data["password"],
            "facility": facility,
        }
        for f in ["gender", "birth_year", "id_number", "full_name"]:
            if getattr(data["local_user_id"], f, "NOT_SPECIFIED") != "NOT_SPECIFIED":
                user_data[f] = getattr(data["local_user_id"], f, None)
        public_signup_url = reverse_remote(baseurl, "kolibri:core:publicsignup-list")
        response = requests.post(public_signup_url, data=user_data)
        if response.status_code != HTTP_201_CREATED:
            raise serializers.ValidationError(response.json()[0]["id"])


def status_fn(job):
    # Translators: A notification title shown to users when their learner account is joining a new learning facility.
    account_transfer_in_progress = _("Account transfer in progress")
    # Translators: Notification text shown to users when their learner account is joining a new learning facility.
    notification_text = _(
        "Moving {learner_name} to learning facility {facility_name}"
    ).format(
        learner_name=job.extra_metadata["user_fullname"],
        facility_name=job.extra_metadata["facility_name"],
    )
    return JobStatus(account_transfer_in_progress, notification_text)


def start_soud_sync(user_id):
    from kolibri.core.device import soud
    from kolibri.core.auth.tasks import enqueue_soud_sync_processing

    # This user would not previously have been included in any syncs
    # triggered by a device appearing on the network, so request syncs for them now
    instance_ids = NetworkLocation.objects.filter(
        subset_of_users_device=False,
        connection_status=ConnectionStatus.Okay,
        application="kolibri",
    ).values_list("instance_id", flat=True)
    for instance_id in instance_ids:
        soud.request_sync(soud.Context(user_id, instance_id))
    if instance_ids:
        enqueue_soud_sync_processing()


@register_task(
    queue="soud",
    validator=MergeUserValidator,
    priority=Priority.HIGH,
    cancellable=False,
    track_progress=True,
    permission_classes=[
        PermissionsFromAny(IsSelf(), IsSuperAdmin(), IsFacilityAdmin())
    ],
    status_fn=status_fn,
)
def mergeuser(
    command, local_user_id, new_superuser_id=None, set_as_super_user=False, **kwargs
):
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

    local_user = FacilityUser.objects.get(id=local_user_id)
    job = get_current_job()

    # Sync with the server to get the remote user:
    kwargs["no_push"] = True
    try:
        call_command(command, **kwargs)
    except MorangoError:
        # error syncing with the server, probably a networking issue
        raise

    remote_user = FacilityUser.objects.get(id=kwargs["user"])
    merge_users(local_user, remote_user)
    set_device_settings(subset_of_users_device=True)

    # Resync with the server to update the merged records
    del kwargs["no_push"]

    try:
        call_command(command, **kwargs)
    except MorangoError:
        # error syncing with the server, probably a networking issue
        # the rest of the merge cannot be completed here, so we raise
        # so that the job has to be retried by the user.
        raise

    if new_superuser_id and local_user.is_superuser:
        new_superuser = FacilityUser.objects.get(id=new_superuser_id)
        # make the user a new super user for this device:
        new_superuser.facility.add_role(new_superuser, role_kinds.ADMIN)
        DevicePermissions.objects.create(
            user=new_superuser, is_superuser=True, can_manage_content=True
        )

    # create token to validate user in the new facility
    # after it's deleted in the current facility:
    remote_user_pk = kwargs["user"]
    remote_user = FacilityUser.objects.get(pk=remote_user_pk)
    token = TokenGenerator().make_token(remote_user)
    job.extra_metadata["token"] = token
    job.extra_metadata["remote_user_pk"] = remote_user_pk
    job.save_meta()
    job.update_progress(1.0, 1.0)

    try:
        # If the local user is associated with an OSUser
        # then transfer to the new remote user to maintain
        # the association
        os_user = local_user.os_user
        os_user.user = remote_user
        os_user.save()
    except FacilityUser.os_user.RelatedObjectDoesNotExist:
        pass

    # check if current user should be set as superuser:
    set_as_super_user = kwargs.get("set_as_super_user")
    if set_as_super_user and local_user.is_superuser:
        DevicePermissions.objects.create(
            user=remote_user, is_superuser=True, can_manage_content=True
        )
        delete_facility(local_user.facility)
        set_device_settings(default_facility=remote_user.facility)
    else:
        local_user.delete()

    # queue up this new user for syncing with any other devices
    start_soud_sync(remote_user.id)
