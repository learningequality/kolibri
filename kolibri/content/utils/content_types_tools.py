from functools import reduce

from django.db.models import Q
from le_utils.constants import content_kinds

from kolibri.content.hooks import ContentRendererHook

content_types = []

for hook in ContentRendererHook().registered_hooks:
    for obj in hook.content_types['kinds']:
        kind = obj['name']
        for extension in obj['extensions']:
            content_types.append({
                "kind": kind,
                "extension": extension,
            })


renderable_contentnodes_q_filter = reduce(
    lambda acc, type: acc | Q(kind=type["kind"], files__local_file__extension=type["extension"]),
    content_types,
    Q(kind=content_kinds.TOPIC))

renderable_local_files_q_filter = reduce(
    lambda acc, type: acc | Q(files__contentnode__kind=type["kind"], extension=type["extension"]) |
    # Also include files marked as supplementary, otherwise we will only count the directly rendered files
    Q(files__contentnode__kind=type["kind"], files__supplementary=True),
    content_types,
    Q(files__contentnode__kind=content_kinds.TOPIC))
