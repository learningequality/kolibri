import codecs
import csv
import json
import logging
import os
import subprocess
import tempfile
import uuid

from .constants import drivetypes

logger = logging.getLogger(__name__)

_DRIVE_TYPES = [
    drivetypes.UNKNOWN,
    "#noroot",
    drivetypes.USB_DEVICE,
    drivetypes.INTERNAL_DRIVE,
    drivetypes.NETWORK_DRIVE,
    drivetypes.OPTICAL_DRIVE,
    "#ram",
]


def _get_drive_name(drive, path):
    # More robustly name drives with multiple fallbacks
    if drive.get("VolumeName"):
        return drive.get("VolumeName")
    caption = drive.get("Caption")
    description = drive.get("Description")
    if caption and description:
        return "{} ({})".format(caption, description)
    elif caption:
        return caption
    elif description:
        return description
    return path


def get_drive_list():

    drives = []

    try:
        drive_list = _parse_wmic_csv_output(_wmic_output())
    except Exception as e:
        if "Could not run command" not in str(e):
            raise
        drive_list = _get_drive_list_powershell()

    for drive in drive_list:

        # look up the drive type name
        drivetype = _DRIVE_TYPES[int(drive.get("DriveType") or "0")]

        # skip drives that have invalid types
        if drivetype.startswith("#"):
            logger.debug(
                "Skipping drive '{}' with invalid type: {}".format(
                    drive.get("DeviceID"), drivetype
                )
            )
            continue

        # construct a path (including "\") from DeviceID, plus fallbacks in case it's not defined for some reason
        path = "{}\\".format(
            drive.get("DeviceID") or drive.get("Caption") or drive.get("Name")
        )

        # skip if there's an indication that this is an empty CD-ROM
        if not drive.get("Size"):
            continue

        # skip if we don't have read access to the drive
        if not os.access(path, os.R_OK):
            continue

        name = _get_drive_name(drive, path)
        # combine the metadata, using backup fields for missing pieces, and return
        drives.append(
            {
                "path": path,
                "name": name,
                "filesystem": drive.get("FileSystem").lower(),
                "freespace": int(drive.get("FreeSpace") or 0),
                "totalspace": int(drive.get("Size") or 0),
                "drivetype": drivetype,
                "guid": drive.get("VolumeSerialNumber"),
            }
        )

    return drives


def _wmic_output():
    """
    Returns the output from running the built-in `wmic` command.

    Redirects the output of `wmic` to a temporary file and then reads it back in.
    This would be cleaner if done using subprocess, but attempting to capture
    `stdout` internally led to freezing under Windows XP. (This may have been
    happening because the script is not being run as a main process.)
    """

    # choose a unique file name (re-entrant/thread-safe/crash-safe)
    OUTPUT_PATH = os.path.join(
        tempfile.gettempdir(), "kolibri_disks-{}.txt".format(uuid.uuid4())
    )

    # fallback when en-us directory does not exist
    cmd = 'wmic logicaldisk list full /format:csv > "{}"'.format(OUTPUT_PATH)
    try:
        # pipe output from the WMIC command to the temp file
        csv_path = os.path.join(
            os.environ["WINDIR"], "System32", "wbem", "en-us", "csv.xsl"
        )
        # If csv_path exists, use a different WMIC command.
        if os.path.exists(csv_path):
            cmd = 'wmic logicaldisk list full /format:"{}" > "{}"'.format(
                csv_path, OUTPUT_PATH
            )
    except KeyError:
        # If WINDIR is undefined on env
        pass
    returnCode = os.system(cmd)
    if returnCode:
        raise Exception("Could not run command '{}'".format(cmd))

    # output from WMIC is ostensibly UTF-16
    with open(OUTPUT_PATH, "rb") as f:
        bin_output = f.read()

    # The very first time WMIC is run on a windows machine, the output gets mangled.
    # The BOM is replaced by WMIC's initialization message, so we need to put it back.
    # (On all subsequent runs, these next lines do nothing.)
    INIT_MSG = "Please wait while WMIC is being installed.".encode(
        "ascii"
    )  # Yes, ascii.
    bin_output = bin_output.replace(INIT_MSG, codecs.BOM_UTF16)

    # finally, decode the well-formatted UTF-16 byte string
    output = bin_output.decode("utf-16")

    # clean up temp file
    os.remove(OUTPUT_PATH)

    return output


def _parse_wmic_csv_output(text):
    """
    Parse the output of Windows "wmic logicaldisk list full /format:csv" command.
    """

    # parse out the comma-separated values of each non-empty row
    rows = [row for row in csv.reader(text.split("\n")) if row]

    # use the first row as the header row
    header = rows.pop(0)

    # turn each row into a dict, mapping the header text of each column to the row's value for that column
    return [dict(zip(header, row)) for row in rows]


def _get_drive_list_powershell():
    """
    Get the list of drives using PowerShell when wmic is unavailable.
    Returns data in a format compatible with the wmic csv output parsing.
    """

    # Create a unique temp file
    temp_file_path = os.path.join(
        tempfile.gettempdir(), "kolibri_disks_ps-{}.json".format(uuid.uuid4())
    )

    # PowerShell command with explicit property selection
    powershell_cmd = [
        "powershell",
        "-NoProfile",
        "-ExecutionPolicy",
        "Bypass",
        "-Command",
        "Get-WmiObject -Class Win32_LogicalDisk | "
        "Select-Object @{Name='DeviceID';Expression={$_.DeviceID}}, "
        "@{Name='DriveType';Expression={$_.DriveType}}, "
        "@{Name='Caption';Expression={$_.Caption}}, "
        "@{Name='Description';Expression={$_.Description}}, "
        "@{Name='VolumeName';Expression={$_.VolumeName}}, "
        "@{Name='Size';Expression={$_.Size}}, "
        "@{Name='FreeSpace';Expression={$_.FreeSpace}}, "
        "@{Name='FileSystem';Expression={$_.FileSystem}}, "
        "@{Name='VolumeSerialNumber';Expression={$_.VolumeSerialNumber}} | "
        f"ConvertTo-Json | Out-File -FilePath '{temp_file_path}' -Encoding utf8",
    ]

    # Run the command
    subprocess.run(powershell_cmd, check=True, capture_output=True)

    disks_data = []

    # Read and parse the JSON file
    if os.path.exists(temp_file_path) and os.path.getsize(temp_file_path) > 0:
        # Open the file with utf-8-sig encoding to handle BOM
        with open(temp_file_path, "r", encoding="utf-8-sig") as f:
            content = f.read().strip()

            disks_data = json.loads(content or "[]")

            # Handle case where only one disk is returned (not in a list)
            if not isinstance(disks_data, list):
                disks_data = [disks_data]

    os.remove(temp_file_path)

    return disks_data
