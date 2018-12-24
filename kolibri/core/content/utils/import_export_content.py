from django.db.models import Sum
from le_utils.constants import content_kinds
from requests.exceptions import ConnectionError
from requests.exceptions import HTTPError
from requests.exceptions import Timeout
from requests.exceptions import ChunkedEncodingError

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import renderable_contentnodes_q_filter

try:
    import OpenSSL
    SSLERROR = OpenSSL.SSL.Error
except ImportError:
    import requests
    SSLERROR = requests.exceptions.SSLError

RETRY_STATUS_CODE = [502, 503, 504, 521, 522, 523, 524]


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


def _get_node_ids(node_ids):

    return ContentNode.objects \
        .filter(pk__in=node_ids) \
        .get_descendants(include_self=True) \
        .values_list('id', flat=True)


def get_num_coach_contents(contentnode, filter_available=True):
    """
    Given a ContentNode model, return the number of Coach Contents underneath it
    """
    if contentnode.coach_content:
        if contentnode.kind == content_kinds.TOPIC:
            queryset = contentnode.get_descendants().filter(coach_content=True)

            if filter_available:
                queryset = queryset.filter(available=True)

            return queryset \
                .exclude(kind=content_kinds.TOPIC) \
                .distinct() \
                .count()
        else:
            # if the content kind is not a topic but it is marked as coach content the total
            # coach content count has to be 1 since this is the last node in the tree
            return 1
    else:
        return 1 if contentnode.coach_content else 0


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

    skip_404 = kwargs.pop('skip_404')

    if (
            isinstance(e, ConnectionError) or
            isinstance(e, Timeout) or
            isinstance(e, ChunkedEncodingError) or
            (isinstance(e, HTTPError) and e.response.status_code in RETRY_STATUS_CODE) or
            (isinstance(e, SSLERROR) and 'decryption failed or bad record mac' in str(e))):
        return True

    elif (
            skip_404 and
            (
                (isinstance(e, HTTPError) and e.response.status_code == 404) or
                (isinstance(e, OSError) and e.errno == 2))):
        return False

    else:
        raise e
