from sqlalchemy import func
from sqlalchemy import select

from kolibri.core.content.models import ContentNode


def get_channel_node_depth(bridge, channel_id):

    ContentNodeTable = bridge.get_table(ContentNode)

    node_depth_query = select([func.max(ContentNodeTable.c.level)]).where(
        ContentNodeTable.c.channel_id == channel_id
    )

    node_depth = bridge.execute(node_depth_query).fetchone()

    if node_depth is not None:
        return node_depth[0]

    return 0
