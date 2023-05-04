import logging

from django.core.management import call_command
from django.db.models import BigIntegerField
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import QuerySet
from django.db.models import Subquery
from django.db.models import Sum
from morango.models.core import SyncSession

from kolibri.core.auth.models import Facility
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.models import File
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.content.utils.assignment import DeletedAssignment
from kolibri.core.content.utils.channel_import import import_channel_from_data
from kolibri.core.content.utils.resource_import import (
    RemoteChannelResourceImportManager,
)
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.connections import capture_connection_state
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.urls import reverse_path
from kolibri.utils.conf import OPTIONS
from kolibri.utils.data import bytes_for_humans
from kolibri.utils.data import bytes_from_humans
from kolibri.utils.system import get_free_space


logger = logging.getLogger(__name__)


# request statuses that signify incomplete requests
INCOMPLETE_STATUSES = [
    ContentRequestStatus.Failed,
    ContentRequestStatus.Pending,
]


def synchronize_content_requests(dataset_id, transfer_session):
    """
    Synchronizes content download and removal requests with models that dictate assignment, like
    Lessons and Exams. Any model that attaches the `ContentAssignmentManager` will allow this.

    :param dataset_id: The UUID of the synced dataset
    :param transfer_session: The sync's transfer session model
    :type transfer_session: morango.models.core.TransferSession
    """
    facility = Facility.objects.get(dataset_id=dataset_id)

    # process the new assignments
    logger.info("Processing new content assignment requests")
    for assignment in ContentAssignmentManager.find_all_downloadable_assignments(
        transfer_session.id
    ):
        related_removals = ContentRemovalRequest.objects.filter(
            reason=ContentRequestReason.SyncInitiated,
            source_model=assignment.source_model,
            source_id=assignment.source_id,
        )
        # delete any related removal requests
        related_removals.delete()

        ContentDownloadRequest.objects.get_or_create(
            defaults=dict(
                facility_id=facility.id,
                reason=ContentRequestReason.SyncInitiated,
                status=ContentRequestStatus.Pending,
            ),
            source_model=assignment.source_model,
            source_id=assignment.source_id,
            contentnode_id=assignment.contentnode_id,
        )

    # process new removals
    logger.info("Processing new content removal requests")
    for assignment in ContentAssignmentManager.find_all_removable_assignments(
        transfer_session.id
    ):
        related_downloads = ContentDownloadRequest.objects.filter(
            reason=ContentRequestReason.SyncInitiated,
            source_model=assignment.source_model,
            source_id=assignment.source_id,
        )

        if isinstance(assignment, DeletedAssignment):
            # for completed downloads, we'll go through contentnode_ids and add removals
            removed_contentnode_ids = related_downloads.values_list(
                "contentnode_id", flat=True
            ).distinct()
        else:
            removed_contentnode_ids = [assignment.contentnode_id]

        for contentnode_id in removed_contentnode_ids:
            ContentRemovalRequest.objects.get_or_create(
                defaults=dict(
                    facility_id=facility.id,
                    reason=ContentRequestReason.SyncInitiated,
                    status=ContentRequestStatus.Pending,
                ),
                source_model=assignment.source_model,
                source_id=assignment.source_id,
                contentnode_id=contentnode_id,
            )

        # delete any related download requests
        related_downloads.delete()


def _get_preferred_network_location(version_filter=None):
    """
    Finds the preferred network location (peer) for importing content

    :param version_filter: a version range used to filter instances
    :return: A NetworkLocation if available
    :rtype: NetworkLocation
    """
    # find the server instance ID for the latest sync session having a matching network location
    # that is not a SoUD and its connection status is currently okay
    instance_ids = SyncSession.objects.order_by("-last_activity_timestamp").values_list(
        "server_instance_id", flat=True
    )

    # we can't combine this into one SQL query because the tables live in separate sqlite DBs
    for instance_id in instance_ids:
        try:
            peer = NetworkLocation.objects.get(
                instance_id=instance_id.hex,
                connection_status=ConnectionStatus.Okay,
                subset_of_users_device=False,
            )
            # ensure version is applicable according to filter
            if version_filter is not None and not peer.matches_version(version_filter):
                continue
            return peer
        except NetworkLocation.DoesNotExist:
            continue
    return None


