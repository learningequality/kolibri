import hashlib

from django.db.models import Sum
from requests.exceptions import ChunkedEncodingError
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_disk,
)
from kolibri.core.content.utils.importability_annotation import (
    get_channel_stats_from_peer,
)

try:
    import OpenSSL

    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    import requests

    SSLERROR = requests.exceptions.SSLError

RETRY_STATUS_CODE = [502, 503, 504, 521, 522, 523, 524]


def get_nodes_to_transfer(
    channel_id,
    node_ids,
    exclude_node_ids,
    available,
    renderable_only=True,
    drive_id=None,
    peer_id=None,
):
    nodes_to_include = ContentNode.objects.filter(channel_id=channel_id)

    # if requested, filter down to only include particular topics/nodes
    if node_ids:
        nodes_to_include = nodes_to_include.filter_by_uuids(node_ids).get_descendants(
            include_self=True
        )

    # if requested, filter out nodes we're not able to render
    if renderable_only:
        nodes_to_include = nodes_to_include.filter(renderable_contentnodes_q_filter)

    # filter down the query to remove files associated with nodes we've specifically been asked to exclude
    if exclude_node_ids:
        nodes_to_exclude = ContentNode.objects.filter_by_uuids(
            exclude_node_ids
        ).get_descendants(include_self=True)

        nodes_to_include = nodes_to_include.order_by().exclude_by_uuids(
            nodes_to_exclude.values("pk")
        )

    # By default don't filter node ids by their underlying file importability
    file_based_node_id_list = None
    if drive_id:
        file_based_node_id_list = get_channel_stats_from_disk(
            channel_id, drive_id
        ).keys()

    if peer_id:
        file_based_node_id_list = get_channel_stats_from_peer(
            channel_id, peer_id
        ).keys()
    if file_based_node_id_list is not None:
        nodes_to_include = nodes_to_include.filter_by_uuids(file_based_node_id_list)
    return nodes_to_include.filter(available=available).order_by()


def get_files_to_transfer(
    channel_id,
    node_ids,
    exclude_node_ids,
    available,
    renderable_only=True,
    drive_id=None,
    peer_id=None,
):

    nodes_to_include = get_nodes_to_transfer(
        channel_id,
        node_ids,
        exclude_node_ids,
        available,
        renderable_only=renderable_only,
        drive_id=drive_id,
        peer_id=peer_id,
    )
    return calculate_files_to_transfer(nodes_to_include, available)


def calculate_files_to_transfer(nodes_to_include, available):
    files_to_transfer = LocalFile.objects.filter(
        available=available, files__contentnode__in=nodes_to_include
    )

    # Make sure the files are unique, to avoid duplicating downloads
    files_to_transfer = files_to_transfer.distinct()

    # calculate the total file sizes across all files being returned in the queryset
    total_bytes_to_transfer = (
        files_to_transfer.aggregate(Sum("file_size"))["file_size__sum"] or 0
    )

    return files_to_transfer, total_bytes_to_transfer


def _get_node_ids(node_ids):

    return (
        ContentNode.objects.filter_by_uuids(node_ids)
        .get_descendants(include_self=True)
        .values_list("id", flat=True)
    )


def retry_import(e, **kwargs):
    """
    When an exception occurs during channel/content import, if
        * there is an Internet connection error or timeout error,
          or HTTPError where the error code is one of the RETRY_STATUS_CODE,
          return return True to retry the file transfer
        * the file does not exist on the server or disk, skip the file and return False.
          This only applies to content import not channel import.
        * otherwise, raise the  exception.
    return value:
        * True - needs retry.
        * False - file is skipped. Does not need retry.
    """

    skip_404 = kwargs.pop("skip_404")

    if (
        isinstance(e, ConnectionError)
        or isinstance(e, Timeout)
        or isinstance(e, ChunkedEncodingError)
        or (isinstance(e, HTTPError) and e.response.status_code in RETRY_STATUS_CODE)
        or (isinstance(e, SSLERROR) and "decryption failed or bad record mac" in str(e))
    ):
        return True

    elif skip_404 and (
        (isinstance(e, HTTPError) and e.response.status_code == 404)
        or (isinstance(e, OSError) and e.errno == 2)
    ):
        return False

    else:
        raise e


def compare_checksums(file_name, file_id):
    hasher = hashlib.md5()
    with open(file_name, "rb") as f:
        # Read chunks of 4096 bytes for memory efficiency
        for chunk in iter(lambda: f.read(4096), b""):
            hasher.update(chunk)
    checksum = hasher.hexdigest()
    return checksum == file_id
