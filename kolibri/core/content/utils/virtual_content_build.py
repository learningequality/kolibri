import logging

from django.db import router
from django.db import transaction

from kolibri.core.content.hooks import ContentNodeEnumeratorHook
from kolibri.core.content.hooks import VirtualRootUnreadable
from kolibri.core.content.models import VirtualContentNode
from kolibri.core.content.models import VirtualContentRoot
from kolibri.core.content.utils.virtual_nodes import virtual_node_id

logger = logging.getLogger(__name__)

BATCH_SIZE = 5000

TITLE_MAX_LENGTH = VirtualContentNode._meta.get_field("title").max_length


def _using():
    return router.db_for_write(VirtualContentNode)


def _rebuild_root(hook, channel_id, root_id, local_file_id):
    with transaction.atomic(using=_using()):
        VirtualContentNode.objects.filter(root_id=root_id).delete()
        batch = []
        for entry in hook.enumerate_virtual_nodes(root_id, local_file_id):
            batch.append(
                VirtualContentNode(
                    id=virtual_node_id(root_id, entry["path"]),
                    root_id=root_id,
                    channel_id=channel_id,
                    title=entry["title"][:TITLE_MAX_LENGTH],
                    kind=entry["kind"],
                    options=entry["options"],
                )
            )
            if len(batch) >= BATCH_SIZE:
                VirtualContentNode.objects.bulk_create(batch, batch_size=BATCH_SIZE)
                batch = []
        if batch:
            VirtualContentNode.objects.bulk_create(batch, batch_size=BATCH_SIZE)
        VirtualContentRoot.objects.update_or_create(
            root_id=root_id,
            defaults={"channel_id": channel_id, "local_file_id": local_file_id},
        )


def build_virtual_contentnodes(channel_id):
    current = {}
    for hook in ContentNodeEnumeratorHook.registered_hooks:
        for root_id, local_file_id in hook.virtual_roots(channel_id).items():
            current[root_id] = (hook, local_file_id)
    built = dict(
        VirtualContentRoot.objects.filter(channel_id=channel_id).values_list(
            "root_id", "local_file_id"
        )
    )
    removed = set(built) - set(current)
    if removed:
        delete_virtual_contentnodes(channel_id, root_ids=removed)
    for root_id, (hook, local_file_id) in current.items():
        if built.get(root_id) != local_file_id:
            try:
                _rebuild_root(hook, channel_id, root_id, local_file_id)
            except VirtualRootUnreadable:
                logger.warning("Skipping virtual root %s", root_id, exc_info=True)
                delete_virtual_contentnodes(channel_id, root_ids=[root_id])


def delete_virtual_contentnodes(channel_id, root_ids=None):
    nodes = VirtualContentNode.objects.filter(channel_id=channel_id)
    roots = VirtualContentRoot.objects.filter(channel_id=channel_id)
    if root_ids is not None:
        nodes = nodes.filter(root_id__in=root_ids)
        roots = roots.filter(root_id__in=root_ids)
    with transaction.atomic(using=_using()):
        nodes.delete()
        roots.delete()
