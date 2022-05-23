from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.auth.models import FacilityUser
from kolibri.core.auth.tasks import PeerImportSingleSyncJobValidator
from kolibri.core.auth.utils.migrate import merge_users
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import IsFacilityAdmin
from kolibri.core.tasks.permissions import IsSelf
from kolibri.core.tasks.permissions import IsSuperAdmin
from kolibri.core.tasks.permissions import PermissionsFromAny


class MergeUserValidator(PeerImportSingleSyncJobValidator):
    local_user_id = HexOnlyUUIDField()

    def validate(self, data):
        job_data = super(MergeUserValidator, self).validate(data)
        local_user_id = data["local_user_id"]
        if not FacilityUser.objects.filter(id=local_user_id).exists():
            raise serializers.ValidationError(
                "An user with the given id does not exist in this facility"
            )
        job_data["kwargs"]["local_user_id"] = local_user_id
        return job_data


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
    local_user_id = kwargs.pop("local_user_id")
    local_user = FacilityUser.objects.get(id=local_user_id)
    call_command(command, **kwargs)

    remote_user = FacilityUser.objects.get(id=kwargs["user"])
    merge_users(local_user, remote_user)

    # Resync with the server to update the merged records
    call_command("sync", **kwargs)

    local_user.delete()
