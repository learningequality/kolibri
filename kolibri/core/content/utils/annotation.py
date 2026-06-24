import datetime
import logging
import operator
import os
from functools import reduce
from itertools import groupby
from math import ceil

from django.db import connection
from django.db import transaction
from django.db.models import BooleanField
from django.db.models import Case
from django.db.models import Count
from django.db.models import Exists
from django.db.models import IntegerField
from django.db.models import Max
from django.db.models import Min
from django.db.models import OuterRef
from django.db.models import Q
from django.db.models import Subquery
from django.db.models import Sum
from django.db.models import Value
from django.db.models import When
from django.db.models.functions import Cast
from le_utils.constants import content_kinds
from le_utils.constants import modalities

from kolibri.core.content.apps import KolibriContentConfig
from kolibri.core.content.errors import InvalidStorageFilenameError
from kolibri.core.content.models import ChannelMetadata
from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_db import content_db
from kolibri.core.content.utils.search import get_all_contentnode_label_metadata
from kolibri.core.content.utils.tree import get_channel_node_depth
from kolibri.core.courses.models import CourseSession
from kolibri.core.device.models import ContentCacheKey
from kolibri.core.utils.lock import db_lock

from .paths import get_content_file_name
from .paths import get_content_storage_file_path
from .paths import using_remote_storage

logger = logging.getLogger(__name__)

CONTENT_APP_NAME = KolibriContentConfig.label

CHUNKSIZE = 10000


def _generate_MPTT_descendants_queries(mptt_values):
    """
    This logic is modified from:
    https://github.com/django-mptt/django-mptt/blob/38d46c26ca362c471b097ab96a3616b9b20fb883/mptt/managers.py#L137
    in order to render the result as Q objects that we can use in other queries.
    """
    queries = []

    # Group the resultant mptt data by tree_id and parent_id,
    # this will allow us to consolidate contiguous siblings to reduce
    # the total number of constraints.
    # This logic is verbatim from Django MPTT.
    for group in groupby(
        mptt_values,
        key=lambda n: (
            # tree id
            n[0],
            # parent id
            n[1],
        ),
    ):
        next_lft = None
        for node in list(group[1]):
            tree = node[0]
            lft = min_val = node[2]
            rght = max_val = node[3]

            if next_lft is None:
                next_lft = rght + 1
                min_max = {"min": min_val, "max": max_val}
            elif lft == next_lft:
                if min_val < min_max["min"]:
                    min_max["min"] = min_val
                if max_val > min_max["max"]:
                    min_max["max"] = max_val
                next_lft = rght + 1
            elif lft != next_lft:
                queries.append(
                    Q(
                        tree_id=tree,
                        lft__gte=min_max["min"],
                        rght__lte=min_max["max"],
                    )
                )
                min_max = {"min": min_val, "max": max_val}
                next_lft = rght + 1
        queries.append(
            Q(tree_id=tree, lft__gte=min_max["min"], rght__lte=min_max["max"])
        )
    return queries


