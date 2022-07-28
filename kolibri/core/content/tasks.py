import requests
from django.core.management import call_command
from rest_framework import serializers
from six import with_metaclass

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
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.permissions import CanManageContent
from kolibri.core.tasks.validation import JobValidator
from kolibri.utils import conf


QUEUE = "content"


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

    def validate(self, data):
        job_data = super(ChannelResourcesValidator, self).validate(data)
        job_data["kwargs"].update(
            {
                "node_ids": data.get("node_ids"),
                "exclude_node_ids": data.get("exclude_node_ids"),
            }
        )
        return job_data


class ChannelResourcesImportValidator(ChannelResourcesValidator):
    update = serializers.BooleanField(default=False)
    new_version = serializers.IntegerField(required=False)

    def validate(self, data):
        job_data = super(ChannelResourcesImportValidator, self).validate(data)
        job_data["kwargs"].update(
            {
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


class LocalMixin(with_metaclass(serializers.SerializerMetaclass)):
    drive_id = DriveIdField()

    def validate(self, data):
        job_data = super(LocalMixin, self).validate(data)
        job_data["extra_metadata"].update(dict(drive_id=data["drive_id"]))
        job_data["args"] += [data["drive_id"]]
        return job_data


class LocalChannelImportResourcesValidator(LocalMixin, ChannelResourcesImportValidator):
    pass


@register_task(
    validator=LocalChannelImportResourcesValidator,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
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


class RemoteImportMixin(with_metaclass(serializers.SerializerMetaclass)):
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
    queue=QUEUE,
)
def remotechannelimport(channel_id, baseurl=None, peer_id=None):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
    )


class RemoteChannelResourcesImportValidator(
    RemoteImportMixin, ChannelResourcesImportValidator
):
    pass


@register_task(
    validator=RemoteChannelResourcesImportValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
)
def remotecontentimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
    update=False,
):
    call_command(
        "importcontent",
        "network",
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        import_updates=update,
    )


class ExportChannelResourcesValidator(LocalMixin, ChannelResourcesValidator):
    pass


@register_task(
    validator=ExportChannelResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
)
def diskexport(
    channel_id,
    drive_id,
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
    )
    call_command(
        "exportcontent",
        channel_id,
        drive.datafolder,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
    )


class DeleteChannelValidator(ChannelResourcesValidator):
    force_delete = serializers.BooleanField(default=False)


@register_task(
    validator=DeleteChannelValidator,
    track_progress=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
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
    validator=RemoteChannelResourcesImportValidator,
    cancellable=True,
    track_progress=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
)
def remoteimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
    update=False,
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
        import_updates=update,
    )


@register_task(
    validator=LocalChannelImportResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
)
def diskimport(
    channel_id, drive_id, update=False, node_ids=None, exclude_node_ids=None
):
    drive = get_mounted_drive_by_id(drive_id)
    directory = drive.datafolder

    call_command(
        "importchannel",
        "disk",
        channel_id,
        directory,
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


class LocalChannelImportValidator(LocalMixin, ChannelValidator):
    pass


@register_task(
    validator=LocalChannelImportValidator,
    cancellable=True,
    permission_classes=[CanManageContent],
    priority=Priority.HIGH,
    queue=QUEUE,
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
    queue=QUEUE,
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


class LocalChannelDiffStatsValidator(LocalChannelImportValidator, LocalMixin):
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
    queue=QUEUE,
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
