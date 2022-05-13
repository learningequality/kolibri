import os

import requests
from django.core.management import call_command
from rest_framework import serializers

from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.upgrade import diff_stats
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.exceptions import UserCancelledError
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import CanManageContent
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils import conf


class ChannelValidator(JobValidator):
    channel_id = HexOnlyUUIDField()
    channel_name = serializers.CharField()

    def validate(self, data):
        job_data = super(ChannelValidator, self).validate(data)
        job_data.update(
            {
                "kwargs": {},
                "args": [data["channel_id"]],
                "extra_metadata": dict(
                    channel_name=data["channel_name"], channel_id=data["channel_id"]
                ),
            }
        )
        return job_data


class ChannelResourcesValidator(ChannelValidator):
    node_ids = serializers.ListField(child=HexOnlyUUIDField(), required=False)
    exclude_node_ids = serializers.ListField(child=HexOnlyUUIDField(), required=False)
    update = serializers.BooleanField(default=False)
    new_version = serializers.IntegerField(required=False)

    def validate(self, data):
        job_data = super(ChannelResourcesValidator, self).validate(data)
        job_data["kwargs"].update(
            {
                "node_ids": data.get("node_ids"),
                "exclude_node_ids": data.get("exclude_node_ids"),
                "update": data.get("update"),
            }
        )
        if data.get("new_version"):
            job_data["extra_metadata"]["new_version"] = data.get("new_version")
        return job_data


class DriveIdField(serializers.CharField):
    def to_internal_value(self, drive_id):
        try:
            get_mounted_drive_by_id(drive_id)
        except KeyError:
            raise serializers.ValidationError(
                "That drive_id was not found in the list of drives."
            )
        return drive_id


class LocalImportMixin(metaclass=serializers.SerializerMetaclass):
    drive_id = DriveIdField()

    def validate(self, data):
        job_data = super(LocalImportMixin, self).validate(data)
        job_data["extra_metadata"].update(dict(drive_id=data["drive_id"]))
        job_data["args"] += [data["drive_id"]]
        return job_data


class LocalChannelResourcesValidator(LocalImportMixin, ChannelResourcesValidator):
    pass


@register_task(
    validator=LocalChannelResourcesValidator,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def diskcontentimport(
    channel_id, drive_id, update=False, node_ids=None, exclude_node_ids=None
):
    drive = get_mounted_drive_by_id(drive_id)
    call_command(
        "importcontent",
        "disk",
        channel_id,
        drive.datafolder,
        drive_id=drive_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        import_updates=update,
    )


class RemoteImportMixin(metaclass=serializers.SerializerMetaclass):
    peer = serializers.PrimaryKeyRelatedField(
        required=False, queryset=NetworkLocation.objects.all().values("base_url", "id")
    )

    def validate(self, data):
        job_data = super(RemoteImportMixin, self).validate(data)
        peer = data.get(
            "peer",
            {
                "base_url": conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"],
                "id": None,
            },
        )
        try:
            baseurl = NetworkClient(address=peer["base_url"]).base_url
            peer["base_url"] = baseurl
        except NetworkLocationNotFound:
            raise ResourceGoneError()
        job_data["extra_metadata"].update(dict(peer_id=peer["id"]))
        job_data["kwargs"]["baseurl"] = peer["base_url"]
        job_data["kwargs"]["peer_id"] = peer["id"]
        return job_data


class RemoteChannelImportValidator(RemoteImportMixin, ChannelValidator):
    pass


@register_task(
    validator=RemoteChannelImportValidator,
    cancellable=True,
    permission_classes=[CanManageContent],
    priority=Priority.HIGH,
)
def remotechannelimport(channel_id, baseurl=None, peer_id=None):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
    )


class RemoteChannelResourcesValidator(RemoteImportMixin, ChannelResourcesValidator):
    pass


@register_task(
    validator=RemoteChannelResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def remotecontentimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
):
    call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
    )


