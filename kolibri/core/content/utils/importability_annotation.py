from django.db import transaction
from django.db.models import Exists
from django.db.models import IntegerField
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Sum
from django.db.models.functions import Cast
from le_utils.constants import content_kinds

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.utils.annotation import available_children_rollup
from kolibri.core.content.utils.annotation import coach_content_aggregate
from kolibri.core.content.utils.annotation import has_available_children
from kolibri.core.content.utils.channels import CHANNEL_UPDATE_STATS_CACHE_KEY
from kolibri.core.content.utils.content_types_tools import renderable_files_presets
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_disk,
)
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_remote,
)
from kolibri.core.content.utils.tree import get_channel_node_depth
from kolibri.core.mixins import checksums_q
from kolibri.core.utils.cache import process_cache


def _importable_resource_stats(channel_id, node_depth, files):
    """
    Annotate the channel as if every node with an importable file were available,
    and read the rollups back out.
    """
    coach_content = coach_content_aggregate()

    stats = {}

    with transaction.atomic():
        ContentNode.objects.filter(channel_id=channel_id).exclude(
            kind=content_kinds.TOPIC
        ).update(available=Exists(files))

        # Update all leaf ContentNodes to have num_coach_content to 1 or 0
        # Update all leaf ContentNodes to have on_device_resources to 1 or 0
        # A separate statement, because SET reads the pre-statement row: folded into
        # the update above, on_device_resources would cast the old availability.
        ContentNode.objects.filter(channel_id=channel_id).exclude(
            kind=content_kinds.TOPIC
        ).update(
            num_coach_contents=Cast("coach_content", IntegerField()),
            on_device_resources=Cast("available", IntegerField()),
        )

        # Before starting set availability to False on all topics.
        ContentNode.objects.filter(
            channel_id=channel_id, kind=content_kinds.TOPIC
        ).update(available=False)

        # Go from the deepest level to the shallowest
        for level in range(node_depth, 0, -1):
            # Only modify topic availability here
            ContentNode.objects.filter(
                level=level - 1, channel_id=channel_id, kind=content_kinds.TOPIC
            ).filter(
                # Because we have set availability to False on all topics as a starting
                # point we only need to make updates to topics with available children.
                has_available_children()
            ).update(
                available=has_available_children(),
                coach_content=available_children_rollup(coach_content),
                num_coach_contents=available_children_rollup(Sum("num_coach_contents")),
                on_device_resources=available_children_rollup(
                    Sum("on_device_resources")
                ),
            )

            level_stats = ContentNode.objects.filter(
                level=level, channel_id=channel_id, available=True
            ).values("id", "coach_content", "num_coach_contents", "on_device_resources")

            for node in level_stats:
                stats[node["id"]] = {
                    "coach_content": bool(node["coach_content"]),
                    "num_coach_contents": node["num_coach_contents"] or 0,
                    "total_resources": node["on_device_resources"] or 0,
                }

        root_node = (
            ContentNode.objects.filter(level=0, channel_id=channel_id)
            .values("id", "coach_content", "num_coach_contents", "on_device_resources")
            .first()
        )

        stats[root_node["id"]] = {
            "coach_content": root_node["coach_content"],
            "num_coach_contents": root_node["num_coach_contents"],
            "total_resources": root_node["on_device_resources"],
        }

        # The annotation above is a projection, not a change to persist.
        transaction.set_rollback(True)

    return stats


