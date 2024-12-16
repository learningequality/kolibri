import logging
import uuid
from itertools import chain

from django.core.management import call_command
from django.db.models import BigIntegerField
from django.db.models import BooleanField
from django.db.models import Case
from django.db.models import Exists
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import QuerySet
from django.db.models import Subquery
from django.db.models import Sum
from django.db.models import Value
from django.db.models import When
from django.db.models.expressions import CombinedExpression
from django.db.models.functions import Coalesce
from morango.models.core import SyncSession

from kolibri.core.auth.models import Facility
from kolibri.core.auth.models import FacilityUser
from kolibri.core.content.models import ContentDownloadRequest
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentRemovalRequest
from kolibri.core.content.models import ContentRequest
from kolibri.core.content.models import ContentRequestReason
from kolibri.core.content.models import ContentRequestStatus
from kolibri.core.content.models import File
from kolibri.core.content.utils.assignment import ContentAssignmentManager
from kolibri.core.content.utils.assignment import DeletedAssignment
from kolibri.core.content.utils.channel_import import import_channel_from_data
from kolibri.core.content.utils.file_availability import LocationError
from kolibri.core.content.utils.resource_import import (
    ContentDownloadRequestResourceImportManager,
)
from kolibri.core.content.utils.settings import allow_non_local_download
from kolibri.core.content.utils.settings import get_free_space_for_downloads
from kolibri.core.device.models import DeviceStatus
from kolibri.core.device.models import LearnerDeviceStatus
from kolibri.core.device.utils import get_device_setting
from kolibri.core.discovery.models import ConnectionStatus
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.connections import capture_connection_state
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.discovery.well_known import CENTRAL_CONTENT_BASE_INSTANCE_ID
from kolibri.core.utils.urls import reverse_path
from kolibri.utils.conf import OPTIONS
from kolibri.utils.data import bytes_for_humans
from kolibri.utils.file_transfer import ChunkedFileDirectoryManager


logger = logging.getLogger(__name__)


# request statuses that signify incomplete requests
INCOMPLETE_STATUSES = [
    ContentRequestStatus.Failed,
    ContentRequestStatus.Pending,
]


def _uuid_to_hex(_uuid):
    return _uuid.hex if isinstance(_uuid, uuid.UUID) else uuid.UUID(_uuid).hex


def create_content_download_requests(facility, assignments, source_instance_id=None):
    """
    Creates sync-initiated content download requests and removes corresponding removals
    for a given set of assignments.

    :param facility: A Facility model instance
    :param assignments: A list of ContentAssignment objects
    :param source_instance_id: The UUID of the instance that most likely has the content
    """
    logger.info("Processing new content assignment requests")
    for assignment in assignments:
        related_removals = ContentRemovalRequest.objects.filter(
            reason=ContentRequestReason.SyncInitiated,
            source_model=assignment.source_model,
            source_id=assignment.source_id,
        )
        # delete any related removal requests
        related_removals.delete()

        logger.debug("Creating content download request for {}".format(assignment))
        ContentDownloadRequest.objects.get_or_create(
            defaults=dict(
                facility_id=facility.id,
                reason=ContentRequestReason.SyncInitiated,
                status=ContentRequestStatus.Pending,
                source_instance_id=source_instance_id,
            ),
            source_model=assignment.source_model,
            source_id=assignment.source_id,
            contentnode_id=assignment.contentnode_id,
        )


def create_content_removal_requests(facility, removable_assignments):
    """
    Creates sync-initiated content removal requests and removes corresponding downloads
    for a given set of assignments.

    :param facility: A Facility model instance
    :param removable_assignments: A list of ContentAssignment or DeletedAssignment objects
    """
    logger.info("Processing new content removal requests")
    for assignment in removable_assignments:
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
            logger.debug(
                "Creating content removal request for {}".format(contentnode_id)
            )
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


