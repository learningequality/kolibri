import copy

from le_utils.constants import content_kinds

from kolibri.core.content import models
from kolibri.core.content.utils.virtual_nodes import virtual_content_id

_SYNTHESIZED_NODE_DEFAULTS = {
    "author": "",
    "available": True,
    "coach_content": False,
    "description": "",
    "license_description": None,
    "license_name": None,
    "license_owner": None,
    "num_coach_contents": 0,
    "on_device_resources": 0,
    "options": {},
    "sort_order": None,
    "lft": None,
    "rght": None,
    "tree_id": None,
    "learning_activities": [],
    "grade_levels": [],
    "resource_types": [],
    "accessibility_labels": [],
    "learner_needs": [],
    "categories": [],
    "duration": None,
    "ancestors": [],
    "modality": None,
    "admin_imported": False,
    "lang": None,
    "assessmentmetadata": None,
    "tags": [],
    "files": [],
    "thumbnail": None,
}


def synthesize_content_node(node):
    result = copy.deepcopy(_SYNTHESIZED_NODE_DEFAULTS)
    result.update(node)
    result["is_leaf"] = result.get("kind") != content_kinds.TOPIC
    result["virtual"] = True
    return result


_INHERITED_ROOT_FIELDS = (
    "accessibility_labels",
    "admin_imported",
    "author",
    "available",
    "categories",
    "channel_id",
    "coach_content",
    "files",
    "grade_levels",
    "lang",
    "learner_needs",
    "license_description",
    "license_name",
    "license_owner",
    "thumbnail",
)


def _virtual_rows(node_ids):
    try:
        return list(models.VirtualContentNode.objects.filter(id__inline_in=node_ids))
    except ValueError:
        # morango's UUIDField raises ValueError on a malformed id.
        return []


def _admitted(rows, root_channels):
    return [row for row in rows if root_channels.get(row.root_id) == row.channel_id]


def admitted_node_ids(node_ids, pool, include_virtual=True):
    real = set(
        pool.filter_by_uuids(node_ids, validate=False).values_list("id", flat=True)
    )
    virtual = (
        set(admitted_virtual_ids([i for i in node_ids if i not in real], pool))
        if include_virtual
        else set()
    )
    return [i for i in node_ids if i in real or i in virtual]


def admitted_virtual_ids(node_ids, roots):
    rows = _virtual_rows(node_ids)
    if not rows:
        return []
    root_channels = dict(
        roots.filter(id__inline_in={row.root_id for row in rows}).values_list(
            "id", "channel_id"
        )
    )
    admitted = {row.id for row in _admitted(rows, root_channels)}
    return [i for i in node_ids if i in admitted]


def resolve_virtual_nodes(viewset, node_ids, roots=None):
    if roots is None:
        roots = models.ContentNode.objects.all()
    rows = _virtual_rows(node_ids)
    if not rows:
        return {}
    serialized_roots = {
        root["id"]: root
        for root in viewset.serialize(
            roots.filter(id__inline_in={row.root_id for row in rows})
        )
    }
    root_channels = {
        root_id: root["channel_id"] for root_id, root in serialized_roots.items()
    }
    result = {}
    for row in _admitted(rows, root_channels):
        root = serialized_roots[row.root_id]
        node = {
            field: copy.deepcopy(root[field])
            for field in _INHERITED_ROOT_FIELDS
            if field in root
        }
        node.update(
            {
                "id": row.id,
                "content_id": virtual_content_id(
                    root["content_id"], row.options["entry"]
                ),
                "parent": root["id"],
                "root_id": root["id"],
                "ancestors": [
                    *root["ancestors"],
                    {"id": root["id"], "title": root["title"]},
                ],
                "title": row.title,
                "kind": row.kind,
                "options": row.options,
            }
        )
        result[row.id] = synthesize_content_node(node)
    return result
