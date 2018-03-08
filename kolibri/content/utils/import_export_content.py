from django.db.models import Sum
from kolibri.content.models import ContentNode, LocalFile


def get_files_to_transfer(channel_id, node_ids, exclude_node_ids, available):
    files_to_transfer = LocalFile.objects.filter(files__contentnode__channel_id=channel_id, available=available)

    if node_ids:
        node_ids = _get_node_ids(node_ids)
        files_to_transfer = files_to_transfer.filter(files__contentnode__in=node_ids)

    if exclude_node_ids:
        exclude_node_ids = _get_node_ids(exclude_node_ids)
        files_to_transfer = files_to_transfer.exclude(files__contentnode__in=exclude_node_ids)

    # Make sure the files are unique, to avoid duplicating downloads
    files_to_transfer = files_to_transfer.distinct()

    total_bytes_to_transfer = files_to_transfer.aggregate(Sum('file_size'))['file_size__sum'] or 0

    return files_to_transfer, total_bytes_to_transfer


def _get_node_ids(node_ids):

    return ContentNode.objects \
        .filter(pk__in=node_ids) \
        .get_descendants(include_self=True) \
        .values_list('id', flat=True)
