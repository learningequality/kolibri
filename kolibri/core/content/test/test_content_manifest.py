import tempfile

from django.test import TestCase
from le_utils.constants import content_kinds
from mock import patch

from kolibri.core.content.models import ContentNode
from kolibri.core.content.utils.content_manifest import ContentManifest
from kolibri.core.content.utils.content_manifest import ContentManifestParseError
from kolibri.core.content.utils.content_manifest import get_content_nodes_selectors
from kolibri.utils.tests.helpers import override_option


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class ContentManifestTestCase(TestCase):
    """
    Test case for utils.content_manifest.ContentManifest
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
    the_channel_version = 0
    the_channel_version_2 = 99

    c1_node_id = "32a941fb77c2576e8f6b294cde4c3b0c"
    c2_node_id = "2e8bac07947855369fe2d77642dfc870"
    c2c1_node_id = "2b6926ed22025518a8b9da91745b51d3"
    c2c2_node_id = "4d0c890de9b65d6880ccfa527800e0f4"

    def setUp(self):
        self.content_manifest = ContentManifest()

    def test_empty(self):
        self.assertCountEqual(self.content_manifest.get_channel_ids(), [])

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id), []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_add_content_nodes(self, get_content_nodes_selectors_mock):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_ids(), [self.the_channel_id]
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id),
            [self.the_channel_version],
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c1_node_id],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_add_content_nodes_multiple_times(self, get_content_nodes_selectors_mock):
        get_content_nodes_selectors_mock.return_value = [
            self.c2c1_node_id,
            self.c2c2_node_id,
        ]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c2c1_node_id, self.c2c2_node_id],
        )

        get_content_nodes_selectors_mock.return_value = [self.c2_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c2_node_id, self.c2c1_node_id, self.c2c2_node_id],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_add_content_nodes_with_different_versions(
        self, get_content_nodes_selectors_mock
    ):
        get_content_nodes_selectors_mock.return_value = [
            self.c2c1_node_id,
            self.c2c2_node_id,
        ]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c2c1_node_id, self.c2c2_node_id],
        )

        get_content_nodes_selectors_mock.return_value = [self.c2_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version_2, []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c2c1_node_id, self.c2c2_node_id],
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version_2
            ),
            [self.c2_node_id],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_add_content_nodes_with_duplicates(self, get_content_nodes_selectors_mock):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c1_node_id],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_add_content_nodes_from_existing_manifest(
        self, get_content_nodes_selectors_mock
    ):
        self.content_manifest.read_dict(
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    }
                ],
                "channel_list_hash": "dcba190e9d79f20e4fbcc3890fe9b4fd",
            }
        )

        get_content_nodes_selectors_mock.return_value = [self.c2_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertEqual(
            self.content_manifest.to_dict(),
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c2_node_id, self.c1_node_id],
                    }
                ],
                "channel_list_hash": "8adc9c51281efc80cfa02cc65a5d5417",
            },
        )

    def test_get_channel_ids_with_no_content_nodes(self):
        self.assertCountEqual(self.content_manifest.get_channel_ids(), [])

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_get_channel_ids_with_one_content_node(
        self, get_content_nodes_selectors_mock
    ):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_ids(), [self.the_channel_id]
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_get_channel_ids_with_two_content_nodes(
        self, get_content_nodes_selectors_mock
    ):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version_2, []
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_ids(), [self.the_channel_id]
        )

    def test_get_channel_versions_with_no_content_nodes(self):
        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id), []
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_get_channel_versions_with_one_content_node(
        self, get_content_nodes_selectors_mock
    ):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id),
            [self.the_channel_version],
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_get_channel_versions_with_two_content_nodes(
        self, get_content_nodes_selectors_mock
    ):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version_2, []
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id),
            [self.the_channel_version, self.the_channel_version_2],
        )

    def test_read_dict(self):
        self.content_manifest.read_dict(
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    }
                ],
                "channel_list_hash": "dcba190e9d79f20e4fbcc3890fe9b4fd",
            }
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c1_node_id],
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_ids(), [self.the_channel_id]
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id),
            [self.the_channel_version],
        )

    def test_read_dict_with_validation_valid(self):
        self.content_manifest.read_dict(
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    }
                ],
                "channel_list_hash": "dcba190e9d79f20e4fbcc3890fe9b4fd",
            },
            validate=True,
        )

    def test_read_dict_with_validation_invalid(self):
        with self.assertRaises(ContentManifestParseError):
            self.content_manifest.read_dict(
                {
                    "channels": [
                        {
                            "id": self.the_channel_id,
                            "version": self.the_channel_version,
                            "include_node_ids": [self.c1_node_id],
                        }
                    ],
                    "channel_list_hash": "ffffffffffffffffffffffffffffffff",
                },
                validate=True,
            )

    def test_read_dict_with_duplicate(self):
        self.content_manifest.read_dict(
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    },
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c2_node_id],
                    },
                ],
                "channel_list_hash": "be61f9920be4dd28e4793a55e670c471",
            }
        )

        self.assertCountEqual(
            self.content_manifest.get_include_node_ids(
                self.the_channel_id, self.the_channel_version
            ),
            [self.c1_node_id, self.c2_node_id],
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_ids(), [self.the_channel_id]
        )

        self.assertCountEqual(
            self.content_manifest.get_channel_versions(self.the_channel_id),
            [self.the_channel_version],
        )

    def test_to_dict_with_no_content_nodes(self):
        self.assertEqual(
            self.content_manifest.to_dict(),
            {"channels": [], "channel_list_hash": "d751713988987e9331980363e24189ce"},
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_to_dict_with_one_content_node(self, get_content_nodes_selectors_mock):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertEqual(
            self.content_manifest.to_dict(),
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    }
                ],
                "channel_list_hash": "dcba190e9d79f20e4fbcc3890fe9b4fd",
            },
        )

    @patch("kolibri.core.content.utils.content_manifest.get_content_nodes_selectors")
    def test_to_dict_with_two_channel_versions(self, get_content_nodes_selectors_mock):
        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version, []
        )

        get_content_nodes_selectors_mock.return_value = [self.c1_node_id]
        self.content_manifest.add_content_nodes(
            self.the_channel_id, self.the_channel_version_2, []
        )

        self.assertEqual(
            self.content_manifest.to_dict(),
            {
                "channels": [
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version,
                        "include_node_ids": [self.c1_node_id],
                    },
                    {
                        "id": self.the_channel_id,
                        "version": self.the_channel_version_2,
                        "include_node_ids": [self.c1_node_id],
                    },
                ],
                "channel_list_hash": "483fd506a3c55dbbcd7d2beb77833fce",
            },
        )


@override_option("Paths", "CONTENT_DIR", tempfile.mkdtemp())
class GetContentNodesSelectorsTestCase(TestCase):
    """
    Test case for utils.content_manifest.get_content_nodes_selectors
    """

    fixtures = ["content_test.json"]
    the_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
    the_channel_version = 0

    root_node_id = "da7ecc42e62553eebc8121242746e88a"
    c2_node_id = "2e8bac07947855369fe2d77642dfc870"
    c2c1_node_id = "2b6926ed22025518a8b9da91745b51d3"
    c2c2_node_id = "4d0c890de9b65d6880ccfa527800e0f4"
    c2c3_node_id = "b391bfeec8a458f89f013cf1ca9cf33a"
    c3_node_id = "c391bfeec8a458f89f013cf1ca9cf33b"
    c3copy_node_id = "c391bfeec8a458f89f013cf1ca9cf33b"

    def test_with_empty_selection(self):
        selectors = get_content_nodes_selectors(
            self.the_channel_id, self.the_channel_version, []
        )

        self.assertCountEqual(
            selectors,
            set(),
        )

    def test_with_complete_selection(self):
        selected_content_nodes = ContentNode.objects.filter(
            channel_id=self.the_channel_id
        ).exclude(kind=content_kinds.TOPIC)

        selectors = get_content_nodes_selectors(
            self.the_channel_id, self.the_channel_version, [selected_content_nodes]
        )

        self.assertCountEqual(
            selectors,
            {self.root_node_id},
        )

    def test_with_specific_leaf_nodes(self):
        selected_pks_list = [self.c2c1_node_id, self.c2c2_node_id]

        selected_content_nodes = ContentNode.objects.filter(
            channel_id=self.the_channel_id, pk__in=selected_pks_list
        ).exclude(kind=content_kinds.TOPIC)

        selectors = get_content_nodes_selectors(
            self.the_channel_id, self.the_channel_version, [selected_content_nodes]
        )

        self.assertCountEqual(
            selectors,
            {self.c2c1_node_id, self.c2c2_node_id},
        )

    def test_with_entire_topic_1(self):
        # Select all non-topic nodes that are descendents of "c2"
        selected_pks_list = [self.c2c1_node_id, self.c2c2_node_id, self.c2c3_node_id]

        selected_content_nodes = ContentNode.objects.filter(
            channel_id=self.the_channel_id, pk__in=selected_pks_list
        ).exclude(kind=content_kinds.TOPIC)

        selectors = get_content_nodes_selectors(
            self.the_channel_id, self.the_channel_version, [selected_content_nodes]
        )

        self.assertCountEqual(
            selectors,
            {self.c2_node_id},
        )
