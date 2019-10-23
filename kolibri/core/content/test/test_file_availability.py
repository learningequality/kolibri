import json
import os
import shutil
import tempfile
import uuid

from django.test import TransactionTestCase
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_disk,
)
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_remote,
)


def get_engine(connection_string):
    return django_connection_engine()


test_channel_id = "6199dde695db4ee4ab392222d5af1e5c"
file_id_1 = "6bdfea4a01830fdd4a585181c0b8068c"
file_id_2 = "e00699f859624e0f875ac6fe1e13d648"


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileByDisk(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(LocalFileByDisk, self).setUp()
        self.mock_home_dir = tempfile.mkdtemp()
        self.mock_storage_dir = os.path.join(self.mock_home_dir, "content", "storage")
        os.makedirs(self.mock_storage_dir)

    def createmock_content_file(self, prefix, suffix="mp4"):
        second_dir = os.path.join(self.mock_storage_dir, prefix[0], prefix[1])
        try:
            os.makedirs(second_dir)
        except OSError:
            pass
        open(os.path.join(second_dir, prefix + "." + suffix), "w+b")

    def createmock_content_file1(self):
        self.createmock_content_file(file_id_1, suffix="mp4")

    def createmock_content_file2(self):
        self.createmock_content_file(file_id_2, suffix="epub")

    def test_set_one_file_in_channel(self):
        self.createmock_content_file1()
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_home_dir
        )
        self.assertEqual(checksums, [file_id_1])

    def test_set_one_file_not_in_channel(self):
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_home_dir
        )
        self.assertEqual(checksums, [])

    def test_set_two_files_in_channel(self):
        self.createmock_content_file1()
        self.createmock_content_file2()
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_home_dir
        )
        self.assertEqual(set(checksums), set([file_id_1, file_id_2]))

    def test_set_two_files_one_in_channel(self):
        self.createmock_content_file1()
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_home_dir
        )
        self.assertEqual(checksums, [file_id_1])

    def test_set_two_files_none_in_channel(self):
        self.createmock_content_file(uuid.uuid4().hex)
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_home_dir
        )
        self.assertEqual(checksums, [])

    def tearDown(self):
        shutil.rmtree(self.mock_home_dir)
        super(LocalFileByDisk, self).tearDown()


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileRemote(TransactionTestCase):

    fixtures = ["content_test.json"]

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_one_file_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1])
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(checksums, [file_id_1])

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_one_file_not_in_channel(self, requests_mock):
        # This shouldn't happen unless something weird is happening on the other
        # end of the request, but make sure we behave anyway
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([uuid.uuid4().hex])
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(checksums, [])

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_two_files_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps([file_id_1, file_id_2])
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(set(checksums), set([file_id_1, file_id_2]))

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_two_files_one_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            [file_id_1, uuid.uuid4().hex]
        )
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(checksums, [file_id_1])

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_two_files_none_in_channel(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            [uuid.uuid4().hex, uuid.uuid4().hex]
        )
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(checksums, [])

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_404_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 404
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertIsNone(checksums)

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_invalid_json_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = "I am not a json, I am a free man!"
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertIsNone(checksums)

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_invalid_checksums_remote_checksum_response(self, requests_mock):
        requests_mock.get.return_value.status_code = 200
        requests_mock.get.return_value.content = json.dumps(
            ["I am not a checksum, I am a free man!", file_id_1 + ".mp4"]
        )
        checksums = get_available_checksums_from_remote(test_channel_id, "test")
        self.assertEqual(checksums, [])
