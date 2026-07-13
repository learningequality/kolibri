import uuid

from django.test import TestCase
from le_utils.constants import content_kinds

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.content_types_tools import (
    renderable_contentnodes_q_filter,
)
from kolibri.core.content.utils.content_types_tools import (
    renderable_files_contentnode_ids,
)
from kolibri.core.content.utils.content_types_tools import renderable_preset_bits
from kolibri.core.content.utils.content_types_tools import RENDERABLE_PRESETS_ORDER


class RenderableFilterTestCase(TestCase):
    """
    Exercise the included_presets bitmask subset test independently of which
    content renderers happen to be installed, by passing explicit masks to
    renderable_files_contentnode_ids.
    """

    @classmethod
    def setUpTestData(cls):
        cls.channel_id = uuid.uuid4().hex
        cls.qti = renderable_preset_bits["qti"]
        cls.exercise = renderable_preset_bits["exercise"]

    def _node(self, kind=content_kinds.EXERCISE):
        return ContentNode.objects.create(
            id=uuid.uuid4().hex,
            content_id=uuid.uuid4().hex,
            channel_id=self.channel_id,
            kind=kind,
            title="node",
            available=True,
        )

    def _file(self, node, included_presets, preset="qti"):
        local_file = LocalFile.objects.create(
            id=uuid.uuid4().hex,
            file_size=100,
            extension="qti",
            available=True,
        )
        return File.objects.create(
            id=uuid.uuid4().hex,
            local_file=local_file,
            contentnode=node,
            supplementary=False,
            thumbnail=False,
            preset=preset,
            included_presets=included_presets,
        )

    def _ids(self, mask):
        return {row["contentnode"] for row in renderable_files_contentnode_ids(mask)}

    def test_mixed_all_of_a_files_presets(self):
        node = self._node()
        self._file(node, self.qti | self.exercise)
        self.assertIn(node.id, self._ids(self.qti | self.exercise))
        self.assertNotIn(node.id, self._ids(self.qti))

    def test_dual_publish_any_file(self):
        node = self._node()
        self._file(node, self.qti, preset="qti")
        self._file(node, self.exercise, preset="exercise")
        self.assertIn(node.id, self._ids(self.qti))
        self.assertIn(node.id, self._ids(self.exercise))

    def test_single_preset_parity(self):
        node = self._node()
        self._file(node, self.qti)
        self.assertIn(node.id, self._ids(self.qti))
        self.assertNotIn(node.id, self._ids(self.exercise))

    def test_null_never_renders(self):
        node = self._node()
        self._file(node, None)
        full_mask = 2 ** len(RENDERABLE_PRESETS_ORDER) - 1
        self.assertNotIn(node.id, self._ids(full_mask))
        self.assertNotIn(node.id, self._ids(self.qti))

    def test_unknown_preset_bit_gated_out(self):
        node = self._node()
        # A bit beyond this Kolibri's known preset width — as if imported from a
        # channel published with a newer, longer RENDERABLE_PRESETS_ORDER.
        self._file(node, 2 ** len(RENDERABLE_PRESETS_ORDER))
        full_mask = 2 ** len(RENDERABLE_PRESETS_ORDER) - 1
        self.assertNotIn(node.id, self._ids(full_mask))

    def test_topic_always_renders(self):
        topic = self._node(kind=content_kinds.TOPIC)
        self.assertIn(
            topic.id,
            set(
                ContentNode.objects.filter(
                    renderable_contentnodes_q_filter
                ).values_list("id", flat=True)
            ),
        )
