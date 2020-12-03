import logging

import whoosh.fields as fields
import whoosh.index
from le_utils.constants import content_kinds

from . import converters

logger = logging.getLogger(__name__)

node_schema = fields.Schema(
    node_id=fields.ID(stored=True, field_boost=5.0),
    content_id=fields.ID(stored=True, field_boost=5.0),
    channel_id=fields.STORED(),
    parent_id=fields.STORED(),
    languages=fields.KEYWORD(lowercase=True, scorable=True, stored=True),
    title=fields.TEXT(stored=True, field_boost=1.5),
    description=fields.TEXT(stored=True),
    thumbnail=fields.STORED(),
    tags=fields.KEYWORD(lowercase=True, scorable=True, field_boost=1.5),
    content=fields.TEXT(stored=False),
)


class ChannelIndexer:
    def __init__(self, channel, index_root):
        index_name = "channel_{}".format(channel.id)
        self.channel = channel
        self.channel_index = whoosh.index.create_in(
            index_root, node_schema, indexname=index_name
        )

    def index_nodes(self, nodes):
        self.writer = self.channel_index.writer()
        # self.writer.add_document(channel_id=self.channel.id,
        #                          title=self.channel.name,
        #                          description=self.channel.description)
        logger.info("Indexing {}".format(self.channel.name))
        node_count = self.channel.root.get_descendant_count()
        counter = 0
        for node in nodes:
            counter += 1
            logger.info("Indexing {} of {} nodes.".format(counter, node_count))
            self.index_node(node)

        self.writer.commit()

    def index_node(self, node):
        content = ""
        if node.kind != content_kinds.TOPIC:
            if node.kind in [content_kinds.DOCUMENT, content_kinds.HTML5]:
                content = converters.get_text_for_files(node)
                if len(content) == 0:
                    logger.warning(
                        "No content for {}, {}".format(node.title, node.kind)
                    )
                else:
                    logger.info(
                        "Content added for {}, {}".format(node.title, node.kind)
                    )

        self.writer.add_document(
            node_id=node.id,
            channel_id=self.channel.id,
            content_id=node.content_id,
            parent_id=node.parent_id,
            title=node.title,
            description=node.description,
            tags=",".join(node.tags.values_list("tag_name", flat=True)),
            languages=",".join([node.lang_id]),
            content=content,
        )
