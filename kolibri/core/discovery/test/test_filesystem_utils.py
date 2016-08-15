from __future__ import absolute_import, print_function, unicode_literals

from django.test import TestCase
from mock import patch
import ntpath
import os
import posixpath
import sys

from .dummydata import windows_data, osx_data, linux_data

from ..utils.filesystem.base import enumerate_mounted_disk_partitions, EXPORT_FOLDER_NAME

def _get_mocked_popen(cmd_resp):

    class MockedPopen(object):

        def __init__(self, cmd, *args, **kwargs):
            if cmd not in cmd_resp:
                raise Exception("subprocess.Popen called for an unmocked command '{}'!".format(cmd))
            self.response = cmd_resp[cmd]

        def communicate(self):  # to handle subprocess.Popen().communicate()
            return self.response.encode(), None

        def read(self):  # to handle os.popen().read()
            return self.response

    return MockedPopen

def _get_mocked_disk_usage(disk_sizes):

    def mock_disk_usage(path):

        if path not in disk_sizes:
            raise Exception("Disk usage not mocked for path '{}'!".format(path))

        sizes = disk_sizes[path]

        class MockDiskSizes(object):
            f_bsize = 2
            f_blocks = sizes["total"] / 2
            f_bavail = sizes["free"] / 2
            total = sizes["total"]
            free = sizes["free"]
            used = sizes["used"]

        return MockDiskSizes()

    return mock_disk_usage

class patch_popen(object):

    def __init__(self, cmd_resp):
        self.mocked_popen = _get_mocked_popen(cmd_resp)

    def __call__(self, f):
        f = patch("subprocess.Popen", self.mocked_popen)(f)
        f = patch("os.popen", self.mocked_popen)(f)
        return f

class patch_disk_usage(object):

    def __init__(self, disk_sizes):
        self.mocked_disk_usage = _get_mocked_disk_usage(disk_sizes)

    def __call__(self, f):
        if sys.version_info >= (3, 3):
            return patch("shutil.disk_usage", self.mocked_disk_usage)(f)
        else:
            return patch("os.statvfs", self.mocked_disk_usage)(f)

def patch_os_access(readable, writable):

    def wrapper(f):

        def check_os_access(path, flag):

            if flag == os.R_OK:
                lookup = readable
            elif flag == os.W_OK:
                lookup = writable

            if path not in lookup:
                raise Exception("os.access() called for an unmocked path '{}'!".format(path))

            return lookup[path]

        return patch("os.access", check_os_access)(f)

    return wrapper

def patch_os_path_exists_for_kolibri_folder(folder_lookup):

    def wrapper(f):

        def check_os_path_exists(path):

            if not path.endswith(EXPORT_FOLDER_NAME):
                raise Exception("Checking os.path.exists only mocked for kolibri data folder paths.")

            base_path = os.path.realpath(os.path.join(path, ".."))

            if base_path not in folder_lookup:
                raise Exception("os.path.exists() called for an unmocked path '{}'!".format(path))

            return folder_lookup[base_path]

        return patch("os.path.exists", check_os_path_exists)(f)

    return wrapper


class WindowsFilesystemTestCase(TestCase):
    """
    Test retrieval and parsing of disk info for Windows, using mocked command output.
    """

    @patch_popen(windows_data.popen_responses)
    @patch_os_access(windows_data.os_access_read, windows_data.os_access_write)
    @patch_os_path_exists_for_kolibri_folder(windows_data.has_kolibri_data_folder)
    @patch("sys.platform", "win32")
    @patch("os.path", ntpath)
    def setUp(self):
        self.drives = enumerate_mounted_disk_partitions()

    def test_drive_list_members(self):
        self.assertSetEqual(set(drive.path for drive in self.drives.values()), set(["C:\\", "D:\\"]))

    def test_drive_writability(self):
        self.assertTrue(self.drives["C:\\"].writable)
        self.assertFalse(self.drives["D:\\"].writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.drives["C:\\"].datafolder, None)
        self.assertEqual(self.drives["D:\\"].datafolder, "D:\\" + EXPORT_FOLDER_NAME)

    def test_drive_space(self):
        self.assertEqual(self.drives["C:\\"].freespace, 133134696448)
        self.assertEqual(self.drives["C:\\"].totalspace, 136251727872)
        self.assertEqual(self.drives["D:\\"].freespace, 0)
        self.assertEqual(self.drives["D:\\"].totalspace, 58388480)

    def test_drive_names(self):
        self.assertEqual(self.drives["C:\\"].name, 'Local Fixed Disk')
        self.assertEqual(self.drives["D:\\"].name, 'VBOXADDITIONS_4.')


