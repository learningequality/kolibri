import os
from collections import namedtuple

import psutil

# The name of the folder we export data and content to, and what we look for in drives when we want to import
EXPORT_FOLDER_NAME = "KOLIBRI_DATA"

DriveData = namedtuple(
    "DriveData",
    [
        "id",
        "name",
        "path",
        "readable",
        "writable",
        "data_folder",
        "metadata",
    ]
)


def enumerate_mounted_disk_partitions(physical_drives_only=True):
    drive_list = psutil.disk_partitions(all=(not physical_drives_only))

    drives = {}

    for drive in drive_list:

        path = drive.mountpoint

        drives[path] = DriveData(
            id=path,
            path=path,
            name=path,
            readable=os.access(path, os.R_OK),
            writable=os.access(path, os.W_OK),
            data_folder=find_kolibri_data_folder(path),
            metadata={},
        )

    return drives


def find_kolibri_data_folder(folder):
    kolibri_data_dir = os.path.join(
        folder,
        EXPORT_FOLDER_NAME,
    )

    if os.path.exists(kolibri_data_dir):
        return kolibri_data_dir
    else:
        return None
