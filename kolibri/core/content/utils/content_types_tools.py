from django.db.models import Q
from le_utils.constants import content_kinds

from kolibri.core.content.hooks import ContentRendererHook

# Start with an empty Q object, as we'll be using OR to add conditions
renderable_contentnodes_without_topics_q_filter = Q()

renderable_files_q_filter = Q()

renderable_files_presets = set()

# loop through all the registered content renderer hooks
for hook in ContentRendererHook.registered_hooks:
    for preset in hook.presets:
        # iterate through each of the content presets that each hook can handle
        # Extend the q filter by ORing with a q filter for this preset
        renderable_contentnodes_without_topics_q_filter |= Q(files__preset=preset)
        renderable_files_q_filter |= Q(preset=preset)
        renderable_files_presets.add(preset)

# Regardless of which renderers are installed, we can render topics!
renderable_contentnodes_q_filter = (
    Q(kind=content_kinds.TOPIC) | renderable_contentnodes_without_topics_q_filter
)