def _MPTT_descendant_ids_queryset(channel_id, node_ids, min_boundary, max_boundary):
    """
    A queryset of the ids constrained by node_ids in this boundary range, or None
    when no constraint applies in this range at all.
    """
    # Setup list to collect queries
    or_queries = []

    # First we fetch a list of non-topic ids from the specified node ids
    # that match the specified tree boundary ranges
    non_topic_node_ids = list(
        ContentNode.objects.filter(
            channel_id=channel_id,
            # Also filter by the boundary conditions
            # We are only interested in non-topic nodes that
            # are inside the range
            rght__gte=min_boundary,
            rght__lte=max_boundary,
        )
        # Produce an id list for non topics
        .exclude(kind=content_kinds.TOPIC)
        .filter_by_uuids(node_ids)
        # MPTT's default ordering is a sort per batch that nothing here reads.
        .order_by()
        .values_list("id", flat=True)
    )

    # If we have any node ids that are for non-topics, then we add an explicit query
    # to match against those node ids
    if non_topic_node_ids:
        # The raw lookup rather than filter_by_uuids, because this has to OR with the
        # MPTT constraints below, and the mixin returns a queryset, not a Q.
        or_queries.append(Q(id__inline_in=non_topic_node_ids))

    # Now get the relevant MPTT values from the database for the specified node_ids
    # for topic nodes in the specified lft/rght range.
    # Query modified from:
    # https://github.com/django-mptt/django-mptt/blob/38d46c26ca362c471b097ab96a3616b9b20fb883/mptt/managers.py#L123
    mptt_values = (
        ContentNode.objects.filter(
            channel_id=channel_id,
            # Add constraints specific to our requirements, in terms of batching:
            # Also filter by the boundary conditions
            # We are only interested in nodes that are ancestors of
            # the nodes in the range, but they could be ancestors of any node
            # in this range, so we filter the lft value by being less than
            # or equal to the max_boundary, and the rght value by being
            # greater than or equal to the min_boundary.
            lft__lte=max_boundary,
            rght__gte=min_boundary,
            # And topics:
            # Only select values for descendant constraints from topics
            kind=content_kinds.TOPIC,
        )
        .filter_by_uuids(node_ids)
        .order_by("tree_id", "parent_id", "lft")
        .values_list("tree_id", "parent_id", "lft", "rght")
    )

    # Extend the constraints we are filtering by with ones generated from the relevant
    # MPTT values we have queried above.
    or_queries.extend(_generate_MPTT_descendants_queries(mptt_values))

    if not or_queries:
        return None

    # Return a queryset that ors each of the constraints
    return (
        ContentNode.objects.filter(reduce(operator.or_, or_queries))
        # Drop MPTT's default ordering from what becomes a subquery.
        .order_by()
        .values("id")
    )


def _batch_queryset(channel_id, min_boundary, max_boundary, node_ids, exclude_node_ids):
    # Restrict the queryset to nodes falling within the boundaries
    queryset = ContentNode.objects.filter(
        # Only update nodes in the channel we specified
        channel_id=channel_id,
        # Only select nodes inside the boundary conditions
        rght__gte=min_boundary,
        rght__lte=max_boundary,
    ).exclude(
        # Only update leaf nodes (non topics)
        kind=content_kinds.TOPIC
    )

    if node_ids is not None:
        # Restrict which nodes we update in this batch by the specified
        # inclusion constraints
        ids = _MPTT_descendant_ids_queryset(
            channel_id, node_ids, min_boundary, max_boundary
        )
        if ids is None:
            # Nothing can match an inclusion constraint that does not apply here.
            return queryset.none()
        queryset = queryset.filter(id__in=ids)

    if exclude_node_ids is not None:
        # Restrict which nodes we update in this batch by the specified
        # exclusion constraints
        ids = _MPTT_descendant_ids_queryset(
            channel_id, exclude_node_ids, min_boundary, max_boundary
        )
        # An exclusion constraint that does not apply here excludes nothing.
        if ids is not None:
            queryset = queryset.exclude(id__in=ids)

    return queryset


def _calculate_batch_params(channel_id, node_ids, exclude_node_ids):
    # To chunk the tree, we first find the full extent of the tree - this gives the
    # highest rght value for this channel.
    max_rght = ContentNode.objects.filter(channel_id=channel_id).aggregate(Max("rght"))[
        "rght__max"
    ]

    # Count the total number of constraints
    constraint_count = len(node_ids or []) + len(exclude_node_ids or [])

    # Aim for a constraint per batch count of about 250 on average
    # This means that there will be at most 750 parameters from the constraints
    # and should therefore also limit the overall SQL expression size.
    dynamic_chunksize = int(
        min(CHUNKSIZE, ceil(250 * max_rght / (constraint_count or 1)))
    )

    return max_rght, dynamic_chunksize


