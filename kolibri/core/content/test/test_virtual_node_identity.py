import uuid as uuid_module

from django.test import SimpleTestCase

from kolibri.core.content.utils.virtual_nodes import virtual_content_id
from kolibri.core.content.utils.virtual_nodes import virtual_node_id

_VECTOR_ROOT_ID = "000102030405060708090a0b0c0d0e0f"
_VECTOR_PATH = "A/Albert_Einstein"
# Shared with packages/kolibri/utils/__tests__/virtualNodeId.spec.js (uuid v5).
_VECTOR_NODE_ID = "b3e2475bf80f5e7a9a5d7c1cd0770c8b"


class VirtualNodeIdTestCase(SimpleTestCase):
    def test_matches_shared_vector(self):
        self.assertEqual(
            virtual_node_id(_VECTOR_ROOT_ID, _VECTOR_PATH), _VECTOR_NODE_ID
        )

    def test_is_uuid5_of_root_id_and_path(self):
        self.assertEqual(
            virtual_node_id(_VECTOR_ROOT_ID, _VECTOR_PATH),
            uuid_module.uuid5(uuid_module.UUID(_VECTOR_ROOT_ID), _VECTOR_PATH).hex,
        )

    def test_differs_by_path(self):
        self.assertNotEqual(
            virtual_node_id(_VECTOR_ROOT_ID, "A/One"),
            virtual_node_id(_VECTOR_ROOT_ID, "A/Two"),
        )

    def test_differs_by_root_id(self):
        self.assertNotEqual(
            virtual_node_id("00112233445566778899aabbccddeeff", _VECTOR_PATH),
            virtual_node_id("ffeeddccbbaa99887766554433221100", _VECTOR_PATH),
        )


class VirtualContentIdTestCase(SimpleTestCase):
    _ROOT_CONTENT_ID = "abcabcabcabcabcabcabcabcabcabcab"

    def test_is_uuid5_of_root_content_id_and_path(self):
        self.assertEqual(
            virtual_content_id(self._ROOT_CONTENT_ID, "A/Index"),
            uuid_module.uuid5(uuid_module.UUID(self._ROOT_CONTENT_ID), "A/Index").hex,
        )

    def test_differs_by_path(self):
        a = virtual_content_id(self._ROOT_CONTENT_ID, "A/One")
        b = virtual_content_id(self._ROOT_CONTENT_ID, "A/Two")
        self.assertNotEqual(a, b)

    def test_stable_across_roots_sharing_a_content_id(self):
        other_root_same_content = self._ROOT_CONTENT_ID
        self.assertEqual(
            virtual_content_id(self._ROOT_CONTENT_ID, "A/Index"),
            virtual_content_id(other_root_same_content, "A/Index"),
        )
