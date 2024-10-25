from django.core.exceptions import ValidationError
from django.core.management import call_command
from django.db.models import Q
from rest_framework import serializers

from kolibri.core.auth.models import FacilityDataset
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.models import ContentRequestType
from kolibri.core.content.utils.channel_import import import_channel_from_data
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.content_request import incomplete_removals_queryset
from kolibri.core.content.utils.content_request import process_content_removal_requests
from kolibri.core.content.utils.content_request import process_content_requests
from kolibri.core.content.utils.content_request import synchronize_content_requests
from kolibri.core.content.utils.paths import get_channel_lookup_url
from kolibri.core.content.utils.paths import get_content_database_file_path
from kolibri.core.content.utils.resource_import import DiskChannelResourceImportManager
from kolibri.core.content.utils.resource_import import DiskChannelUpdateManager
from kolibri.core.content.utils.resource_import import (
    RemoteChannelResourceImportManager,
)
from kolibri.core.content.utils.resource_import import RemoteChannelUpdateManager
from kolibri.core.content.utils.settings import automatic_download_enabled
from kolibri.core.content.utils.upgrade import diff_stats
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import IncompatibleVersionError
from kolibri.core.discovery.utils.network.errors import NetworkLocationNotFound
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.utils.network.errors import ResourceGoneError
from kolibri.core.serializers import HexOnlyUUIDField
from kolibri.core.tasks.decorators import register_task
from kolibri.core.tasks.job import default_status_text
from kolibri.core.tasks.job import JobStatus
from kolibri.core.tasks.job import Priority
from kolibri.core.tasks.job import State
from kolibri.core.tasks.permissions import CanManageContent
from kolibri.core.tasks.utils import get_current_job
from kolibri.core.tasks.validation import JobValidator
from kolibri.core.utils.urls import reverse_path
from kolibri.utils import conf
from kolibri.utils.translation import gettext as _
from kolibri.utils.version import version_matches_range

QUEUE = "content"


def get_status(job):
    # Translators: Message shown to an App user when the device's library is being updated
    # either with new resources, or unwanted resources being deleted.
    title = _("Updating your library")
    if job.state == State.COMPLETED:
        # Translators: Message shown to an App user when an update to the library has been successful.
        title = _("Library updated")
    elif job.state == State.FAILED or job.state == State.CANCELED:
        # Translators: Message shown to an App user when an update to the library has failed.
        title = _("Library update failed")
    text = default_status_text(job)
    return JobStatus(title, text)


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
    renderable_only = serializers.BooleanField(default=True)
    fail_on_error = serializers.BooleanField(default=False)
    new_version = serializers.IntegerField(required=False)
    all_thumbnails = serializers.BooleanField(default=False)

    def validate(self, data):
        job_data = super(ChannelResourcesImportValidator, self).validate(data)
        job_data["kwargs"].update(
            {
                "update": data.get("update"),
                "renderable_only": data.get("renderable_only"),
                "fail_on_error": data.get("fail_on_error"),
                "all_thumbnails": data.get("all_thumbnails"),
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


class LocalMixin(metaclass=serializers.SerializerMetaclass):
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
    status_fn=get_status,
)
def diskcontentimport(
    channel_id,
    drive_id,
    update=False,
    node_ids=None,
    exclude_node_ids=None,
    renderable_only=True,
    fail_on_error=False,
    all_thumbnails=False,
):
    manager_class = (
        DiskChannelUpdateManager if update else DiskChannelResourceImportManager
    )
    drive = get_mounted_drive_by_id(drive_id)
    manager = manager_class(
        channel_id,
        path=drive.datafolder,
        drive_id=drive_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        renderable_only=renderable_only,
        fail_on_error=fail_on_error,
        all_thumbnails=all_thumbnails,
    )
    manager.run()


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
            baseurl = NetworkClient.build_for_address(peer["base_url"]).base_url
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
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    priority=Priority.HIGH,
    queue=QUEUE,
    status_fn=get_status,
)
def remotechannelimport(channel_id, baseurl=None, peer_id=None):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
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
    status_fn=get_status,
)
def remotecontentimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
    update=False,
    renderable_only=True,
    fail_on_error=False,
    all_thumbnails=False,
):
    manager_class = (
        RemoteChannelUpdateManager if update else RemoteChannelResourceImportManager
    )
    manager = manager_class(
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        renderable_only=renderable_only,
        fail_on_error=fail_on_error,
        all_thumbnails=all_thumbnails,
    )
    manager.run()