def set_leaf_nodes_invisible(
    channel_id, node_ids=None, exclude_node_ids=None, clear_admin_imported=False
):
    """
    Set nodes in a channel as unavailable.
    With no additional arguments, this will hide an entire channel.
    With the additional nodes arguments, it will selectively flag nodes
    as unavailable, based on the passed in ids, setting them as unavailable if
    they are in node_ids, or descendants of those nodes, but not in
    exclude_node_ids or descendants of those nodes.
    """
    # Start a counter for the while loop
    min_boundary = 1

    # Calculate batch parameters
    max_rght, dynamic_chunksize = _calculate_batch_params(
        channel_id, node_ids, exclude_node_ids
    )

    logger.info(
        "Removing availability of non-topic ContentNode objects in {} batches of {}".format(
            int(ceil(max_rght / dynamic_chunksize)), dynamic_chunksize
        )
    )

    values_dict = {
        "available": False,
    }

    if clear_admin_imported:
        values_dict["admin_imported"] = False

    # Deliberately not wrapped in a transaction: each batch commits on its own.
    while min_boundary < max_rght:
        _batch_queryset(
            channel_id,
            min_boundary,
            min_boundary + dynamic_chunksize,
            node_ids,
            exclude_node_ids,
        ).update(**values_dict)

        min_boundary += dynamic_chunksize


def set_leaf_node_availability_from_local_file_availability(
    channel_id, node_ids=None, exclude_node_ids=None, admin_imported=None
):
    """
    Set nodes in a channel as available, based on their required files.
    With no additional arguments, this will make every node in the channel
    available or unavailable based on whether the files needed to render
    those nodes are present on disk.
    With the additional nodes arguments, it will selectively flag nodes
    based on the passed in ids, marking their availability if
    they are in node_ids, or descendants of those nodes, but not in
    exclude_node_ids or descendants of those nodes.
    Nodes in the channel not captured by the constraints will not have
    their availability changed either way.
    """
    # Start a counter for the while loop
    min_boundary = 1

    # Calculate batch parameters
    max_rght, dynamic_chunksize = _calculate_batch_params(
        channel_id, node_ids, exclude_node_ids
    )

    logger.info(
        "Setting availability of non-topic ContentNode objects based on LocalFile availability in {} batches of {}".format(
            int(ceil(max_rght / dynamic_chunksize)), dynamic_chunksize
        )
    )

    values_dict = {
        "available": Exists(
            File.objects.filter(
                # Correlate between the contentnode id and the foreign key to the
                # content node on the file table, completing the many to many lookup
                contentnode=OuterRef("id"),
                # Only look at files that are required (not supplementary)
                supplementary=False,
                # And only LocalFile objects we know have associated files on disk
                local_file__available=True,
            )
        ),
    }

    if admin_imported is not None:
        # admin_imported OR coalesce(column, False), as one expression: Django 3.2
        # has no boolean OR expression, and F.__or__ is a bitwise | that PostgreSQL
        # rejects on booleans.
        values_dict["admin_imported"] = Case(
            When(admin_imported=True, then=Value(True)),
            default=Value(admin_imported),
            output_field=BooleanField(),
        )

    # Deliberately not wrapped in a transaction: each batch commits on its own.
    while min_boundary < max_rght:
        _batch_queryset(
            channel_id,
            min_boundary,
            min_boundary + dynamic_chunksize,
            node_ids,
            exclude_node_ids,
        ).update(**values_dict)

        min_boundary += dynamic_chunksize


def mark_local_files_as_unavailable(checksums, destination=None):
    mark_local_files_availability(checksums, False, destination=destination)


def mark_local_files_as_available(checksums, destination=None):
    """
    Shortcut method to update database if we are sure that the files are available.
    Can be used after successful downloads to flag availability without having to do expensive disk reads.
    """
    mark_local_files_availability(checksums, True, destination=destination)


def mark_local_files_availability(checksums, availability, destination=None):
    if checksums:
        logger.info(
            "Setting availability to {availability} of {number} LocalFile objects based on passed in checksums".format(
                number=len(checksums), availability=availability
            )
        )

        with content_db(destination) as alias:
            with transaction.atomic(using=alias):
                for i in range(0, len(checksums), CHUNKSIZE):
                    LocalFile.objects.using(alias).filter_by_checksums(
                        checksums[i : i + CHUNKSIZE]
                    ).update(available=availability)


def _check_file_availability(files):
    checksums_to_set_available = []
    checksums_to_set_unavailable = []
    for file in files:
        try:
            # Update if the file exists, *and* the localfile is set as unavailable.
            if using_remote_storage() or os.path.exists(
                get_content_storage_file_path(
                    get_content_file_name({"id": file[0], "extension": file[2]})
                )
            ):
                if not file[1]:
                    checksums_to_set_available.append(file[0])
            # Update if the file does not exist, *and* the localfile is set as available.
            else:
                if file[1]:
                    checksums_to_set_unavailable.append(file[0])
        except InvalidStorageFilenameError:
            continue

    return checksums_to_set_available, checksums_to_set_unavailable


