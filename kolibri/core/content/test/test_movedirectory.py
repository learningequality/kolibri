import os
import sys

from django.core.management import call_command
from django.test import TestCase
from mock import patch

from kolibri.utils.conf import OPTIONS

path_prefix = "C:\\" if sys.platform == "win32" else "/"

success_path = os.path.join(path_prefix, "test", "success")

no_content_path = os.path.join(path_prefix, "test", "content_exists_no")

yes_content_path = os.path.join(path_prefix, "test", "content_exists_yes")

random_content_path = os.path.join(path_prefix, "test", "content_exists_random")


@patch("kolibri.core.content.management.commands.content.update_options_file")
class ContentMoveDirectoryTestCase(TestCase):
    """
    Testcase for the command kolibri manage content movedirectory <destination>
    """

    # Helper methods
    def _path_exists_side_effect(*args):
        if args[0] == OPTIONS["Paths"]["CONTENT_DIR"]:
            return True
        elif args[0].startswith(success_path):
            return False
        return True

    def _listdir_side_effect(*args):
        if args[0] == os.path.join(OPTIONS["Paths"]["CONTENT_DIR"], "databases"):
            return ["test.sqlite3"]
        elif args[0] == os.path.join(OPTIONS["Paths"]["CONTENT_DIR"], "storage"):
            return ["test.mp3"]
        elif args[0] == os.path.join(no_content_path, "databases"):
            return ["exists.sqlite3"]
        return []

    @patch("kolibri.core.content.management.commands.content.Command.migrate")
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=False,
    )
    def test_current_content_dir_dne(self, path_exists_mock, migrate_mock, update_mock):
        with self.assertRaises(SystemExit):
            call_command("content", "movedirectory", "test")
            migrate_mock.assert_not_called()
            update_mock.assert_not_called()

    @patch("kolibri.core.content.management.commands.content.Command.migrate")
    @patch("kolibri.utils.server.get_status", return_value=True)
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=True,
    )
    def test_migrate_while_kolibri_running(
        self, path_exists_mock, server_mock, migrate_mock, update_mock
    ):
        with self.assertRaises(SystemExit):
            call_command("content", "movedirectory", "test")
            migrate_mock.assert_not_called()
            update_mock.assert_not_called()

    @patch("kolibri.core.content.management.commands.content.shutil.rmtree")
    @patch("kolibri.core.content.management.commands.content.shutil.copy2")
    @patch("kolibri.core.content.management.commands.content.input", return_value="no")
    @patch(
        "kolibri.core.content.management.commands.content.os.listdir",
        side_effect=_listdir_side_effect,
    )
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=True,
    )
    def test_migrate_while_dest_content_exists_no(
        self,
        path_exists_mock,
        listdir_mock,
        input_mock,
        copyfile_mock,
        remove_mock,
        update_mock,
    ):
        destination = no_content_path
        call_command("content", "movedirectory", destination)
        self.assertEqual(copyfile_mock.call_count, 2)
        self.assertEqual(remove_mock.call_count, 2)

    @patch("kolibri.core.content.management.commands.content.Command.copy_content")
    @patch("kolibri.core.content.management.commands.content.shutil.rmtree")
    @patch("kolibri.core.content.management.commands.content.input", return_value="yes")
    @patch(
        "kolibri.core.content.management.commands.content.os.listdir",
        return_value=["test"],
    )
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=True,
    )
    def test_migrate_while_dest_content_exists_yes(
        self,
        path_exists_mock,
        listdir_mock,
        input_mock,
        remove_mock,
        copy_mock,
        update_mock,
    ):
        destination = yes_content_path
        call_command("content", "movedirectory", destination)
        copy_mock.assert_called()
        self.assertEqual(remove_mock.call_count, 4)

    @patch(
        "kolibri.core.content.management.commands.content.Command.update_config_content_directory"
    )
    @patch(
        "kolibri.core.content.management.commands.content.input", return_value="random"
    )
    @patch(
        "kolibri.core.content.management.commands.content.os.listdir",
        return_value=["test"],
    )
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=True,
    )
    def test_migrate_while_dest_content_exists_random(
        self,
        path_exists_mock,
        listdir_mock,
        input_mock,
        update_mock,
        update_options_mock,
    ):
        destination = "/test/content_exists_random"
        with self.assertRaises(SystemExit):
            call_command("content", "movedirectory", destination)
            update_mock.assert_not_called()

    @patch("kolibri.core.content.management.commands.content.shutil.rmtree")
    @patch("kolibri.core.content.management.commands.content.shutil.copystat")
    @patch("kolibri.core.content.management.commands.content.os.makedirs")
    @patch(
        "kolibri.core.content.management.commands.content.os.listdir", return_value=[]
    )
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        side_effect=_path_exists_side_effect,
    )
    def test_migrate_while_dest_dir_dne_success(
        self,
        path_exists_mock,
        listdir_mock,
        mkdir_mock,
        copystat_mock,
        remove_mock,
        update_mock,
    ):
        destination = success_path
        call_command("content", "movedirectory", destination)
        remove_mock.assert_called()
        mkdir_mock.assert_called()
        copystat_mock.assert_called()

    @patch("kolibri.core.content.management.commands.content.Command.migrate")
    @patch(
        "kolibri.core.content.management.commands.content.os.path.exists",
        return_value=True,
    )
    def test_current_dir_equals_destination(
        self, path_exists_mock, migrate_mock, update_mock
    ):
        with self.assertRaises(SystemExit):
            call_command("content", "movedirectory", OPTIONS["Paths"]["CONTENT_DIR"])
            migrate_mock.assert_not_called()