class ResourceNodeValidator(JobValidator):
    node_id = HexOnlyUUIDField()
    node_name = serializers.CharField()

    def validate(self, data):
        job_data = super(ResourceNodeValidator, self).validate(data)
        job_data.update(
            {
                "kwargs": {},
                "args": [data["node_id"]],
                "extra_metadata": dict(
                    resource_name=data["node_name"], node_id=data["node_id"]
                ),
            }
        )
        return job_data


MIN_RESOURCE_IMPORT_VERSION = ">0.15"


class RemoteResourceImportValidator(ResourceNodeValidator):
    peer = serializers.PrimaryKeyRelatedField(
        required=False, queryset=NetworkLocation.objects.all().values("base_url", "id")
    )

    def validate(self, data):
        job_data = super(RemoteResourceImportValidator, self).validate(data)
        peer = data.get(
            "peer",
            {
                "base_url": conf.OPTIONS["Urls"]["CENTRAL_CONTENT_BASE_URL"],
                "id": None,
            },
        )
        try:
            client = NetworkClient.build_for_address(peer["base_url"])
            if client.device_info[
                "application"
            ] == "kolibri" and not version_matches_range(
                client.device_info["kolibri_version"], MIN_RESOURCE_IMPORT_VERSION
            ):
                raise IncompatibleVersionError(
                    "Remote Kolibri instance must be 0.16.0 or higher"
                )
            peer["base_url"] = client.base_url
        except NetworkLocationNotFound:
            raise ResourceGoneError()
        job_data["extra_metadata"].update(dict(peer_id=peer["id"]))
        job_data["kwargs"]["baseurl"] = peer["base_url"]
        job_data["kwargs"]["peer_id"] = peer["id"]
        return job_data


@register_task(
    validator=RemoteResourceImportValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=False,
    status_fn=get_status,
)
def remoteresourceimport(
    node_id,
    baseurl=None,
    peer_id=None,
):
    current_job = get_current_job()
    client = NetworkClient.build_for_address(baseurl)
    metadata_url = reverse_path(
        "kolibri:core:importmetadata-detail", kwargs={"pk": node_id}
    )
    response = client.get(metadata_url)
    import_metadata = response.json()
    cancel_check = None if not current_job else current_job.check_for_cancel
    import_channel_from_data(import_metadata, cancel_check, partial=True)
    channel_id = import_metadata[ChannelMetadata._meta.db_table][0]["id"]
    import_manager = RemoteChannelResourceImportManager(
        channel_id, peer_id=peer_id, baseurl=baseurl, node_ids=[node_id]
    )
    import_manager.run()


def enqueue_automatic_resource_import_if_needed(instance_id=None):
    """
    Enqueues automatic_resource_import if there are any pending content requests, and optionally
    filters by instance_id for Downloads
    :param instance_id: UUID of the instance to filter by for preferred instance downloads
    :type instance_id: str
    """
    reqs = ContentRequest.objects.exclude(
        status__in=[
            ContentRequestStatus.Completed,
            ContentRequestStatus.InProgress,
        ]
    )
    if instance_id:
        reqs = reqs.filter(
            Q(type=ContentRequestType.Download, source_instance_id=instance_id)
            | Q(type=ContentRequestType.Removal)
        )

    if reqs.exists():
        automatic_resource_import.enqueue_if_not()


class AutomaticDownloadValidator(JobValidator):
    def validate(self, data):
        job_data = super(AutomaticDownloadValidator, self).validate(data)
        if not automatic_download_enabled():
            raise ValidationError("Automatic download is not enabled")
        return job_data


@register_task(
    validator=AutomaticDownloadValidator,
    queue=QUEUE,
    long_running=True,
    status_fn=get_status,
)
def automatic_resource_import():
    """
    Processes content download and removal requests
    """
    if automatic_download_enabled():
        process_content_requests()


@register_task(
    queue=QUEUE,
    long_running=True,
    status_fn=get_status,
)
def automatic_user_imported_resource_cleanup():
    """
    Processes content removal requests
    """
    incomplete_user_removals = incomplete_removals_queryset().filter(
        reason=ContentRequestReason.UserInitiated
    )
    process_content_removal_requests(incomplete_user_removals)