def set_local_file_availability_from_disk(checksums=None, destination=None):
    if isinstance(checksums, list) and len(checksums) > CHUNKSIZE:
        for i in range(0, len(checksums), CHUNKSIZE):
            set_local_file_availability_from_disk(
                checksums=checksums[i : i + CHUNKSIZE], destination=destination
            )
        return

    with content_db(destination) as alias:
        queryset = LocalFile.objects.using(alias).all()

        if checksums is None:
            logger.info(
                "Setting availability of LocalFile objects based on disk availability"
            )
        elif isinstance(checksums, list):
            logger.info(
                "Setting availability of {number} LocalFile objects based on disk availability".format(
                    number=len(checksums)
                )
            )
            queryset = queryset.filter_by_checksums(checksums)
        else:
            logger.info(
                "Setting availability of LocalFile object with checksum {checksum} based on disk availability".format(
                    checksum=checksums
                )
            )
            queryset = queryset.filter(id=checksums)

        # _check_file_availability indexes these positionally.
        files = list(queryset.values_list("id", "available", "extension"))

    checksums_to_set_available, checksums_to_set_unavailable = _check_file_availability(
        files
    )

    # Outside the block above, so that only one connection to the destination file
    # is open at a time.
    mark_local_files_as_available(checksums_to_set_available, destination=destination)
    mark_local_files_as_unavailable(
        checksums_to_set_unavailable, destination=destination
    )


def _available_children():
    return ContentNode.objects.filter(parent=OuterRef("id"), available=True)


def has_available_children():
    """
    Correlated to the ContentNode being annotated, so only usable in a query
    against ContentNode.
    """
    return Exists(_available_children())


def available_children_rollup(aggregate):
    return Subquery(
        _available_children()
        # MPTT orders by lft, which would otherwise join the GROUP BY and make this
        # return one row per child instead of one per parent.
        .order_by()
        .values("parent")
        .annotate(value=aggregate)
        .values("value")
    )


def coach_content_aggregate():
    """
    An aggregate resolving True for a node whose available children are all coach
    content, and False otherwise.
    """
    if connection.vendor == "sqlite":
        # Use a min function to simulate an AND.
        return Min("coach_content")
    # Postgres rejects min() on a boolean, and has the AND aggregate directly.
    # Imported here so that psycopg2 stays optional: django.contrib.postgres.aggregates
    # imports it at module scope.
    from django.contrib.postgres.aggregates import BoolAnd

    return BoolAnd("coach_content")


def recurse_annotation_up_tree(channel_id):
    node_depth = get_channel_node_depth(channel_id)

    logger.info(
        "Annotating ContentNode objects with children for {levels} levels".format(
            levels=node_depth
        )
    )

    start = datetime.datetime.now()

    coach_content = coach_content_aggregate()

    with transaction.atomic():
        # Update all leaf ContentNodes to have num_coach_content to 1 or 0
        # Update all leaf ContentNodes to have on_device_resources to 1 or 0
        ContentNode.objects.filter(channel_id=channel_id).exclude(
            kind=content_kinds.TOPIC
        ).update(
            num_coach_contents=Cast("coach_content", IntegerField()),
            on_device_resources=Cast("available", IntegerField()),
        )

        # Before starting set availability to False on all topics.
        ContentNode.objects.filter(
            channel_id=channel_id, kind=content_kinds.TOPIC
        ).update(available=False, on_device_resources=0)

        # Go from the deepest level to the shallowest
        for level in range(node_depth, 0, -1):
            logger.info(
                "Annotating ContentNode objects with children for level {level}".format(
                    level=level
                )
            )
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

    elapsed = datetime.datetime.now() - start
    logger.debug(
        "Recursive topic tree annotation took {} seconds".format(elapsed.seconds)
    )