def _total_size(*querysets):
    """
    :type querysets: django.db.models.QuerySet[]
    :return: int
    """
    total_size = 0
    for queryset in querysets:
        total_size += (
            queryset.aggregate(total_size=Sum("total_size")).get("total_size", 0) or 0
        )
    return total_size


def _total_size_annotation():
    """
    Returns a subquery to determine the total size of needed files not yet imported
    """
    # we check the parent and the node itself, since we'll generally want to import the parent
    # topic/folder for the resource, and it may have thumbnails
    return Subquery(
        File.objects.filter(
            Q(contentnode_id=OuterRef("contentnode_id"))
            | Q(contentnode__parent_id=OuterRef("contentnode_id"))
            & Q(local_file__available=False)
        )
        .annotate(total_size=Sum("local_file__file_size"))
        .values("total_size"),
        output_field=BigIntegerField(),
    )


def incomplete_downloads_queryset():
    """
    Returns a queryset used to determine the incomplete downloads, with and without metadata, as
    well as the total import size if it does have metadata
    """
    return (
        ContentDownloadRequest.objects.filter(status__in=INCOMPLETE_STATUSES)
        .order_by("requested_at")
        .annotate(
            has_metadata=Exists(
                ContentNode.objects.filter(pk=OuterRef("contentnode_id"))
            ),
            total_size=_total_size_annotation(),
        )
    )


def completed_downloads_queryset():
    """
    Returns a queryset used to determine the completed downloads, with and without metadata, as
    well as the total import size if it does have metadata
    """
    return (
        ContentDownloadRequest.objects.filter(status__in=ContentRequestStatus.Completed)
        .order_by("requested_at")
        .annotate(
            has_metadata=Exists(
                ContentNode.objects.filter(pk=OuterRef("contentnode_id"))
            ),
            total_size=_total_size_of_imported_files_annotation(),
        )
    )


def _total_size_of_imported_files_annotation():
    """
    Returns a subquery to determine the total size of imported files
    """
    return Subquery(
        File.objects.filter(
            Q(contentnode_id=OuterRef("contentnode_id"))
            | Q(contentnode__parent_id=OuterRef("contentnode_id"))
            & Q(local_file__available=True)
        )
        .annotate(total_size=Sum("local_file__file_size"))
        .values("total_size"),
        output_field=BigIntegerField(),
    )


class InsufficientStorage(Exception):
    """
    Dedicated exception with which we can halt content request processing for insufficient storage
    """

    pass


class NoPeerAvailable(Exception):
    """
    Dedicated exception with which we can halt content request processing when we don't have a peer
    """

    pass


def process_content_requests():
    """
    Wrapper around the processing of content requests to capture errors
    """
    logger.debug("Processing content requests")
    incomplete_downloads = incomplete_downloads_queryset()

    # first, process the metadata import for any incomplete downloads without metadata
    incomplete_downloads_without_metadata = incomplete_downloads.filter(
        has_metadata=False
    )
    if incomplete_downloads_without_metadata.exists():
        logger.debug("Attempting to import missing metadata before content import")
        process_metadata_import(incomplete_downloads_without_metadata)

    try:
        logger.debug("Starting automated import of content")
        _process_content_requests(incomplete_downloads)
        # must have completed downloads, we can clear any 'InsufficientStorage' statuses
        LearnerDeviceStatus.clear_statuses()
    except InsufficientStorage as e:
        logger.warning(str(e))
        LearnerDeviceStatus.save_statuses(DeviceStatus.InsufficientStorage)
    except NoPeerAvailable as e:
        logger.warning(str(e))


def _get_import_metadata(client, contentnode_id):
    """
    :type client: NetworkClient
    :type contentnode_id: str
    :rtype: None|dict
    """
    url_path = reverse_path(
        "kolibri:core:importmetadata-detail", kwargs={"pk": contentnode_id}
    )
    try:
        response = client.get(url_path)
        return response.json()
    except NetworkLocationResponseFailure as e:
        # 400 level errors, like 404, are ignored
        if e.response and 400 <= e.response.status_code < 500:
            logger.debug(
                "Metadata request failure: GET {} {}".format(
                    url_path, e.response.status_code
                )
            )
            return None
        raise e


