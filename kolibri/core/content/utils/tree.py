from django.db.models import Max

from kolibri.core.content.models import ContentNode


def get_channel_node_depth(channel_id):
    node_depth = ContentNode.objects.filter(channel_id=channel_id).aggregate(
        Max("level")
    )["level__max"]
    # A channel with no nodes has no max level, and callers iterate range(depth, 0, -1).
    return 0 if node_depth is None else node_depth
