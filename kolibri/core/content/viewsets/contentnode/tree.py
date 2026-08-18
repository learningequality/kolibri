from collections import defaultdict
from uuid import UUID

from django.core.exceptions import ValidationError
from django.db.models import Q
from django.http import Http404
from django.utils.decorators import method_decorator
from rest_framework import status
from rest_framework.response import Response

from kolibri.core.api import BaseValuesViewset
from kolibri.core.content.utils.cache import public_metadata_cache
from kolibri.core.content.utils.cache import remote_metadata_cache

from ..remote import RemoteMixin
from .base import filter_public_channel_nodes
from .base import InternalContentNodeMixin

# The max recursed page size should be less than 25 for a couple of reasons:
# 1. At this size the query appears to be relatively performant, and will deliver most of the tree
#    data to the frontend in a single query.
# 2. In the case where the tree topology means that this will not produce the full query, the limit of
#    25 immediate children and 25 grand children means that we are at most using 1 + 25 + 25 * 25 = 651
#    SQL parameters in the query to get the nodes for serialization - this means that we should not ever
#    run into an issue where we hit a SQL parameters limit in the queries in here.
# If we find that this page size is too high, we should lower it, but for the reasons noted above, we
# should not raise it.
NUM_CHILDREN = 12
NUM_GRANDCHILDREN_PER_CHILD = 12


class TreeQueryMixin:
    def validate_and_return_params(self, request):
        depth = request.query_params.get("depth", 2)
        # Named next__gt, not lft__gt: lft__gt is a contentnode_filter_fields
        # entry, so the filterset would consume the cursor as a filter.
        next__gt = request.query_params.get("next__gt")

        try:
            depth = int(depth)
            if 1 > depth or depth > 2:
                raise ValueError
        except ValueError:
            raise ValidationError("Depth query parameter must have the value 1 or 2")

        if next__gt is not None:
            try:
                next__gt = int(next__gt)
                if 1 > next__gt:
                    raise ValueError
            except ValueError:
                raise ValidationError(
                    "next__gt query parameter must be a positive integer if specified"
                )

        return depth, next__gt

    def _get_gc_by_parent(self, qs, child_ids):
        # Use this to keep track of how many grand children we have accumulated per child of the parent node
        gc_by_parent = defaultdict(list)
        # Iterate through the grand children of the parent node in lft order so we follow the tree traversal order
        for gc in (
            qs.filter(parent_id__in=child_ids).values("id", "parent_id").order_by("lft")
        ):
            gc_by_parent.setdefault(gc["parent_id"], []).append(gc["id"])
        return gc_by_parent

    def get_grandchild_ids(self, qs, child_ids, depth, page_size):
        grandchild_ids = []
        if depth == 2:
            # Use this to keep track of how many grand children we have accumulated per child of the parent node
            gc_by_parent = self._get_gc_by_parent(qs, child_ids)
            singletons = []
            # Now loop through each of the child_ids we passed in
            # that have any children, check if any of them have only one
            # child, and also add up to the page size to the list of
            # grandchild_ids.
            for child_id in gc_by_parent:
                gc_ids = gc_by_parent[child_id]
                if len(gc_ids) == 1:
                    singletons.append(gc_ids[0])
                # Only add up to the page size to the list
                grandchild_ids.extend(gc_ids[:page_size])
            if singletons:
                grandchild_ids.extend(
                    self.get_grandchild_ids(qs, singletons, depth, page_size)
                )
        return grandchild_ids

    def get_child_ids(self, qs, parent_id, next__gt):
        # Get a list of child_ids of the parent node up to the pagination limit
        child_qs = qs.filter(parent_id=parent_id)
        if next__gt is not None:
            child_qs = child_qs.filter(lft__gt=next__gt)
        return child_qs.values_list("id", flat=True).order_by("lft")[0:NUM_CHILDREN]

    def get_tree_queryset(self, request, pk):
        base_qs = self.filter_queryset(self.get_queryset())
        # Check that the parent node exists - we do this so that we trigger a 404 immediately if the node
        # does not exist (or exists but is not available, or is filtered).
        try:
            if not pk or not base_qs.filter(id=pk).exists():
                raise Http404
        except ValueError:
            raise Http404

        depth, next__gt = self.validate_and_return_params(request)

        child_ids = self.get_child_ids(base_qs, pk, next__gt)

        ancestor_ids = []
        while next__gt is None and len(child_ids) == 1:
            ancestor_ids.extend(child_ids)
            child_ids = self.get_child_ids(base_qs, child_ids[0], next__gt)

        gc_ids = self.get_grandchild_ids(
            base_qs, child_ids, depth, NUM_GRANDCHILDREN_PER_CHILD
        )

        return base_qs.filter(
            Q(id=pk) | Q(id__in=ancestor_ids) | Q(id__in=child_ids) | Q(id__in=gc_ids)
        )