def _import_metadata(client, contentnode_ids):
    """
    :type client: NetworkClient
    :param contentnode_ids: a values_list QuerySet of content node ids or list of them
    :type contentnode_ids: QuerySet or list
    """
    total_count = (
        contentnode_ids.count()
        if isinstance(contentnode_ids, QuerySet)
        else len(contentnode_ids)
    )
    processed_count = 0
    logger.info("Importing content metadata for {} nodes".format(total_count))
    for contentnode_id in contentnode_ids:
        import_metadata = _get_import_metadata(client, contentnode_id)
        # if the request 404'd, then we wouldn't have this data
        if import_metadata:
            processed_count += 1
            import_channel_from_data(import_metadata, cancel_check=False, partial=True)
            if processed_count % 10 == 0:
                logger.info(
                    "Imported content metadata for {} out of {} nodes".format(
                        processed_count, total_count
                    )
                )
        else:
            logger.warning(
                "Failed to import content metadata for {}".format(contentnode_id)
            )
    logger.info("Imported content metadata for {} nodes".format(processed_count))


def process_metadata_import(incomplete_downloads_without_metadata):
    """
    Processes metadata import for a queryset already filtered to those without metadata
    :param incomplete_downloads_without_metadata: a ContentDownloadRequest queryset
    :type incomplete_downloads_without_metadata: django.db.models.QuerySet
    """
    peer = _get_preferred_network_location(version_filter=">=0.16.0")
    if not peer:
        # can't import metadata without peers having minimum version 0.16.0
        logger.info("No acceptable peer network device for importing content metadata")
        return

    # during processing, if there's a critical failure in making requests to the peer, this will
    # capture those errors, and obviously the raise exceptions will interrupt processing
    with capture_connection_state(peer):
        with NetworkClient.build_from_network_location(peer) as client:
            # test connection
            client.connect()
            _import_metadata(
                client,
                incomplete_downloads_without_metadata.values_list(
                    "contentnode_id", flat=True
                ),
            )


def _process_content_requests(incomplete_downloads):
    """
    Processes content requests, both for downloading and removing content
    """
    incomplete_downloads_with_metadata = incomplete_downloads.filter(has_metadata=True)

    # obtain the incomplete removals, that do not have an associated download
    incomplete_removals = (
        ContentRemovalRequest.objects.annotate(
            has_download=Exists(
                ContentDownloadRequest.objects.filter(
                    contentnode_id=OuterRef("contentnode_id")
                ).exclude(
                    # has a download that isn't from the same model
                    source_model=OuterRef("source_model"),
                    source_id=OuterRef("source_id"),
                )
            ),
            is_admin_imported=Exists(
                ContentNode.objects.filter(
                    id=OuterRef("contentnode_id"),
                    admin_imported=True,
                )
            ),
        )
        .filter(
            status__in=INCOMPLETE_STATUSES,
        )
        .exclude(
            # hoping using exclude creates SQL like `NOT EXISTS`
            has_download=True,
            is_admin_imported=True,
        )
        .order_by("requested_at")
    )
    incomplete_sync_removals = incomplete_removals.filter(
        reason=ContentRequestReason.SyncInitiated
    )
    incomplete_user_removals = incomplete_removals.filter(
        reason=ContentRequestReason.UserInitiated
    )
    complete_user_downloads = ContentDownloadRequest.objects.filter(
        status=ContentRequestStatus.Completed, reason=ContentRequestReason.UserInitiated
    )

    # loop while we have pending downloads
    while incomplete_downloads_with_metadata.exists():
        free_space = get_free_space(OPTIONS["Paths"]["CONTENT_DIR"])

        # if a limit is set, subtract the total content storage size from the limit
        if get_device_setting("set_limit_for_autodownload", False):
            # compute total space used by automatic and learner initiated downloads
            completed_downloads_size = _total_size(completed_downloads_queryset())
            # convert limit_for_autodownload from GB to bytes
            auto_download_limit = bytes_from_humans(
                str(get_device_setting("limit_for_autodownload", "0")) + "GB"
            )
            # returning smallest argument as to not exceed the space available on disk
            free_space = min(free_space, auto_download_limit - completed_downloads_size)

        # grab the next request that will fit within current free space
        download_request = incomplete_downloads_with_metadata.filter(
            total_size__lte=free_space
        ).first()

        if download_request is not None:
            process_download_request(download_request)
        else:
            logger.debug(
                "Did not find suitable download request for free space {}".format(
                    free_space
                )
            )
            if incomplete_sync_removals.exists():
                # process, then repeat
                logger.info("Processing sync-initiated content removal requests")
                process_content_removal_requests(incomplete_sync_removals)
                continue
            if incomplete_user_removals.exists():
                # process, then repeat
                logger.info("Processing user-initiated content removal requests")
                process_content_removal_requests(incomplete_user_removals)
                continue
            if complete_user_downloads.exists():
                # process, then repeat
                process_user_downloads_for_removal()
                continue
            raise InsufficientStorage(
                "Content download requests need {} of free space".format(
                    bytes_for_humans(_total_size(incomplete_downloads_with_metadata))
                )
            )


