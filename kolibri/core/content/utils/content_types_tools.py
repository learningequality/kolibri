from django.db.models import F
from django.db.models import Q
from le_utils.constants import content_kinds
from le_utils.constants.format_presets import RENDERABLE_PRESETS_ORDER

from kolibri.core.content.hooks import ContentRendererHook
from kolibri.core.content.models import File

# Every renderable preset's bit, keyed by preset. Used by the pre-V6 backfills.
renderable_preset_bits = {
    preset: 2**index for index, preset in enumerate(RENDERABLE_PRESETS_ORDER)
}

# Retained for the SQLAlchemy importability paths (unchanged behaviour).
renderable_files_presets = set()

available_presets_bitmask = 0

# loop through all the registered content renderer hooks
for hook in ContentRendererHook.registered_hooks:
    for preset in hook.presets:
        # iterate through each of the content presets that each hook can handle
        renderable_files_presets.add(preset)
        bit = renderable_preset_bits.get(preset)
        if bit is not None:
            available_presets_bitmask |= bit


def renderable_files_contentnode_ids(available_bitmask):
    """
    contentnode ids of files whose included_presets is a non-null subset of
    available_bitmask, i.e. every preset the file needs is locally renderable.
    """
    # Subset test: included_presets is a subset of available_bitmask iff
    # `included | available == available`. This is width-independent — a file
    # requiring a preset bit ABOVE this Kolibri's known-preset width (imported
    # from a channel published with a newer, longer RENDERABLE_PRESETS_ORDER)
    # is correctly gated out, because that high bit survives the OR and breaks
    # the equality. Do not rewrite as a width-limited complement mask
    # (`(2**len - 1) ^ available`): it cannot gate bits beyond its width.
    return (
        File.objects.filter(included_presets__isnull=False)
        .annotate(_available=F("included_presets").bitor(available_bitmask))
        .filter(_available=available_bitmask)
        .values("contentnode")
    )


renderable_contentnodes_without_topics_q_filter = Q(
    pk__in=renderable_files_contentnode_ids(available_presets_bitmask)
)

# Regardless of which renderers are installed, we can render topics!
renderable_contentnodes_q_filter = (
    Q(kind=content_kinds.TOPIC) | renderable_contentnodes_without_topics_q_filter
)