def calculate_dummy_progress_for_annotation(node_ids, exclude_node_ids, total_progress):
    num_annotation_constraints = len(node_ids or []) + len(exclude_node_ids or [])

    # Calculate a percentage of the total progress to denote to annotation
    # between 1 and 10
    annotation_proportion = min(10, max(1, int(num_annotation_constraints / 500)))

    # Create some progress proportional to annotation task
    return int(annotation_proportion * total_progress / (100 - annotation_proportion))


def propagate_forced_localfile_removal(localfiles_dict_list):
    total = len(localfiles_dict_list)
    i = 0
    # Even thought we are using the filter_by_uuids method below
    # which prevents too many SQL parameters from being passed in to the query
    # if we have too many UUIDs it is possible we might still generate too much SQL
    # and cause issues - so we batch the ids here.
    batch_size = 10000
    removed_nodes = []
    while i < total:
        file_slice = localfiles_dict_list[i : i + batch_size]
        files = File.objects.filter(
            supplementary=False,
            local_file__in=LocalFile.objects.filter_by_uuids(
                [f["id"] for f in file_slice]
            ),
        )
        removed_nodes += ContentNode.objects.filter(files__in=files).values_list(
            "id", flat=True
        )
        ContentNode.objects.filter(files__in=files).update(available=False)
        i += batch_size
    return removed_nodes


def reannotate_all_channels():
    for channel_id in ChannelMetadata.objects.all().values_list("id", flat=True):
        recurse_annotation_up_tree(channel_id)


def update_content_metadata(
    channel_id, node_ids=None, exclude_node_ids=None, public=None, admin_imported=None
):
    set_leaf_node_availability_from_local_file_availability(
        channel_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        admin_imported=admin_imported,
    )
    recurse_annotation_up_tree(channel_id)
    set_channel_metadata_fields(channel_id, public=public)
    ContentCacheKey.update_cache_key()
    # Do this call after refreshing the content cache key
    # as the caching is dependent on the key.
    get_all_contentnode_label_metadata()


def set_content_visibility(
    channel_id,
    checksums,
    node_ids=None,
    exclude_node_ids=None,
    public=None,
    admin_imported=None,
):
    mark_local_files_as_available(checksums)
    update_content_metadata(
        channel_id,
        node_ids=node_ids,
        exclude_node_ids=exclude_node_ids,
        public=public,
        admin_imported=admin_imported,
    )


def set_content_visibility_from_disk(channel_id):
    set_local_file_availability_from_disk()
    update_content_metadata(channel_id)


def set_content_invisible(channel_id, node_ids, exclude_node_ids, clear_admin_imported):
    set_leaf_nodes_invisible(
        channel_id,
        node_ids,
        exclude_node_ids,
        clear_admin_imported=clear_admin_imported,
    )
    recurse_annotation_up_tree(channel_id)
    set_channel_metadata_fields(channel_id)
    ContentCacheKey.update_cache_key()
    # Do this call after refreshing the content cache key
    # as the caching is dependent on the key.
    get_all_contentnode_label_metadata()


def set_channel_metadata_fields(channel_id, public=None, library=None, version=None):
    with db_lock():
        channel = ChannelMetadata.objects.get(id=channel_id)
        calculate_published_size(channel)
        calculate_total_resource_count(channel)
        calculate_included_languages(channel)
        calculate_ordered_categories(channel)
        calculate_ordered_grade_levels(channel)
        calculate_next_order(channel)

        if public is not None:
            channel.public = public
        if library is not None:
            channel.library = library
        if version is not None:
            channel.version = version
        if any(v is not None for v in (public, library, version)):
            channel.save()


def files_for_nodes(nodes):
    return LocalFile.objects.filter(files__contentnode__in=nodes)


def total_file_size(files_or_nodes):
    if issubclass(files_or_nodes.model, LocalFile):
        localfiles = files_or_nodes
    elif issubclass(files_or_nodes.model, ContentNode):
        localfiles = files_for_nodes(files_or_nodes)
    else:
        raise TypeError("Expected queryset for LocalFile or ContentNode")
    return localfiles.distinct().aggregate(Sum("file_size"))["file_size__sum"] or 0