def process_download_request(download_request):
    """
    Processes a download request
    :type download_request: ContentDownloadRequest
    """
    # we do not need to filter by version, since content import should work for any
    peer = _get_preferred_network_location()
    if not peer:
        # if we're processing download requests, and this happens, no use continuing
        raise NoPeerAvailable("Could not find available peer for content import")

    logger.info(
        "Processing content import request for node {}".format(
            download_request.contentnode_id
        )
    )
    # mark request as processing
    download_request.status = ContentRequestStatus.InProgress
    download_request.save()

    try:
        # by this point we should have a ContentNode
        channel_id = ContentNode.objects.get(
            pk=download_request.contentnode_id
        ).channel_id
        import_manager = RemoteChannelResourceImportManager(
            channel_id,
            peer_id=peer.id,
            baseurl=peer.base_url,
            node_ids=[download_request.contentnode_id],
        )
        import_manager.run()

        download_request.status = ContentRequestStatus.Completed
        download_request.save()
    except Exception as e:
        logger.exception(e)
        download_request.status = ContentRequestStatus.Failed
        download_request.save()


def process_user_downloads_for_removal():
    """
    Simplistic approach to removing user downloads, starting with largest and working down
    """
    user_downloads = (
        ContentDownloadRequest.objects.filter(
            reason=ContentRequestReason.UserInitiated,
            status=ContentRequestStatus.Completed,
        )
        .annotate(
            total_size=_total_size_annotation(),
            has_other_download=Exists(
                ContentDownloadRequest.objects.filter(
                    contentnode_id=OuterRef("contentnode_id")
                ).exclude(
                    # has a download that isn't from the same model
                    source_model=OuterRef("source_model"),
                    source_id=OuterRef("source_id"),
                )
            ),
        )
        .exclude(
            has_other_download=True,
        )
    )

    # TODO: add more sophisticated logic for choosing which user downloads to remove, like based
    # off the user's interaction with the resource, e.g. complete status
    largest_user_download = user_downloads.order_by("-total_size").first()

    # adding this opposite of the user download request allows us to detect this situation
    user_download_removal = ContentRemovalRequest(
        facility_id=largest_user_download.facility_id,
        source_model=largest_user_download.source_model,
        source_id=largest_user_download.source_id,
        reason=ContentRequestReason.SyncInitiated,
        status=ContentRequestStatus.Pending,
        contentnode_id=largest_user_download.contentnode_id,
    )
    # this removal request will be processed on the next loop
    user_download_removal.save()
    logger.info(
        "Added removal request for user download of {}".format(
            largest_user_download.contentnode_id
        )
    )


def process_content_removal_requests(queryset):
    """
    Garbage collects content requests marked for removal (removed_at is not null)

    :param queryset: a ContentRemovalRequest queryset
    :type queryset: django.db.models.QuerySet
    """
    # exclude admin imported nodes
    removable_nodes = ContentNode.objects.filter(
        admin_imported=False,
        id__in=queryset.values_list("contentnode_id", flat=True).distinct(),
        available=True,
    )
    channel_ids = removable_nodes.values_list("channel_id", flat=True).distinct()

    for channel_id in channel_ids:
        contentnode_ids = removable_nodes.filter(channel_id=channel_id).values_list(
            "id", flat=True
        )
        channel_requests = queryset.filter(contentnode_id__in=contentnode_ids)
        channel_requests.update(status=ContentRequestStatus.InProgress)
        try:
            call_command(
                "deletecontent",
                channel_id,
                node_ids=list(contentnode_ids),
                force_delete=True,
            )
            channel_requests.update(status=ContentRequestStatus.Completed)
        except Exception as e:
            logger.exception(e)
            channel_requests.update(status=ContentRequestStatus.Failed)

    # lastly, update all incomplete as completed, since they must have been excluded
    # as already unavailable
    queryset.filter(status__in=INCOMPLETE_STATUSES).update(
        status=ContentRequestStatus.Completed
    )