def synchronize_content_requests(dataset_id, transfer_session=None):
    """
    Synchronizes content download and removal requests with models that dictate assignment, like
    Lessons and Exams. Any model that attaches the `ContentAssignmentManager` will allow this.

    :param dataset_id: The UUID of the dataset
    :type dataset_id: str
    :param transfer_session: The sync's transfer session model, if available
    :type transfer_session: morango.models.core.TransferSession|None
    """
    facility = Facility.objects.get(dataset_id=dataset_id)

    if transfer_session is None and dataset_id is None:
        raise ValueError("Either dataset_id or transfer_session_id is required")

    # transfer_session_id takes precedence over dataset_id, since it's more specific
    # (a transfer session should only affect one dataset)
    find_kwargs = {}
    if transfer_session:
        find_kwargs.update(transfer_session_id=transfer_session.id)
    else:
        find_kwargs.update(dataset_id=dataset_id)

    assignments = ContentAssignmentManager.find_all_downloadable_assignments(
        **find_kwargs
    )
    removable_assignments = ContentAssignmentManager.find_all_removable_assignments(
        **find_kwargs
    )

    # if we have a transfer session, we can use it to determine the source instance ID, which
    # will be used to determine the preferred network locations, as it's the most likely
    # place to find the content
    source_instance_id = None
    if transfer_session:
        sync_session = transfer_session.sync_session
        # this is only invoked with a transfer session when *receiving* data,
        # so we can use the push/pull direction to determine the source instance ID
        source_instance_id = (
            sync_session.client_instance_id
            if transfer_session.push
            else sync_session.server_instance_id
        )

    # process removals first
    create_content_removal_requests(facility, removable_assignments)
    create_content_download_requests(
        facility, assignments, source_instance_id=source_instance_id
    )


class PreferredDevices(object):
    """
    A class that produces a generator returning preferred network locations (devices), given a list
    of instance IDs, and a filter for the version of Kolibri running on the server.

    The instance IDs are used to filter the devices, and only those devices that are available and
    possibly matching the version filter are returned.
    """

    def __init__(self, instance_ids, version_filter=None, filters=None):
        """
        :param instance_ids: A list or iterator of instance IDs to filter by
        :param version_filter: A version filter to apply to the network locations
        :param filters: Additional filters to apply to the network locations
        """
        self.instance_ids = instance_ids
        self._version_filter = version_filter
        self._filters = filters or {}

    @classmethod
    def build_from_sync_sessions(cls, version_filter=None, filters=None):
        """
        Build a PreferredNetworkLocations object from recent sync sessions

        :param version_filter: A version filter to apply to the network locations
        :param filters: Additional filters to apply to the network locations
        :return: A PreferredNetworkLocations object
        """
        filters = filters or {}
        # only include devices that are not a subset of the user's device
        filters.update(subset_of_users_device=False)
        instance_ids = (
            SyncSession.objects.order_by("-last_activity_timestamp")
            .values_list("server_instance_id", flat=True)
            .distinct()
        )
        return cls(
            instance_ids,
            version_filter=version_filter,
            filters=filters,
        )

    def _get_and_validate_peer(self, instance_id):
        """
        Get a peer by instance ID, and validate that it is available and matches the version filter
        :param instance_id: A UUID or hex string representing the instance ID
        :type instance_id: str|UUID
        :return: The NetworkLocation object, or None if it is not available or does not match the
                 validation conditions
        """
        peer = (
            NetworkLocation.objects.annotate(
                okay=Case(
                    When(
                        connection_status=ConnectionStatus.Okay,
                        then=Value(True),
                    ),
                    default=Value(False),
                    output_field=BooleanField(),
                ),
            )
            .order_by("-okay")
            .filter(instance_id=_uuid_to_hex(instance_id), **self._filters)
            .first()
        )

        if not peer:
            return None

        # if we're on a metered connection, we only want to download from local peers
        if not peer.is_local and not allow_non_local_download():
            logger.debug(
                "Non-local peer {} excluded when using metered connection".format(
                    instance_id
                )
            )
            return None
        # ensure peer is available, unless it's Studio
        if (
            not instance_id == CENTRAL_CONTENT_BASE_INSTANCE_ID
            and peer.connection_status != ConnectionStatus.Okay
        ):
            logger.debug("Peer {} is not available".format(instance_id))
            return None
        # ensure version is applicable according to filter
        if self._version_filter is not None and not peer.matches_version(
            self._version_filter
        ):
            logger.debug("Peer {} does not match version filter".format(instance_id))
            return None
        return peer

    def __iter__(self):
        """
        Iterate over the network locations, yielding one at a time
        :return: The network location object yielded
        :rtype: Generator<NetworkLocation>
        """
        for instance_id in self.instance_ids:
            # if null, skip
            if not instance_id:
                continue
            peer = self._get_and_validate_peer(instance_id)
            if peer:
                # yield resulting peer
                yield peer


