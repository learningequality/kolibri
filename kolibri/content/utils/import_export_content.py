from django.db.models import Sum

from kolibri.content.models import ContentNode
from kolibri.content.models import LocalFile
from kolibri.content.utils.content_types_tools import renderable_contentnodes_q_filter


def get_files_to_transfer(channel_id, node_ids, exclude_node_ids, available, renderable_only=True):
    files_to_transfer = LocalFile.objects.filter(files__contentnode__channel_id=channel_id, available=available)

    if node_ids:
        node_ids = _get_node_ids(node_ids)
        files_to_transfer = files_to_transfer.filter(files__contentnode__in=node_ids)

    if exclude_node_ids:
        exclude_node_ids = _get_node_ids(exclude_node_ids)
        files_to_transfer = files_to_transfer.exclude(files__contentnode__in=exclude_node_ids)

    if renderable_only:
        files_to_transfer = files_to_transfer.filter(files__contentnode__in=ContentNode.objects.filter(
            channel_id=channel_id).filter(renderable_contentnodes_q_filter).distinct())

    # Make sure the files are unique, to avoid duplicating downloads
    files_to_transfer = files_to_transfer.distinct()

    total_bytes_to_transfer = files_to_transfer.aggregate(Sum('file_size'))['file_size__sum'] or 0

    return files_to_transfer, total_bytes_to_transfer


def _get_node_ids(node_ids):

    return ContentNode.objects \
        .filter(pk__in=node_ids) \
        .get_descendants(include_self=True) \
        .values_list('id', flat=True)