def calculate_published_size(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.published_size = total_file_size(
        files_for_nodes(content_nodes).filter(available=True)
    )
    channel.save()


def calculate_total_resource_count(channel):
    content_nodes = ContentNode.objects.filter(channel_id=channel.id)
    channel.total_resource_count = (
        content_nodes.filter(available=True).exclude(kind=content_kinds.TOPIC).count()
    )
    channel.save()


def _calculate_ordered_field_values(channel, field_name):
    content_nodes = ContentNode.objects.filter(
        channel_id=channel.id, available=True
    ).exclude(**{field_name: None})
    all_values = []
    for node in content_nodes.values_list(field_name, flat=True):
        if node:  # just in case some field is an empty string
            all_values.extend(node.split(","))

    value_counts = {}
    for value in all_values:
        value_counts[value] = value_counts.get(value, 0) + 1

    return sorted(value_counts.keys(), key=lambda x: value_counts[x], reverse=True)


def calculate_ordered_categories(channel):
    ordered_categories = _calculate_ordered_field_values(channel, "categories")
    channel.included_categories = (
        ",".join(ordered_categories) if ordered_categories else None
    )
    channel.save()


def calculate_ordered_grade_levels(channel):
    ordered_grade_levels = _calculate_ordered_field_values(channel, "grade_levels")
    channel.included_grade_levels = (
        ",".join(ordered_grade_levels) if ordered_grade_levels else None
    )
    channel.save()


def calculate_included_languages(channel):
    content_nodes = ContentNode.objects.filter(
        channel_id=channel.id, available=True
    ).exclude(lang=None)
    languages = (
        content_nodes.values("lang")
        .annotate(count=Count("lang"))
        .order_by("-count")
        .values_list("lang", flat=True)
        .distinct()
    )
    channel.included_languages.clear()
    channel.included_languages.add(*list(languages))


def calculate_next_order(channel, model=ChannelMetadata):
    if channel.order is None or channel.order == 0:
        max_order = model.objects.aggregate(Max("order")).get("order__max", 0)
        if max_order is None:
            max_order = 0
        channel.order = max_order + 1

    channel.save()


# Builds a node's ancestors JSON out of its parent's, in SQL, to avoid loading the
# tree into Python: strip the closing ] off the parent's list, append the parent
# itself as a new element, and close the list again. A stripped list ending in '['
# was empty, so that element goes in without a separating comma.
_ANCESTORS_SQL = """
UPDATE {table} SET ancestors = (
    SELECT
        substr(parent.ancestors, 1, length(parent.ancestors) - 1)
        || CASE WHEN substr(parent.ancestors, length(parent.ancestors) - 1, 1) = '['
                THEN '{{"id": "'
                ELSE ',{{"id": "'
           END
        || {parent_id}
        || '","title": "'
        || replace(parent.title, '"', %s)
        || '"}}]'
    FROM {table} AS parent WHERE {table}.parent_id = parent.id
)
WHERE level = %s AND channel_id = %s
"""


def set_channel_ancestors(channel_id):
    node_depth = get_channel_node_depth(channel_id)

    table = ContentNode._meta.db_table
    if connection.vendor == "sqlite":
        parent_id = "{}.parent_id".format(table)
    else:
        # The column is a uuid on PostgreSQL, and the JSON needs the undashed hex.
        parent_id = "replace(cast({}.parent_id as varchar(36)), '-', '')".format(table)
    sql = _ANCESTORS_SQL.format(table=table, parent_id=parent_id)

    start = datetime.datetime.now()

    with transaction.atomic():
        ContentNode.objects.filter(level=0, channel_id=channel_id).update(ancestors=[])

        with connection.cursor() as cursor:
            # Go from the shallowest to deepest
            for level in range(1, node_depth + 1):
                # A backslash inside a SQL string literal is backend and
                # standard_conforming_strings dependent, so bind it rather than
                # inline it.
                cursor.execute(sql, ['\\"', level, channel_id])

    elapsed = datetime.datetime.now() - start
    logger.debug(
        "Recursive ancestor annotation took {} seconds".format(elapsed.seconds)
    )


def update_channel_version_to_assignments(channel):
    """
    Update assignments channel_version to trigger an update event on
    LOD devices when channel content is updated.
    """
    course_ids = ContentNode.objects.filter(
        channel_id=channel.id,
        modality=modalities.COURSE,
    ).values_list("id", flat=True)

    CourseSession.objects.filter(course__in=course_ids).update(
        channel_version=channel.version
    )
