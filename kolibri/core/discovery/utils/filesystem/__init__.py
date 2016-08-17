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
    ]
)

def enumerate_mounted_disk_partitions():
    """
    Searches the local device for attached partitions/drives, and computes metadata about each one.
    Returns a dict that maps mount paths to DriveData objects containing metadata about each drive.
    Note that drives for which the current user does not have read permissions are not included.
    """

    if sys.platform == "win32":
        drive_list = get_drive_list_windows()
    else:
        drive_list = get_drive_list_posix()

    drives = {}

    for drive in drive_list:

        path = drive["path"]

        drives[path] = DriveData(
            id=drive["guid"] or path,
            path=path,
            name=drive["name"],
            writable=os.access(path, os.W_OK),
            datafolder=find_kolibri_data_folder(path),
            freespace=drive["freespace"],
            totalspace=drive["totalspace"],
            filesystem=drive["filesystem"],
            drivetype=drive["drivetype"],
            metadata={},
        )

    return drives


def find_kolibri_data_folder(folder):
    """
    Looks for a folder with name matching EXPORT_FOLDER_NAME underneath the provided folder path.
    If it is found, the full path to the data folder is returned. Otherwise, None is returned.
    """

    kolibri_data_dir = os.path.join(
        folder,
        EXPORT_FOLDER_NAME,
    )

    if os.path.exists(kolibri_data_dir):
        return kolibri_data_dir
    else:
        return None
