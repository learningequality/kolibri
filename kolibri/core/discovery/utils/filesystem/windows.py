import logging
import os
import re

from .constants import drivetypes

logger = logging.getLogger(__name__)

_DRIVE_TYPES = [drivetypes.UNKNOWN, "#noroot", drivetypes.USB_DEVICE, drivetypes.INTERNAL_DRIVE, drivetypes.NETWORK_DRIVE, drivetypes.OPTICAL_DRIVE, "#ram"]

def get_drive_list():

    drives = []

    drive_list = _parse_wmic_output(os.popen('wmic logicaldisk').read())

    for drive in drive_list:

        # look up the drive type name
        drivetype = _DRIVE_TYPES[int(drive.get("DriveType") or "0")]

        # skip drives that have invalid types
        if drivetype.startswith("#"):
            logger.debug("Skipping drive '{}' with invalid type: {}".format(drive.get("DeviceID"), drivetype))
            continue

        # construct a path (including "\") from DeviceID, plus fallbacks in case it's not defined for some reason
        path = "{}\\".format(drive.get("DeviceID") or drive.get("Caption") or drive.get("Name"))

        # skip if we don't have read access to the drive
        if not os.access(path, os.R_OK):
            continue

        # combine the metadata, using backup fields for missing pieces, and return
        drives.append({
            "path": path,
            "name": drive.get("VolumeName") or drive.get("Description"),
            "filesystem": drive.get("FileSystem").lower(),
            "freespace": int(drive.get("FreeSpace") or 0),
            "totalspace": int(drive.get("Size") or 0),
            "drivetype": drivetype,
            "guid": drive.get("VolumeSerialNumber"),
        })

    return drives

def _parse_wmic_output(text):
    """
    Parse the output of Windows "wmic" command.
    Adapted from: http://autosqa.com/blog/index.php/2016/03/18/how-to-parse-wmic-output-with-python/
    """
    result = []
    # remove empty lines
    lines = [s for s in text.splitlines() if s.strip()]
    # No Instance(s) Available
    if len(lines) == 0:
        return result
    header_line = lines[0]
    # Find headers and their positions
    headers = re.findall('\S+\s+|\S$', header_line)
    pos = [0]
    for header in headers:
        pos.append(pos[-1] + len(header))
    for i in range(len(headers)):
        headers[i] = headers[i].strip()
    # Parse each entries
    for r in range(1, len(lines)):
        row = {}
        for i in range(len(pos)-1):
            row[headers[i]] = lines[r][pos[i]:pos[i+1]].strip()
        result.append(row)
    return result