def _annotate_new_resources(channel_id, node_depth, new_resource_ids, stats):
    """
    Repeat the rollup counting only the new resources, and record the counts
    against the stats already collected for each node.
    """
    with transaction.atomic():
        # Here we are using the on_device_resources key to track 'newness'
        # set everything to false to start with.
        ContentNode.objects.filter(channel_id=channel_id).update(
            available=False, on_device_resources=0
        )

        batch_size = 1000

        for i in range(0, len(new_resource_ids), batch_size):
            ContentNode.objects.filter(channel_id=channel_id).filter_by_uuids(
                new_resource_ids[i : i + batch_size]
            ).update(available=True, on_device_resources=1)

        # Go from the deepest level to the shallowest
        for level in range(node_depth, 0, -1):
            # Only modify topic availability here
            ContentNode.objects.filter(
                level=level - 1, channel_id=channel_id, kind=content_kinds.TOPIC
            ).filter(
                # Because we have set availability to False on all topics as a
                # starting point we only need to make updates to topics with
                # available children.
                has_available_children()
            ).update(
                available=True,
                on_device_resources=available_children_rollup(
                    Sum("on_device_resources")
                ),
            )

            level_stats = ContentNode.objects.filter(
                level=level, channel_id=channel_id, available=True
            ).values_list("id", "on_device_resources")

            for node_id, num_new_resources in level_stats:
                if node_id in stats:
                    stats[node_id]["new_resource"] = True
                    stats[node_id]["num_new_resources"] = num_new_resources

        root_node_id = (
            ContentNode.objects.filter(level=0, channel_id=channel_id)
            .values_list("id", flat=True)
            .first()
        )

        # If there are any new resource ids then the root node has new resources
        if root_node_id in stats:
            stats[root_node_id]["new_resource"] = True
            stats[root_node_id]["num_new_resources"] = len(new_resource_ids)

        # The annotation above is a projection, not a change to persist.
        transaction.set_rollback(True)


def get_channel_annotation_stats(channel_id, checksums=None):
    files = File.objects.filter(
        contentnode=OuterRef("id"),
        supplementary=False,
        preset__in=renderable_files_presets,
    )
    if checksums is not None:
        files = files.filter(
            Q(local_file__available=True) | checksums_q("local_file_id", checksums)
        )

    node_depth = get_channel_node_depth(channel_id)

    stats = _importable_resource_stats(channel_id, node_depth, files)

    new_resource_stats = (
        process_cache.get(CHANNEL_UPDATE_STATS_CACHE_KEY.format(channel_id)) or {}
    )

    new_resource_ids = new_resource_stats.get("new_resource_ids")
    if new_resource_ids:
        _annotate_new_resources(channel_id, node_depth, new_resource_ids, stats)

    for key in new_resource_stats.get("updated_resource_ids") or ():
        if key in stats:
            stats[key]["updated_resource"] = True

    return stats


CHANNEL_STATS_CACHED_KEYS = "CHANNEL_STATS_CACHED_KEYS_{channel_id}"


# Used for tracking which keys are cached for which channel
# we can then clear these when necessary
def register_key_as_cached(key, channel_id):
    cached_keys = process_cache.get(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set()
    )
    cached_keys.add(key)
    process_cache.set(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), cached_keys, None
    )


def get_channel_stats_from_disk(channel_id, drive_id):
    CACHE_KEY = "DISK_CHANNEL_STATS_{drive_id}_{channel_id}".format(
        drive_id=drive_id, channel_id=channel_id
    )
    if CACHE_KEY not in process_cache:
        checksums = get_available_checksums_from_disk(channel_id, drive_id)
        channel_stats = get_channel_annotation_stats(channel_id, checksums)
        process_cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = process_cache.get(CACHE_KEY)
    return channel_stats


def get_channel_stats_from_peer(channel_id, peer_id):
    CACHE_KEY = "PEER_CHANNEL_STATS_{peer_id}_{channel_id}".format(
        peer_id=peer_id, channel_id=channel_id
    )
    if CACHE_KEY not in process_cache:
        checksums = get_available_checksums_from_remote(channel_id, peer_id)
        channel_stats = get_channel_annotation_stats(channel_id, checksums)
        process_cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = process_cache.get(CACHE_KEY)
    return channel_stats


def get_channel_stats_from_studio(channel_id):
    CACHE_KEY = "STUDIO_CHANNEL_STATS_{channel_id}".format(channel_id=channel_id)
    if CACHE_KEY not in process_cache:
        channel_stats = get_channel_annotation_stats(channel_id)
        process_cache.set(CACHE_KEY, channel_stats, 3600)
        register_key_as_cached(CACHE_KEY, channel_id)
    else:
        channel_stats = process_cache.get(CACHE_KEY)
    return channel_stats


def clear_channel_stats(channel_id):
    cached_keys = process_cache.get(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set()
    )
    for key in cached_keys:
        process_cache.delete(key)
    process_cache.set(
        CHANNEL_STATS_CACHED_KEYS.format(channel_id=channel_id), set(), None
    )