class BaseContentNodeTreeViewset(
    InternalContentNodeMixin, TreeQueryMixin, BaseValuesViewset
):
    def retrieve(self, request, pk=None):
        """
        A nested, paginated representation of the children and grandchildren of a specific node

        GET parameters on request can be:
        depth - a value of either 1 or 2 indicating the depth to recurse the tree, either 1 or 2 levels
        if this parameter is missing it will default to 2.
        next__gt - a value to return child nodes with a lft value greater than this, if missing defaults to None

        The pagination object returned for "children" will have this form:
        results - a list of serialized children, that can also have their own nested children attribute.
        more - a dictionary or None, if a dictionary, will have an id key that is the id of the parent object
        for these children, and a params key that is a dictionary of the required query parameters to query more
        children for this parent - at a minimum this will include next__gt and depth, but may also include
        other query parameters for filtering content nodes.

        The "more" property describes the "id" required to do URL reversal on this endpoint, and the params that should
        be passed as query parameters to get the next set of results for pagination.

        :param request: request object
        :param pk: id parent node
        :return: an object representing the parent with a pagination object as "children"
        """

        queryset = self.get_tree_queryset(request, pk)

        # We explicitly order by lft here, so that the nodes are in tree traversal order, so we can iterate over them and build
        # out our nested representation, being sure that any ancestors have already been processed.
        nodes = self.serialize(queryset.order_by("lft"))

        # The serialized parent representation is the first node in the lft order
        parent = nodes[0]

        # Use this to keep track of descendants of the parent node
        # this will allow us to do lookups for any further descendants, in order
        # to insert them into the "children" property
        descendants_by_id = {}

        # Iterate through all the descendants that we have serialized
        for desc in nodes[1:]:
            # Add them to the descendants_by_id map so that
            # descendants can reference them later
            descendants_by_id[desc["id"]] = desc
            # First check to see whether it is a direct child of the
            # parent node that we initially queried
            if desc["parent"] == pk:
                # The parent of this descendant is the parent node
                # for this query
                desc_parent = parent
                # When we request more results for pagination, we want to return
                # both nodes at this level, and the nodes at the lower level
                more_depth = 2
                # For the parent node the page size is the maximum number of children
                # we are returning (regardless of whether they have a full representation)
                page_size = NUM_CHILDREN
            elif desc["parent"] in descendants_by_id:
                # Otherwise, check to see if our descendant's parent is in the
                # descendants_by_id map - if it failed the first condition,
                # it really should not fail this
                desc_parent = descendants_by_id[desc["parent"]]
                # When we request more results for pagination, we only want to return
                # nodes at this level, and not any of its children
                more_depth = 1
                # For a child node, the page size is the maximum number of grandchildren
                # per node that we are returning if it is a recursed node
                page_size = NUM_GRANDCHILDREN_PER_CHILD
            else:
                # If we get to here, we have a node that is not in the tree subsection we are
                # trying to return, so we just ignore it. This shouldn't happen.
                continue
            if "children" not in desc_parent:
                # If the parent of the descendant does not already have its `children` property
                # initialized, do so here.
                desc_parent["children"] = {"results": [], "more": None}
            # Add this descendant to the results for the children pagination object
            desc_parent["children"]["results"].append(desc)
            # Only bother updating the URL for more if we have hit the page size limit
            # otherwise it will just continue to be None
            if len(desc_parent["children"]["results"]) == page_size:
                # Any subsequent queries to get siblings of this node can restrict themselves
                # to looking for nodes with lft greater than the rght value of this descendant
                next__gt = desc["rght"]
                # If the rght value of this descendant is exactly 1 less than the rght value of
                # its parent, then there are no more children that can be queried.
                # So only in this instance do we update the more URL
                if desc["rght"] + 1 < desc_parent["rght"]:
                    params = request.query_params.copy()
                    params["next__gt"] = next__gt
                    params["depth"] = more_depth
                    desc_parent["children"]["more"] = {
                        "id": desc_parent["id"],
                        "params": params,
                    }
        return Response(parent)


@method_decorator(remote_metadata_cache, name="dispatch")
class ContentNodeTreeViewset(BaseContentNodeTreeViewset, RemoteMixin):
    def retrieve(self, request, pk=None):
        if pk is None:
            raise Http404

        try:
            UUID(pk)
        except ValueError:
            return Response(
                {"error": "Invalid UUID format."}, status=status.HTTP_400_BAD_REQUEST
            )

        if self._should_proxy_request(request):
            try:
                queryset = self.get_tree_queryset(request, pk)
                # Used in the update method for remote request retrieval
                self.locally_admin_imported_ids = set(
                    queryset.filter(admin_imported=True).values_list("id", flat=True)
                )
            except Http404:
                # Used in the update method for remote request retrieval
                self.locally_admin_imported_ids = set()
            return self._hande_proxied_request(request)
        return super().retrieve(request, pk=pk)


@method_decorator(public_metadata_cache, name="dispatch")
class PublicContentNodeTreeViewSet(BaseContentNodeTreeViewset):
    def get_queryset(self):
        return filter_public_channel_nodes(super().get_queryset())
