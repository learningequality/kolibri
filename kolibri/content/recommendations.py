from collections import Counter

# from kolibri.logger.models import ContentInteractionLog
from kolibri.content import api
from kolibri.content.models import ContentNode

def recommendations_interaction_log():
    """
    Calculates the content that is accessed the most and returns a subset of that.

    :return: Queryset of the the most frequently accessed content
    """
    # logs = ContentInteractionLog.objects.filter(channel_id=channel_id).all()
    logs = ContentNode.objects.all()
    content_count = Counter()
    for log in logs:
        content_count[log.content_id] += 1
    content_count_sorted = sorted(content_count, key=content_count.get, reverse=True)
    return ContentNode.objects.filter(content_id__in=content_count_sorted[:10])  # return the 10 most frequently accessed pieces of content

def recommendations_content_node(content):
    """
    Uses api methods to return different types of related content.

    :param content: ContentNode or str
    :return: QuerySet consisting of related content.
    """
    children = api.children_of_kind(content=content, kind='topic')
    related = api.get_all_related(content=content)
    imm_children = api.immediate_children(content=content)
    data = children | related | imm_children  # concatenates different querysets
    return data
