from django.core.management import call_command
from django.test import TransactionTestCase
from le_utils.constants import content_kinds

from kolibri.core.content.models import ContentNode
from kolibri.core.content.models import File
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.channels import CHANNEL_UPDATE_STATS_CACHE_KEY
from kolibri.core.content.utils.content_types_tools import renderable_files_presets
from kolibri.core.content.utils.importability_annotation import (
    get_channel_annotation_stats,
)
from kolibri.core.utils.cache import process_cache

test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
file_id_2 = "e00699f859624e0f875ac6fe1e13d648"


class ImportabilityStats(TransactionTestCase):
    fixtures = ["content_test.json"]

    def test_all_files(self):
        File.objects.update(supplementary=False)
        checksums = list(LocalFile.objects.all().values_list("id", flat=True))
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(len(stats), 4)

    def test_all_files_available_no_files_remote(self):
        LocalFile.objects.update(available=True)
        File.objects.update(supplementary=False)
        checksums = []
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(len(stats), 4)

    def test_root_stats_count_every_importable_resource(self):
        File.objects.update(supplementary=False)
        checksums = list(LocalFile.objects.all().values_list("id", flat=True))
        root = ContentNode.objects.get(channel_id=test_channel_id, level=0)
        # Counted off the tree, not by a second rollup query, so that a rollup that
        # summed over all children or lost its correlation cannot agree with it.
        expected = (
            root.get_descendants()
            .exclude(kind=content_kinds.TOPIC)
            .filter(
                files__supplementary=False, files__preset__in=renderable_files_presets
            )
            .distinct()
            .count()
        )
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(expected, stats[root.id]["total_resources"])

    def test_the_projection_is_rolled_back(self):
        File.objects.update(supplementary=False)
        checksums = list(LocalFile.objects.all().values_list("id", flat=True))
        before = self._annotation_columns()
        get_channel_annotation_stats(test_channel_id, checksums)
        self.assertEqual(before, self._annotation_columns())

    def test_new_resources_are_flagged_on_the_root(self):
        File.objects.update(supplementary=False)
        checksums = list(LocalFile.objects.all().values_list("id", flat=True))
        root = ContentNode.objects.get(channel_id=test_channel_id, level=0)
        # A leaf the projection will call available, so that it reaches the stats dict.
        new_ids = list(
            root.get_descendants()
            .exclude(kind=content_kinds.TOPIC)
            .filter(
                files__supplementary=False, files__preset__in=renderable_files_presets
            )
            .distinct()
            .values_list("id", flat=True)[:1]
        )
        key = CHANNEL_UPDATE_STATS_CACHE_KEY.format(test_channel_id)
        process_cache.set(
            key, {"new_resource_ids": new_ids, "updated_resource_ids": new_ids}, None
        )
        self.addCleanup(process_cache.delete, key)
        before = self._annotation_columns()
        stats = get_channel_annotation_stats(test_channel_id, checksums)
        self.assertTrue(stats[root.id]["new_resource"])
        self.assertEqual(1, stats[root.id]["num_new_resources"])
        self.assertTrue(stats[new_ids[0]]["updated_resource"])
        # This block sets every node in the channel unavailable before measuring.
        self.assertEqual(before, self._annotation_columns())

    def _annotation_columns(self):
        return list(
            ContentNode.objects.order_by("id").values_list(
                "id",
                "available",
                "coach_content",
                "num_coach_contents",
                "on_device_resources",
            )
        )

    def tearDown(self):
        call_command("flush", interactive=False)
        super().tearDown()
