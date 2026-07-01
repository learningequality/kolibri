from django.test import TestCase
from le_utils.constants import content_kinds

from kolibri.core.content.models import VirtualContentNode
from kolibri.deployment.default.sqlite_db_names import VIRTUAL_CONTENTNODE


class VirtualContentNodeModelTestCase(TestCase):
    databases = "__all__"

    def test_round_trips_by_id(self):
        node_id = "b3e2475bf80f5e7a9a5d7c1cd0770c8b"
        VirtualContentNode.objects.create(
            id=node_id,
            root_id="000102030405060708090a0b0c0d0e0f",
            channel_id="ffeeddccbbaa99887766554433221100",
            title="Albert Einstein",
            kind=content_kinds.DOCUMENT,
            options={"entry": "A/Albert_Einstein"},
        )
        row = VirtualContentNode.objects.get(id=node_id)
        self.assertEqual(row.options["entry"], "A/Albert_Einstein")
        self.assertEqual(row.title, "Albert Einstein")

    def test_routed_to_its_own_db(self):
        self.assertEqual(VirtualContentNode.objects.db, VIRTUAL_CONTENTNODE)
