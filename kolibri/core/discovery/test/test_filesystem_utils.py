from __future__ import absolute_import
from __future__ import print_function
from __future__ import unicode_literals

import ntpath
import os
import posixpath
import sys

from django.test import TestCase
from mock import patch

from ..utils.filesystem import enumerate_mounted_disk_partitions
from ..utils.filesystem import EXPORT_FOLDER_NAME
from .dummydata import linux_data
from .dummydata import osx_data
from .dummydata import windows_data


def _get_mocked_popen(cmd_resp):
    class MockedPopen(object):
        def __init__(self, cmd, *args, **kwargs):
            if cmd not in cmd_resp:
                raise Exception(
                    "subprocess.Popen called for an unmocked command '{}'!".format(cmd)
                )
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
            f_frsize = 2
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
        return f


class patch_disk_usage(object):
    def __init__(self, disk_sizes):
        self.mocked_disk_usage = _get_mocked_disk_usage(disk_sizes)

    def __call__(self, f):
        if sys.version_info >= (3, 3):
            return patch("shutil.disk_usage", self.mocked_disk_usage)(f)
        return patch("os.statvfs", self.mocked_disk_usage)(f)


def patch_os_access(readable, writable):
    def wrapper(f):
        def check_os_access(path, flag):

            if flag == os.R_OK:
                lookup = readable
            elif flag == os.W_OK:
                lookup = writable

            if path not in lookup:
                raise Exception(
                    "os.access() called for an unmocked path '{}'!".format(path)
                )

            return lookup[path]

        return patch("os.access", check_os_access)(f)

    return wrapper


def patch_os_path_exists_for_kolibri_folder(folder_lookup):
    def wrapper(f):
        def check_os_path_exists(path):

            if not path.endswith(EXPORT_FOLDER_NAME):
                raise Exception(
                    "Checking os.path.exists only mocked for kolibri data folder paths."
                )

            base_path = os.path.realpath(os.path.join(path, ".."))

            if base_path not in folder_lookup:
                raise Exception(
                    "os.path.exists() called for an unmocked path '{}'!".format(path)
                )

            return folder_lookup[base_path]

        return patch("os.path.exists", check_os_path_exists)(f)

    return wrapper


def mocked_wmic_output():
    return windows_data.wmic_csv


class WindowsFilesystemTestCase(TestCase):
    """
    Test retrieval and parsing of disk info for Windows, using mocked command output.
    """

    @patch_os_access(windows_data.os_access_read, windows_data.os_access_write)
    @patch_os_path_exists_for_kolibri_folder(windows_data.has_kolibri_data_folder)
    @patch("sys.platform", "win32")
    @patch("os.path", ntpath)
    @patch(
        "kolibri.core.discovery.utils.filesystem.windows._wmic_output",
        mocked_wmic_output,
    )
    def setUp(self):
        self.drives = enumerate_mounted_disk_partitions()
        self.c_drive = self.drives["3bd36621a8f83b8693a9443bca0f6249"]
        self.d_drive = self.drives["3f6139dd093efa3c0f1494d26aaefe6a"]

    def test_drive_list_members(self):
        self.assertSetEqual(
            {drive.path for drive in self.drives.values()}, set(["C:\\", "D:\\"])
        )

    def test_drive_writability(self):
        self.assertTrue(self.c_drive.writable)
        self.assertTrue(self.d_drive.writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.c_drive.datafolder, "C:\\" + EXPORT_FOLDER_NAME)
        self.assertEqual(self.d_drive.datafolder, "D:\\" + EXPORT_FOLDER_NAME)

    def test_drive_space(self):
        self.assertEqual(self.c_drive.freespace, 132940218368)
        self.assertEqual(self.c_drive.totalspace, 136251727872)
        self.assertEqual(self.d_drive.freespace, 0)
        self.assertEqual(self.d_drive.totalspace, 58388480)

    def test_drive_names(self):
        self.assertEqual(self.c_drive.name, "Local Fixed Disk")
        self.assertEqual(self.d_drive.name, "VBOXADDITIONS_4.")


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
        self.f571_drive = self.drives["d2f96b64797f558fdee1ce09b05a2e0b"]
        self.root_drive = self.drives["72811d8a13d19fb91b281155853b6d29"]
        self.disk_drive = self.drives["c84ca86ee4163913ceedccbc892338ac"]

    def test_drive_list_members(self):
        self.assertSetEqual(
            {drive.path for drive in self.drives.values()},
            set(["/media/user/F571-7814", "/", "/media/user/disk"]),
        )

    def test_drive_writability(self):
        self.assertTrue(self.root_drive.writable)
        self.assertTrue(self.f571_drive.writable)
        self.assertFalse(self.disk_drive.writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.root_drive.datafolder, "/" + EXPORT_FOLDER_NAME)
        self.assertEqual(
            self.f571_drive.datafolder, "/media/user/F571-7814/" + EXPORT_FOLDER_NAME
        )
        self.assertEqual(
            self.disk_drive.datafolder, "/media/user/disk/" + EXPORT_FOLDER_NAME
        )

    def test_drive_space(self):
        self.assertEqual(self.f571_drive.freespace, 772001792)
        self.assertEqual(self.f571_drive.totalspace, 2142232576)
        self.assertEqual(self.root_drive.freespace, 12704473088)
        self.assertEqual(self.root_drive.totalspace, 117579513856)
        self.assertEqual(self.disk_drive.freespace, 11328000)
        self.assertEqual(self.disk_drive.totalspace, 31801344)


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
        self.hp_drive = self.drives["564505d949b37895bd0426ee5d270060"]
        self.root_drive = self.drives["b933f0b9c3b63a90fbd78bfcece4c87a"]

    def test_drive_list_members(self):
        self.assertSetEqual(
            {drive.path for drive in self.drives.values()},
            set(["/Volumes/HP v125w", "/"]),
        )

    def test_drive_writability(self):
        self.assertFalse(self.root_drive.writable)
        self.assertTrue(self.hp_drive.writable)

    def test_drive_data_folders(self):
        self.assertEqual(self.root_drive.datafolder, "/" + EXPORT_FOLDER_NAME)
        self.assertEqual(
            self.hp_drive.datafolder, "/Volumes/HP v125w/" + EXPORT_FOLDER_NAME
        )

    def test_drive_space(self):
        self.assertEqual(self.hp_drive.freespace, 1234)
        self.assertEqual(self.hp_drive.totalspace, 45678)
        self.assertEqual(self.root_drive.freespace, 0)
        self.assertEqual(self.root_drive.totalspace, 1000)

    def test_drive_names(self):
        self.assertEqual(self.hp_drive.name, "Untitled 1")
        self.assertEqual(self.root_drive.name, "Macintosh HD")
