import logging
import os

from django.utils.encoding import force_text
from le_utils.constants import content_kinds
from whoosh.fields import BOOLEAN
from whoosh.fields import ID
from whoosh.fields import KEYWORD
from whoosh.fields import SchemaClass
from whoosh.fields import TEXT
from whoosh.filedb.filestore import FileStorage
from whoosh.filedb.filestore import RamStorage

from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import ContentTag
from kolibri.core.tasks.main import connection
from kolibri.core.utils.whoosh_postgres import PostgresStorage
from kolibri.core.utils.whoosh_redis import RedisStorage
from kolibri.utils.conf import KOLIBRI_HOME
from kolibri.utils.conf import OPTIONS


logger = logging.getLogger(__name__)


class ContentNodeSchema(SchemaClass):
    id = ID(stored=True, unique=True)
    channel = ID(stored=True)
    title = TEXT(field_boost=2.0)
    description = TEXT
    tags = KEYWORD(stored=True, commas=True)
    contains_quiz = BOOLEAN


content_namespace = "contentindex"


if (
    OPTIONS["Search"]["SEARCH_BACKEND"] == "postgres"
    and OPTIONS["Database"]["DATABASE_ENGINE"] == "postgres"
):
    storage = PostgresStorage(connection, content_namespace)
elif OPTIONS["Search"]["SEARCH_BACKEND"] == "redis":
    import redis

    r = redis.Redis(host="localhost", port=6379, db=1)
    storage = RedisStorage(r, content_namespace)
elif OPTIONS["Search"]["SEARCH_BACKEND"] == "ram":
    storage = RamStorage()
else:
    if OPTIONS["Search"]["SEARCH_BACKEND"] == "postgres":
        logger.warn(
            "Selected postgres search backend but postgres is not configured as the database backend"
        )
    storage = FileStorage(os.path.join(KOLIBRI_HOME, content_namespace))

storage.create()

if storage.index_exists("contentnode"):
    contentnode_index = storage.open_index(
        indexname="contentnode", schema=ContentNodeSchema
    )
else:
    contentnode_index = storage.create_index(ContentNodeSchema, indexname="contentnode")


def contains_quiz(obj, channel_quizzes):
    if obj["options"].get("modality") == "QUIZ":
        return True
    if obj["kind"] == content_kinds.TOPIC:
        return any(
            filter(
                lambda x: x["lft"] > obj["lft"] and x["rght"] < obj["rght"],
                channel_quizzes,
            )
        )
    return False


def get_writer():
    w = contentnode_index.writer(limitmb=256)
    return w


def index_channel(channel_id, writer=None):
    commit = False
    if writer is None:
        writer = get_writer()
        commit = True
    writer.delete_by_term("channel", channel_id)
    queryset = ContentNode.objects.filter(available=True, channel_id=channel_id)
    tags_map = {}

    for t in (
        ContentTag.objects.filter(tagged_content__in=queryset)
        .values(
            "tag_name",
            "tagged_content",
        )
        .order_by("tag_name")
    ):
        if t["tagged_content"] not in tags_map:
            tags_map[t["tagged_content"]] = [t["tag_name"]]
        else:
            tags_map[t["tagged_content"]].append(t["tag_name"])

    nodes = queryset.values(
        "id", "kind", "title", "description", "options", "lft", "rght"
    )

    channel_quizzes = nodes.filter(options__contains='"modality": "QUIZ"')

    for node in nodes:
        node_contains_quiz = contains_quiz(node, channel_quizzes)
        writer.add_document(
            id=force_text(node["id"]),
            channel=force_text(channel_id),
            title=node["title"],
            description=node["description"],
            tags=",".join(tags_map.get(node["id"], [])),
            contains_quiz=node_contains_quiz,
        )

    for node_id in ContentNode.objects.filter(
        available=False, channel_id=channel_id
    ).values_list("id", flat=True):
        writer.delete_by_term("id", node_id)

    if commit:
        writer.commit()


def index_contentnodes():
    writer = get_writer()
    for channel_id in ChannelMetadata.objects.all().values_list("id", flat=True):
        index_channel(channel_id, writer=writer)
    writer.commit()
