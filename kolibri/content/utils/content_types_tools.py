from django.db.models import Q
from le_utils.constants import content_kinds

from kolibri.content.hooks import ContentRendererHook

# Regardless of which renderers are installed, we can render topics!
renderable_contentnodes_q_filter = Q(kind=content_kinds.TOPIC)

# loop through all the registered content renderer hooks
for hook in ContentRendererHook().registered_hooks:
    for obj in hook.content_types['kinds']:
        # iterate through each of the content types that each hook can handle
        for extension in obj['extensions']:
            # Extend the q filter by ORing with a q filter for this content kind, and this file extension
            renderable_contentnodes_q_filter |= Q(kind=obj['name'], files__local_file__extension=extension)