@register_task(
    validator=LocalChannelResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def diskexport(
    channel_id=None,
    update_progress=None,
    check_for_cancel=None,
    drive_id=None,
    node_ids=None,
    exclude_node_ids=None,
):
    """
    Export a channel to a local drive, and copy content to the drive.
    """
    from kolibri.core.content.utils.channels import get_mounted_drive_by_id

    drive = get_mounted_drive_by_id(drive_id)

    call_command(
        "exportchannel",
        channel_id,
        drive.datafolder,
        update_progress=update_progress,
        check_for_cancel=check_for_cancel,
    )
    try:
        call_command(
            "exportcontent",
            channel_id,
            drive.datafolder,
            node_ids=node_ids,
            exclude_node_ids=exclude_node_ids,
            update_progress=update_progress,
            check_for_cancel=check_for_cancel,
        )
    except UserCancelledError:
        try:
            os.remove(
                get_content_database_file_path(channel_id, datafolder=drive.datafolder)
            )
        except OSError:
            pass
        raise


class DeleteChannelValidator(ChannelResourcesValidator):
    force_delete = serializers.BooleanField(default=False)


@register_task(
    validator=DeleteChannelValidator,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def deletechannel(
    channel_id=None,
    node_ids=None,
    exclude_node_ids=None,
    force_delete=False,
):
    """
    Delete a channel and all its associated content from the server.
    """
    call_command(
        "deletecontent",
        channel_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        force_delete=force_delete,
    )


@register_task(
    validator=RemoteChannelResourcesValidator,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
)
def remoteimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        update_progress=None,
    )

    call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
    )


@register_task(
    validator=LocalChannelResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def diskimport(
    channel_id=None,
    directory=None,
    drive_id=None,
    node_ids=None,
    exclude_node_ids=None,
    update=False,
):

    call_command(
        "importchannel",
        "disk",
        channel_id,
        directory,
        update_progress=None,
    )

    call_command(
        "importcontent",
        "disk",
        channel_id,
        directory,
        drive_id=drive_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        import_updates=update,
    )


class LocalChannelImportValidator(LocalImportMixin, ChannelValidator):
    pass


@register_task(
    validator=LocalChannelImportValidator,
    cancellable=True,
    permission_classes=[CanManageContent],
    priority=Priority.HIGH,
)
def diskchannelimport(
    channel_id,
    drive_id,
):
    drive = get_mounted_drive_by_id(drive_id)
    call_command(
        "importchannel",
        "disk",
        channel_id,
        drive.datafolder,
        drive_id=drive_id,
    )


class RemoteChannelDiffStatsValidator(RemoteChannelImportValidator):
    def validate(self, data):
        job_data = super(RemoteChannelDiffStatsValidator, self).validate(data)
        # get channel version metadata
        url = get_channel_lookup_url(
            baseurl=job_data["kwargs"]["baseurl"], identifier=data["channel_id"]
        )
        resp = requests.get(url)
        channel_metadata = resp.json()
        job_data["extra_metadata"]["new_channel_version"] = channel_metadata[0][
            "version"
        ]
        return job_data


@register_task(
    validator=RemoteChannelDiffStatsValidator,
    track_progress=False,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def remotechanneldiffstats(
    channel_id,
    baseurl=None,
    peer_id=None,
):
    return diff_stats(
        channel_id,
        "network",
        baseurl=baseurl,
    )


class LocalChannelDiffStatsValidator(LocalChannelImportValidator, LocalImportMixin):
    def validate(self, data):
        job_data = super(LocalChannelDiffStatsValidator, self).validate(data)
        # get channel version metadata
        drive = get_mounted_drive_by_id(data["drive_id"])
        channel_metadata = read_channel_metadata_from_db_file(
            get_content_database_file_path(data["channel_id"], drive.datafolder)
        )
        job_data["extra_metadata"]["new_channel_version"] = channel_metadata["version"]
        return job_data


@register_task(
    validator=LocalChannelDiffStatsValidator,
    track_progress=False,
    cancellable=True,
    permission_classes=[CanManageContent],
)
def localchanneldiffstats(
    channel_id,
    drive_id,
):
    return diff_stats(
        channel_id,
        "disk",
        drive_id=drive_id,
    )
