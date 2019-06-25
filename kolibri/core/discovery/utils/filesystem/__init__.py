import hashlib
import logging
import os
import sys
from collections import namedtuple

from .posix import get_drive_list as get_drive_list_posix
from .windows import get_drive_list as get_drive_list_windows

logger = logging.getLogger(__name__)

# The name of the folder we export data and content to, and what we look for in drives when we want to import
EXPORT_FOLDER_NAME = "KOLIBRI_DATA"

DriveData = namedtuple(
    "DriveData",
    [
        "id",
        "name",
        "path",
        "writable",
        "datafolder",
        "freespace",
        "totalspace",
        "filesystem",
        "drivetype",
        "metadata",
    ],
)


def enumerate_mounted_disk_partitions():
    """
    Searches the local device for attached partitions/drives, and computes metadata about each one.
    Returns a dict that maps drive IDs to DriveData objects containing metadata about each drive.
    Note that drives for which the current user does not have read permissions are not included.
    """

    if sys.platform == "win32":
        drive_list = get_drive_list_windows()
    else:
        drive_list = get_drive_list_posix()

    drives = {}

    for drive in drive_list:

        path = drive["path"]
        drive_id = hashlib.sha1((drive["guid"] or path).encode("utf-8")).hexdigest()[
            :32
        ]
        datafolder = get_kolibri_data_dir_path(path)

        # If the Kolibri data directory has been manually created by the user,
        # check if the data directory is writable. Otherwise, check if the path
        # is writable so Kolibri can create the data directory there.
        if os.path.exists(datafolder):
            check_writable_path = datafolder
        else:
            check_writable_path = path

        drives[drive_id] = DriveData(
            id=drive_id,
            path=path,
            name=drive["name"],
            writable=os.access(check_writable_path, os.W_OK),
            datafolder=datafolder,
            freespace=drive["freespace"],
            totalspace=drive["totalspace"],
            filesystem=drive["filesystem"],
            drivetype=drive["drivetype"],
            metadata={},
        )

    return drives


def get_kolibri_data_dir_path(folder):
    """
    Constructs an export data folder path by concatenating the parent folder
    to the EXPORT_FOLDER_NAME folder name.
    """

    return os.path.join(folder, EXPORT_FOLDER_NAME)
