import os
import shutil
import tempfile
import uuid
from collections import namedtuple

from django.test import TransactionTestCase
from mock import patch

from .sqlalchemytesting import django_connection_engine
from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_disk,
)
from kolibri.core.content.utils.file_availability import (
    get_available_checksums_from_remote,
)
from kolibri.core.discovery.models import NetworkLocation


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
        self.mock_drive_id = "123"

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

    @patch("kolibri.core.content.utils.file_availability.get_mounted_drive_by_id")
    def test_set_one_file_in_channel(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = DriveData(
            id=self.mock_drive_id, datafolder=self.mock_home_dir
        )
        self.createmock_content_file1()
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_drive_id
        )
        self.assertEqual(checksums, set([file_id_1]))

    @patch("kolibri.core.content.utils.file_availability.get_mounted_drive_by_id")
    def test_set_one_file_not_in_channel(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = DriveData(
            id=self.mock_drive_id, datafolder=self.mock_home_dir
        )
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_drive_id
        )
        self.assertEqual(checksums, set())

    @patch("kolibri.core.content.utils.file_availability.get_mounted_drive_by_id")
    def test_set_two_files_in_channel(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = DriveData(
            id=self.mock_drive_id, datafolder=self.mock_home_dir
        )
        self.createmock_content_file1()
        self.createmock_content_file2()
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_drive_id
        )
        self.assertEqual(checksums, set([file_id_1, file_id_2]))

    @patch("kolibri.core.content.utils.file_availability.get_mounted_drive_by_id")
    def test_set_two_files_one_in_channel(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = DriveData(
            id=self.mock_drive_id, datafolder=self.mock_home_dir
        )
        self.createmock_content_file1()
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_drive_id
        )
        self.assertEqual(checksums, set([file_id_1]))

    @patch("kolibri.core.content.utils.file_availability.get_mounted_drive_by_id")
    def test_set_two_files_none_in_channel(self, drive_mock):
        DriveData = namedtuple("DriveData", ["id", "datafolder"])
        drive_mock.return_value = DriveData(
            id=self.mock_drive_id, datafolder=self.mock_home_dir
        )
        self.createmock_content_file(uuid.uuid4().hex)
        self.createmock_content_file(uuid.uuid4().hex)
        checksums = get_available_checksums_from_disk(
            test_channel_id, self.mock_drive_id
        )
        self.assertEqual(checksums, set())

    def tearDown(self):
        shutil.rmtree(self.mock_home_dir)
        super(LocalFileByDisk, self).tearDown()


local_file_qs = LocalFile.objects.filter(
    files__contentnode__channel_id=test_channel_id, files__supplementary=False
).values_list("id", flat=True)


@patch("kolibri.core.content.utils.sqlalchemybridge.get_engine", new=get_engine)
class LocalFileRemote(TransactionTestCase):

    fixtures = ["content_test.json"]

    def setUp(self):
        super(LocalFileRemote, self).setUp()
        self.location = NetworkLocation.objects.create(base_url="test")

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_one_file(self, requests_mock):
        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = "1"
        checksums = get_available_checksums_from_remote(
            test_channel_id, self.location.id
        )
        self.assertEqual(len(checksums), 1)
        self.assertTrue(local_file_qs.filter(id=list(checksums)[0]).exists())

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_two_files_in_channel(self, requests_mock):
        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = "3"
        checksums = get_available_checksums_from_remote(
            test_channel_id, self.location.id
        )
        self.assertEqual(len(checksums), 2)
        self.assertTrue(local_file_qs.filter(id=list(checksums)[0]).exists())
        self.assertTrue(local_file_qs.filter(id=list(checksums)[1]).exists())

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_set_two_files_none_in_channel(self, requests_mock):
        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = "0"
        checksums = get_available_checksums_from_remote(
            test_channel_id, self.location.id
        )
        self.assertEqual(checksums, set())

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_404_remote_checksum_response(self, requests_mock):
        requests_mock.post.return_value.status_code = 404
        checksums = get_available_checksums_from_remote(
            test_channel_id, self.location.id
        )
        self.assertIsNone(checksums)

    @patch("kolibri.core.content.utils.file_availability.requests")
    def test_invalid_integer_remote_checksum_response(self, requests_mock):
        requests_mock.post.return_value.status_code = 200
        requests_mock.post.return_value.content = "I am not a json, I am a free man!"
        checksums = get_available_checksums_from_remote(
            test_channel_id, self.location.id
        )
        self.assertIsNone(checksums)