class LinuxFilesystemTestCase(TestCase):
    """
    Test retrieval and parsing of disk info for Linux, using mocked command output.
    """

    @patch_popen(linux_data.popen_responses)
    @patch_os_access(linux_data.os_access_read, linux_data.os_access_write)
    @patch_os_path_exists_for_kolibri_folder(linux_data.has_kolibri_data_folder)
    @patch_disk_usage(linux_data.disk_sizes)
    @patch("sys.platform", "linux2")
    @patch("os.path", posixpath)
    def setUp(self):
        self.drives = enumerate_mounted_disk_partitions()

    def test_drive_list_members(self):
        self.assertSetEqual(set(drive.path for drive in self.drives.values()), set(['/media/user/F571-7814', '/', '/media/user/disk']))

    def test_drive_writability(self):
        self.assertTrue(self.drives["/"].writable)
        self.assertTrue(self.drives["/media/user/F571-7814"].writable)
        self.assertFalse(self.drives["/media/user/disk"].writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.drives["/"].datafolder, None)
        self.assertEqual(self.drives["/media/user/F571-7814"].datafolder, "/media/user/F571-7814/" + EXPORT_FOLDER_NAME)
        self.assertEqual(self.drives["/media/user/disk"].datafolder, None)

    def test_drive_space(self):
        self.assertEqual(self.drives["/media/user/F571-7814"].freespace, 772001792)
        self.assertEqual(self.drives["/media/user/F571-7814"].totalspace, 2142232576)
        self.assertEqual(self.drives["/"].freespace, 12704473088)
        self.assertEqual(self.drives["/"].totalspace, 117579513856)
        self.assertEqual(self.drives["/media/user/disk"].freespace, 11328000)
        self.assertEqual(self.drives["/media/user/disk"].totalspace, 31801344)


class OSXFilesystemTestCase(TestCase):
    """
    Test retrieval and parsing of disk info for OSX, using mocked command output.
    """

    @patch_popen(osx_data.popen_responses)
    @patch_os_access(osx_data.os_access_read, osx_data.os_access_write)
    @patch_os_path_exists_for_kolibri_folder(osx_data.has_kolibri_data_folder)
    @patch_disk_usage(osx_data.disk_sizes)
    @patch("sys.platform", "darwin")
    @patch("os.path", posixpath)
    def setUp(self):
        self.drives = enumerate_mounted_disk_partitions()

    def test_drive_list_members(self):
        self.assertSetEqual(set(drive.path for drive in self.drives.values()), set(['/Volumes/HP v125w', '/']))

    def test_drive_writability(self):
        self.assertFalse(self.drives["/"].writable)
        self.assertTrue(self.drives["/Volumes/HP v125w"].writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.drives["/"].datafolder, None)
        self.assertEqual(self.drives["/Volumes/HP v125w"].datafolder, "/Volumes/HP v125w/" + EXPORT_FOLDER_NAME)

    def test_drive_space(self):
        self.assertEqual(self.drives["/Volumes/HP v125w"].freespace, 1234)
        self.assertEqual(self.drives["/Volumes/HP v125w"].totalspace, 45678)
        self.assertEqual(self.drives["/"].freespace, 0)
        self.assertEqual(self.drives["/"].totalspace, 1000)

    def test_drive_names(self):
        self.assertEqual(self.drives["/Volumes/HP v125w"].name, 'Untitled 1')
        self.assertEqual(self.drives["/"].name, 'Macintosh HD')