class PreferredDevicesWithClient(PreferredDevices):
    """
    A class that produces a generator that returns preferred network locations (devices) and
    individual network clients for each, given a list of instance IDs, and a filter for the version
    of Kolibri.
    """

    def __iter__(self):
        """
        Iterate over the network locations, yielding the network location and a network client
        :rtype: Generator<(NetworkLocation, NetworkClient)>
        """
        for peer in super(PreferredDevicesWithClient, self).__iter__():
            # during processing, if there's a critical failure in making requests to the peer,
            # this will capture those errors, and obviously the raising of exceptions
            # will interrupt processing
            with capture_connection_state(peer):
                with NetworkClient.build_from_network_location(peer) as client:
                    # test connection
                    client.connect()
                    yield (peer, client)


def _total_size(*querysets):
    """
    :type querysets: django.db.models.QuerySet[]
    :return: int
    """
    total_size = 0
    for queryset in querysets:
        total_size += (
            queryset.aggregate(sum_size=Sum("total_size")).get("sum_size", 0) or 0
        )
    return total_size


def _node_total_size(contentnode_id, thumbnail=False, available=False):
    """
    Returns a subquery to determine the total size of needed files not yet imported
    :param contentnode_id: A contentnode ID or OuterRef to ID field
    :param thumbnail: Whether to filter on thumbnails
    :param available: Whether to filter on available files
    """
    filters = {}
    if thumbnail:
        filters["thumbnail"] = True
        filters["supplementary"] = True

    return Coalesce(
        Subquery(
            File.objects.filter(
                contentnode_id=contentnode_id,
                local_file__available=available,
                **filters
            )
            .values(
                _no_group_by=Value(0)
            )  # dummy value to allow aggregation, without group by
            .annotate(total_size=Sum("local_file__file_size"))
            .values("total_size")
            .order_by(),
            output_field=BigIntegerField(),
        ),
        Value(0),
        output_field=BigIntegerField(),
    )


def _total_size_annotation(available=False):
    """
    Returns a subquery to determine the total size of needed files not yet imported
    """
    # we check the parent and the node itself, since we'll generally want to import the parent
    # topic/folder for the resource, and it may have thumbnails
    return CombinedExpression(
        # the requested node's size
        _node_total_size(OuterRef("contentnode_id"), available=available),
        "+",
        # the requested node's parent's size
        Coalesce(
            Subquery(
                ContentNode.objects.filter(id=OuterRef("contentnode_id"))
                .values(
                    _no_group_by=Value(0)
                )  # dummy value to allow aggregation, without group by
                .annotate(
                    parent_total_size=_node_total_size(
                        OuterRef("parent_id"),
                        thumbnail=True,
                        available=available,
                    )
                )
                .values("parent_total_size"),
                output_field=BigIntegerField(),
            ),
            Value(0),
            output_field=BigIntegerField(),
        ),
        output_field=BigIntegerField(),
    )


def incomplete_downloads_queryset():
    """
    Returns a queryset used to determine the incomplete downloads, with and without metadata, as
    well as the total import size if it does have metadata
    """
    qs = (
        ContentDownloadRequest.objects.filter(status__in=INCOMPLETE_STATUSES)
        .order_by("requested_at")
        .annotate(
            has_metadata=Exists(
                ContentNode.objects.filter(pk=OuterRef("contentnode_id"))
            ),
            total_size=_total_size_annotation(),
            is_learner_download=Case(
                When(
                    source_model=FacilityUser.morango_model_name,
                    then=Exists(
                        FacilityUser.objects.filter(
                            id=OuterRef("source_id"),
                            roles__isnull=True,
                        )
                    ),
                ),
                default=Value(False),
                output_field=BooleanField(),
            ),
        )
    )
    # if we're not allowing learner downloads, filter them out
    if not get_device_setting("allow_learner_download_resources"):
        qs = qs.exclude(is_learner_download=True)
    return qs


