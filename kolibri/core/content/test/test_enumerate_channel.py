import os
import tempfile

from django.test import TestCase
from mock import patch

from kolibri.core.content.constants.schema_versions import V020BETA1
from kolibri.core.content.constants.schema_versions import VERSION_6
from kolibri.core.content.test.helpers import FrozenSchemaDBMixin
from kolibri.core.content.test.helpers import load_content_fixture_data
from kolibri.core.content.upgrade import import_external_content_dbs
from kolibri.core.content.utils.channels import get_channel_ids_for_content_database_dir
from kolibri.core.content.utils.channels import get_channels_for_data_folder
from kolibri.core.content.utils.channels import read_channel_metadata_from_db_file
from kolibri.core.content.utils.paths import get_content_database_dir_path


class EnumerateChannelTestCase(TestCase):
    """
    Testcase for enumerating channel database files to find if they are corrupted
    or have broken symbolic links.
    """

    def test_broken_symlink_database_file(self):
        src_dir = tempfile.mkdtemp()
        dst_dir = get_content_database_dir_path()
        src_db_file = os.path.join(src_dir, "6199dde695db4ee4ab392222d5af1e5c.sqlite3")
        dst_db_file = os.path.join(dst_dir, "6199dde695db4ee4ab392222d5af1e5c.sqlite3")
        # Make sure that both files do not exist before creating the symlink
        self.assertFalse(os.path.exists(src_db_file))
        self.assertFalse(os.path.exists(dst_db_file))
        os.symlink(src_db_file, dst_db_file)

        channel_ids = get_channel_ids_for_content_database_dir(dst_dir)
        self.assertNotIn("6199dde695db4ee4ab392222d5af1e5c", channel_ids)

    # Helper function
    def create_corrupted_database_file(self, db_dir):
        db_file = os.path.join(db_dir, "6199dde695db4ee4ab392222d5af1e5c.sqlite3")
        with open(db_file, "w") as f:
            f.write("test corrupted database file")
        return db_file

    @patch("kolibri.core.content.upgrade.update_num_coach_contents")
    @patch("kolibri.core.content.upgrade.logger.warning")
    def test_corrupted_database_file_server_start(
        self, logger_mock, coach_contents_mock
    ):
        db_file = self.create_corrupted_database_file(get_content_database_dir_path())
        import_external_content_dbs()
        message_list = [message[0][0] for message in logger_mock.call_args_list]
        error_message = "Tried to import channel 6199dde695db4ee4ab392222d5af1e5c, but database file was corrupted."
        self.assertIn(error_message, message_list)
        os.remove(db_file)  # Remove database file for future tests

    def test_corrupted_database_file_local_import(self):
        datafolder = tempfile.mkdtemp()
        db_file = self.create_corrupted_database_file(
            get_content_database_dir_path(datafolder)
        )
        channels = get_channels_for_data_folder(datafolder)

        # Make sure that the corrupted database file is not going to be listed
        self.assertNotIn("6199dde695db4ee4ab392222d5af1e5c", channels)
        os.remove(db_file)  # Remove database file for future tests


class ReadChannelMetadataTestCase(FrozenSchemaDBMixin, TestCase):
    def build_with_channel_row(self, schema_name):
        return (
            self.build(schema_name),
            load_content_fixture_data(schema_name)["content_channelmetadata"][0],
        )

    def test_reads_the_channel_row_and_the_inferred_version(self):
        db_path, channel = self.build_with_channel_row(VERSION_6)

        metadata = read_channel_metadata_from_db_file(db_path)

        self.assertEqual(channel["id"], metadata["id"])
        self.assertEqual(channel["name"], metadata["name"])
        self.assertEqual(channel["version"], metadata["version"])
        self.assertEqual(channel["root_id"], metadata["root_id"])
        self.assertEqual(VERSION_6, metadata["inferred_schema_version"])

    def test_back_fills_root_id_from_root_pk(self):
        db_path, channel = self.build_with_channel_row(V020BETA1)

        metadata = read_channel_metadata_from_db_file(db_path)

        self.assertEqual(V020BETA1, metadata["inferred_schema_version"])
        self.assertEqual(channel["root_pk"], metadata["root_id"])
