from django.db.models import Sum

from kolibri.content.models import ContentNode
from kolibri.content.models import LocalFile
from kolibri.content.utils.content_types_tools import renderable_contentnodes_q_filter


def get_files_to_transfer(channel_id, node_ids, exclude_node_ids, available, renderable_only=True):

    # build initial file and node querysets, which will be further filtered below
    files_to_transfer = LocalFile.objects.filter(available=available)
    nodes_to_include = ContentNode.objects.filter(channel_id=channel_id)

    # if requested, filter down to only include particular topics/nodes
    if node_ids:
        nodes_to_include = nodes_to_include.filter(pk__in=node_ids).get_descendants(include_self=True)

    # if requested, filter out nodes we're not able to render
    if renderable_only:
        nodes_to_include = nodes_to_include.filter(renderable_contentnodes_q_filter)

    # filter down the files query to only include files associated with the nodes we care about
    files_to_transfer = files_to_transfer.filter(files__contentnode__in=nodes_to_include)

    # filter down the query to remove files associated with nodes we've specifically been asked to exclude
    if exclude_node_ids:
        nodes_to_exclude = ContentNode.objects.filter(pk__in=exclude_node_ids).get_descendants(include_self=True)
        files_to_transfer = files_to_transfer.exclude(files__contentnode__in=nodes_to_exclude)

    # Make sure the files are unique, to avoid duplicating downloads
    files_to_transfer = files_to_transfer.distinct()

    # calculate the total file sizes across all files being returned in the queryset
    total_bytes_to_transfer = files_to_transfer.aggregate(Sum('file_size'))['file_size__sum'] or 0

    return files_to_transfer, total_bytes_to_transfer