def completed_downloads_queryset():
    """
    Returns a queryset used to determine the completed downloads, with and without metadata, as
    well as the total import size if it does have metadata
    """
    return (
        ContentDownloadRequest.objects.filter(status=ContentRequestStatus.Completed)
        .order_by("requested_at")
        .annotate(
            has_metadata=Exists(
                ContentNode.objects.filter(pk=OuterRef("contentnode_id"))
            ),
            total_size=_total_size_annotation(available=True),
        )
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


class AlreadyAvailable(Exception):
    """
    Dedicated exception with which we can halt content request processing when we detect
    that the content is already available
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
        if e.response is not None and 400 <= e.response.status_code < 500:
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
    :return: A boolean indicating whether all metadata was imported successfully
    """
    total_count = (
        contentnode_ids.count()
        if isinstance(contentnode_ids, QuerySet)
        else len(contentnode_ids)
    )
    # quick exit, without log noise, if nothing to do
    if not total_count:
        logging.debug("No content metadata to import")
        return
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
    return total_count == processed_count


def process_metadata_import(incomplete_downloads_without_metadata):
    """
    Processes metadata import for a queryset already filtered to those without metadata
    :param incomplete_downloads_without_metadata: a ContentDownloadRequest queryset
    :type incomplete_downloads_without_metadata: django.db.models.QuerySet
    """
    preferred_instance_ids = list(
        incomplete_downloads_without_metadata.values_list(
            "source_instance_id", flat=True
        )
        # Remove any ordering to ensure the distinct makes the list properly unique.
        .order_by().distinct()
    )
    version_filter = ">=0.16.0"
    preferred_peers = PreferredDevicesWithClient(
        preferred_instance_ids, version_filter=version_filter
    )

    # first, try to import metadata from the preferred peers, filtering the requests
    # by the matching instance_id
    for peer, client in preferred_peers:
        _import_metadata(
            client,
            incomplete_downloads_without_metadata.filter(
                source_instance_id=_uuid_to_hex(peer.instance_id),
            ).values_list("contentnode_id", flat=True),
        )

    # if we've completed the import, then we can stop
    if not incomplete_downloads_without_metadata.exists():
        return

    # otherwise, try to import metadata without filtering the requests by matching instance_id,
    # first from the same preferred peers, then by any fallback peers
    fallback_peers = PreferredDevicesWithClient.build_from_sync_sessions(
        version_filter=version_filter
    )
    for peer, client in chain(preferred_peers, fallback_peers):
        is_complete = _import_metadata(
            client,
            incomplete_downloads_without_metadata.exclude(
                source_instance_id=_uuid_to_hex(peer.instance_id)
            ).values_list("contentnode_id", flat=True),
        )
        # if we've completed the import, then we can stop
        if is_complete:
            break
    else:
        # if we haven't completed the import by this point, then we can log a warning
        unprocessed_count = incomplete_downloads_without_metadata.count()
        logger.info(
            "No acceptable peer device for importing content metadata for {} nodes".format(
                unprocessed_count
            )
        )


def incomplete_removals_queryset():
    """
    Produces a queryset of incomplete ContentRemovalRequests that are not admin imported and are
    applicable for removal (does not have another download request for the same content node)
    :return: A queryset of incomplete ContentRemovalRequests that are not admin imported
    :rtype: django.db.models.QuerySet
    """
    return (
        ContentRemovalRequest.objects.annotate(
            has_other_download=Exists(
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
            Q(has_other_download=True)
            | Q(is_admin_imported=True)
        )
        .order_by("requested_at")
    )


def _process_content_requests(incomplete_downloads):
    """
    Processes content requests, both for downloading and removing content
    """

    calc = StorageCalculator(incomplete_downloads)

    incomplete_downloads_with_metadata = calc.incomplete_downloads.filter(
        has_metadata=True
    )

    # obtain the incomplete removals, that do not have an associated download
    # track failed so we can exclude them from the loop
    failed_ids = []
    has_processed_sync_removals = False
    has_processed_user_removals = False
    has_processed_user_downloads = False
    has_freed_space_in_stream_cache = False
    qs = incomplete_downloads_with_metadata.all()

    # loop while we have pending downloads
    while qs.exists():
        free_space = get_free_space_for_downloads(
            completed_size=_total_size(completed_downloads_queryset())
        )

        # grab the next request that will fit within current free space
        download_request = qs.filter(total_size__lte=free_space).first()

        if download_request is not None:
            if not process_download_request(download_request):
                failed_ids.append(download_request.id)
                qs = incomplete_downloads_with_metadata.exclude(id__in=failed_ids)
        else:
            logger.debug(
                "Did not find suitable download request for free space {}".format(
                    free_space
                )
            )
            if (
                not has_processed_sync_removals
                and calc.incomplete_sync_removals.exists()
            ):
                # process, then repeat
                has_processed_sync_removals = True
                logger.info("Processing sync-initiated content removal requests")
                process_content_removal_requests(calc.incomplete_sync_removals)
                continue
            if (
                not has_processed_user_removals
                and calc.incomplete_user_removals.exists()
            ):
                # process, then repeat
                has_processed_user_removals = True
                logger.info("Processing user-initiated content removal requests")
                process_content_removal_requests(calc.incomplete_user_removals)
                continue
            if (
                not has_processed_user_downloads
                and calc.complete_user_downloads.exists()
            ):
                # process, then repeat
                has_processed_user_downloads = True
                process_user_downloads_for_removal()
                continue
            if not has_freed_space_in_stream_cache:
                # try to clear space, then repeat
                has_freed_space_in_stream_cache = True
                chunked_file_manager = ChunkedFileDirectoryManager(
                    OPTIONS["Paths"]["CONTENT_DIR"]
                )
                chunked_file_manager.evict_files(
                    calc.get_additional_free_space_needed()
                )
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
        node = ContentNode.objects.get(pk=download_request.contentnode_id)
        if node.available:
            raise AlreadyAvailable(
                "ContentNode {} is already available".format(node.id)
            )

        peer_sets = [
            # we do not need to filter by version, since content import should work for any
            PreferredDevices.build_from_sync_sessions(),
        ]

        # prepend the preferred by source instance id, if it exists
        if download_request.source_instance_id:
            # we do not need to filter by version, since content import should work for any
            peer_sets.insert(
                0, PreferredDevices(instance_ids=[download_request.source_instance_id])
            )

        # we try to import from the source instance first
        for peer in chain(*peer_sets):
            if _process_download(download_request, node.channel_id, peer):
                # if we successfully imported, break out of the loop
                break
        else:
            raise NoPeerAvailable(
                "Unable to import {} from peers".format(download_request.contentnode_id)
            )
    except AlreadyAvailable as e:
        # do nothing, since the content is already available
        logger.debug(str(e))
    except Exception as e:
        if isinstance(e, NoPeerAvailable):
            logger.warning(e)
        else:
            logger.exception(e)

        download_request.status = ContentRequestStatus.Failed
        download_request.save()
        return False

    download_request.status = ContentRequestStatus.Completed
    download_request.save()
    return True


def _process_download(download_request, channel_id, peer):
    """
    Processes an import for a download request
    :param download_request: The download request model instance
    :type download_request: ContentDownloadRequest
    :param channel_id: The channel id for the contentnode referenced by the download request
    :type channel_id: str
    :param peer: The peer to import from
    :type peer: NetworkLocation
    :return: True if the import was successful, False otherwise
    :rtype: bool
    """
    try:
        import_manager = ContentDownloadRequestResourceImportManager(
            channel_id,
            peer,
            download_request,
            fail_on_error=True,
        )
        _, count = import_manager.run()

        # re-raise if there's an exception
        if getattr(import_manager, "exception", None):
            raise getattr(import_manager, "exception")
        elif not count or count == 0:
            logger.warning(
                "ContentNode files may not have imported successfully: {}".format(
                    download_request.contentnode_id
                )
            )
            # if we have no count, we should try the next peer
            return False
        # without an exception, and non-zero count, we can assume the import was successful
        return True
    except LocationError:
        # content not found on peer, try the next one
        return False
    except Exception as e:
        # some other error occurred, log it and try the next peer
        logger.exception(e)
        return False


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
            total_size=_total_size_annotation(available=True),
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
    # this removal request will be processed on the next loop
    ContentRemovalRequest.objects.update_or_create(
        source_model=largest_user_download.source_model,
        source_id=largest_user_download.source_id,
        contentnode_id=largest_user_download.contentnode_id,
        defaults=dict(
            facility_id=largest_user_download.facility_id,
            reason=ContentRequestReason.SyncInitiated,
            status=ContentRequestStatus.Pending,
        ),
    )
    logger.info(
        "Added removal request for user download of {}".format(
            largest_user_download.contentnode_id
        )
    )


def _remove_corresponding_download_requests(removal_qs):
    """
    Removes any corresponding download requests for the given removal requests
    :param removal_qs: a ContentRemovalRequest queryset
    :type removal_qs: django.db.models.QuerySet
    """
    return (
        ContentDownloadRequest.objects.annotate(
            has_removal=Exists(
                # completed, same node, same requester (model+source), and requested before
                removal_qs.filter(
                    contentnode_id=OuterRef("contentnode_id"),
                    source_model=OuterRef("source_model"),
                    source_id=OuterRef("source_id"),
                    requested_at__gte=OuterRef("requested_at"),
                    status=ContentRequestStatus.Completed,
                )
            )
        )
        .filter(status=ContentRequestStatus.Completed, has_removal=True)
        .delete()
    )


def process_content_removal_requests(queryset):
    """
    Garbage collects content requests marked for removal (removed_at is not null)

    :param queryset: a ContentRemovalRequest queryset
    :type queryset: django.db.models.QuerySet
    """
    # exclude admin imported nodes
    removable_nodes = ContentNode.objects.filter(
        id__in=queryset.values_list("contentnode_id", flat=True).distinct(),
        available=True,
    ).exclude(
        # could be null, so we exclude True instead of filtering False
        admin_imported=True,
    )
    channel_ids = removable_nodes.values_list("channel_id", flat=True).distinct()

    for channel_id in channel_ids:
        # cast to list immediately to avoid issues with lazy evaluation
        contentnode_ids = list(
            removable_nodes.filter(channel_id=channel_id).values_list("id", flat=True)
        )
        # if we somehow have no contentnode_ids, skip, because the deletecontent command will
        # delete all content for the channel if no node ids are passed
        if not contentnode_ids:
            continue
        # queryset unfiltered by status
        channel_requests = ContentRemovalRequest.objects.filter(
            id__in=list(
                queryset.filter(contentnode_id__in=contentnode_ids).values_list(
                    "id", flat=True
                )
            ),
        )
        channel_requests.update(status=ContentRequestStatus.InProgress)
        try:
            call_command(
                "deletecontent",
                channel_id,
                node_ids=contentnode_ids,
                ignore_admin_flags=True,
                update_content_requests=False,
            )
            # mark all as completed
            channel_requests.update(status=ContentRequestStatus.Completed)
            # finally, delete all corresponding download requests
            _remove_corresponding_download_requests(channel_requests)
        except Exception as e:
            logger.exception(e)
            channel_requests.update(status=ContentRequestStatus.Failed)

    # lastly, remove any downloads for those we're unable to process (admin imported) or are
    # already unavailable and update them completed
    remaining_pending = queryset.filter(status=ContentRequestStatus.Pending)
    _remove_corresponding_download_requests(remaining_pending)
    remaining_pending.update(status=ContentRequestStatus.Completed)


def propagate_contentnode_removal(contentnode_ids):
    """
    Deletes all learner initiated ContentRequests for the passed in contentnode_ids
    Matching learner initiated ContentRequests will be deleted - this means that if
    resources are deleted by an admin, we remove any associated learner initiated requests.
    Also updates the status of any COMPLETED non-learner initiated ContentDownloadRequests to PENDING
    """
    BATCH_SIZE = 250
    for i in range(0, len(contentnode_ids), BATCH_SIZE):
        batch = contentnode_ids[i : i + BATCH_SIZE]
        ContentRequest.objects.filter(
            contentnode_id__in=batch, reason=ContentRequestReason.UserInitiated
        ).delete()
        ContentDownloadRequest.objects.filter(
            contentnode_id__in=batch,
            status=ContentRequestStatus.Completed,
        ).exclude(reason=ContentRequestReason.UserInitiated).update(
            status=ContentRequestStatus.Pending
        )


class StorageCalculator:
    def __init__(self, incomplete_downloads_queryset):
        incomplete_removals = incomplete_removals_queryset()

        self.incomplete_downloads = incomplete_downloads_queryset
        self.incomplete_sync_removals = incomplete_removals.filter(
            reason=ContentRequestReason.SyncInitiated
        ).annotate(
            total_size=_total_size_annotation(available=True),
        )

        self.incomplete_user_removals = incomplete_removals.filter(
            reason=ContentRequestReason.UserInitiated
        ).annotate(
            total_size=_total_size_annotation(available=True),
        )

        self.complete_user_downloads = ContentDownloadRequest.objects.filter(
            status=ContentRequestStatus.Completed,
            reason=ContentRequestReason.UserInitiated,
        ).annotate(
            total_size=_total_size_annotation(available=True),
        )
        self.free_space = 0
        self.incomplete_downloads_size = 0

    def _calculate_space_available(self):
        self.incomplete_downloads_size = _total_size(self.incomplete_downloads)
        free_space = get_free_space_for_downloads(
            completed_size=_total_size(completed_downloads_queryset())
        )
        free_space += _total_size(self.incomplete_sync_removals)
        free_space += _total_size(self.incomplete_user_removals)
        free_space += _total_size(self.complete_user_downloads)

        self.free_space = free_space

    def is_space_sufficient(self):
        self._calculate_space_available()
        return self.free_space > self.incomplete_downloads_size

    def get_additional_free_space_needed(self):
        self._calculate_space_available()
        return self.incomplete_downloads_size - self.free_space