@register_task(
    long_running=True,
    status_fn=get_status,
)
def automatic_synchronize_content_requests_and_import():
    """
    Task that synchronizes content requests for all facilities/datasets on the device and enqueues the automatic_resource_import task afterwards.
    - Calls synchronize_content_requests for all facilities/datasets on the device.
    - Enqueues the automatic_resource_import task after synchronizing content requests.
    """
    # A safety check to see if the device settings are changed already?
    if not automatic_download_enabled():
        return

    dataset_ids = FacilityDataset.objects.values_list("id", flat=True)

    # Synchronize content requests for each dataset
    for dataset_id in dataset_ids:
        # in case it takes a long time to synchronize content requests for a dataset, we want to
        # check if the device settings are changed
        if not automatic_download_enabled():
            return
        synchronize_content_requests(dataset_id, None)

    enqueue_automatic_resource_import_if_needed()


class ExportChannelResourcesValidator(LocalMixin, ChannelResourcesValidator):
    pass


@register_task(
    validator=ExportChannelResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
    status_fn=get_status,
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

    def validate(self, data):
        job_data = super(DeleteChannelValidator, self).validate(data)
        job_data["kwargs"].update(
            {
                "force_delete": data.get("force_delete"),
            }
        )
        return job_data


@register_task(
    validator=DeleteChannelValidator,
    track_progress=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
    status_fn=get_status,
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
    status_fn=get_status,
)
def remoteimport(
    channel_id,
    baseurl=None,
    peer_id=None,
    node_ids=None,
    exclude_node_ids=None,
    update=False,
    renderable_only=True,
    fail_on_error=False,
    all_thumbnails=False,
):
    call_command(
        "importchannel",
        "network",
        channel_id,
        baseurl=baseurl,
    )

    if update:
        current_job = get_current_job()
        current_job.update_metadata(database_ready=True)

    manager_class = (
        RemoteChannelUpdateManager if update else RemoteChannelResourceImportManager
    )
    manager = manager_class(
        channel_id,
        baseurl=baseurl,
        peer_id=peer_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        renderable_only=renderable_only,
        fail_on_error=fail_on_error,
        all_thumbnails=all_thumbnails,
    )
    manager.run()


@register_task(
    validator=LocalChannelImportResourcesValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    queue=QUEUE,
    long_running=True,
    status_fn=get_status,
)
def diskimport(
    channel_id,
    drive_id,
    update=False,
    node_ids=None,
    exclude_node_ids=None,
    renderable_only=True,
    fail_on_error=False,
    all_thumbnails=False,
):
    drive = get_mounted_drive_by_id(drive_id)
    directory = drive.datafolder

    call_command(
        "importchannel",
        "disk",
        channel_id,
        directory,
    )

    if update:
        current_job = get_current_job()
        current_job.update_metadata(database_ready=True)

    manager_class = (
        DiskChannelUpdateManager if update else DiskChannelResourceImportManager
    )
    drive = get_mounted_drive_by_id(drive_id)
    manager = manager_class(
        channel_id,
        path=drive.datafolder,
        drive_id=drive_id,
        node_ids=node_ids,
        renderable_only=renderable_only,
        exclude_node_ids=exclude_node_ids,
        fail_on_error=fail_on_error,
        all_thumbnails=all_thumbnails,
    )
    manager.run()


class LocalChannelImportValidator(LocalMixin, ChannelValidator):
    pass


@register_task(
    validator=LocalChannelImportValidator,
    track_progress=True,
    cancellable=True,
    permission_classes=[CanManageContent],
    priority=Priority.HIGH,
    queue=QUEUE,
    status_fn=get_status,
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
    )


class RemoteChannelDiffStatsValidator(RemoteChannelImportValidator):
    def validate(self, data):
        job_data = super(RemoteChannelDiffStatsValidator, self).validate(data)
        # get channel version metadata
        if job_data["kwargs"]["peer_id"]:
            client = NetworkClient.build_for_address(job_data["kwargs"]["baseurl"])
        else:
            client = NetworkClient("/")
        url = get_channel_lookup_url(
            baseurl=job_data["kwargs"]["baseurl"], identifier=data["channel_id"]
        )
        try:
            resp = client.get(url)
        except NetworkLocationResponseFailure as e:
            resp = e.response
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
