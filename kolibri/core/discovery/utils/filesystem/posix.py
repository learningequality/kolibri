import logging
import os
import re
import shutil
import subprocess
import sys

from .constants import drivetypes
from kolibri.utils.android import on_android

logger = logging.getLogger(__name__)

# Regex parser for the output of `mount` on OSX, which contains rows that looks like:
#  /dev/disk1s1 on /Volumes/HP v125w (msdos, local, nodev, nosuid, noowners)
OSX_MOUNT_PARSER = re.compile(
    r"^(?P<device>\S+) on (?P<path>.+) \((?P<filesystem>[^, ]+)", flags=re.MULTILINE
)

# Regex parser for the output of `mount` on Linux, which contains rows that looks like:
#  /dev/sdb2 on /media/user/KEEPOD type ext4 (rw,nosuid,nodev,uhelper=udisks2)
LINUX_MOUNT_PARSER = re.compile(
    r"^(?P<device>\S+) on (?P<path>.+) type (?P<filesystem>\S+)", flags=re.MULTILINE
)

# Regex parser for the output of 'mount' on Android, which contains rows that looks like:
#  /dev/block/bootdevice/by-name/userdata /data ext4 rw,seclabel,nosuid,nodev,noatime,noauto_da_alloc,data=ordered 0 0
# Note that access to /proc/ is restricted in later versions of Android. Will break the app.
RAW_MOUNT_PARSER = re.compile(
    r"^(?P<device>\S+) (?P<path>\S+) (?P<filesystem>\S+)", flags=re.MULTILINE
)


FILESYSTEM_BLACKLIST = set(
    [
        "anon_inodefs",
        "bdev",
        "binfmt_misc",
        "cgroup",
        "cpuset",
        "debugfs",
        "devpts",
        "devtmpfs",
        "ecryptfs",
        "fuse",
        "fuse.gvfsd-fuse",
        "fuse.portal",
        "fusectl",
        "hugetlbfs",
        "mqueue",
        "nfs",
        "nfs4",
        "nfsd",
        "pipefs",
        "proc",
        "pstore",
        "ramfs",
        "rootfs",
        "rpc_pipefs",
        "securityfs",
        "sockfs",
        "sysfs",
        "tmpfs",
        "cgmfs",
    ]
)

# These paths can be mounted as separate drives/partitions,
# so they should not be shown in the list of import/export drives.
PATH_PREFIX_BLACKLIST = ["/proc", "/sys", "/tmp", "/var", "/boot", "/dev"]


def get_drive_list():
    """
    Gets a list of drives and metadata by parsing the output of `mount`, and adding additional info from various commands.
    Disk size/usage comes from shutil.disk_usage or os.statvfs, and name/type info from dbus (Linux) or diskutil (OSX).
    """

    if sys.platform == "darwin":
        MOUNT_PARSER = OSX_MOUNT_PARSER
    else:
        MOUNT_PARSER = LINUX_MOUNT_PARSER

    try:
        drivelist = subprocess.Popen("mount", shell=True, stdout=subprocess.PIPE)
        drivelisto, err = drivelist.communicate()
        # Some Android devices at least now use the LINUX_MOUNT_PARSER format.
        # Try it and revert to RAW_MOUNT_PARSER if we can't find any matches with it.
        if on_android() and not MOUNT_PARSER.match(drivelisto.decode()):
            MOUNT_PARSER = RAW_MOUNT_PARSER
    except OSError:  # couldn't run `mount`, let's try reading the /etc/mounts listing directly
        with open("/proc/mounts") as f:
            drivelisto = f.read()
        MOUNT_PARSER = RAW_MOUNT_PARSER

    drives = []

    for drivematch in MOUNT_PARSER.finditer(drivelisto.decode()):

        drive = drivematch.groupdict()
        path = (
            drive["path"]
            .replace("\\040", " ")
            .replace("\\011", "\t")
            .replace("\\012", "\n")
            .replace("\\134", "\\")
        )

        # skip the drive if the filesystem or path is in a blacklist
        if drive["filesystem"] in FILESYSTEM_BLACKLIST or any(
            path.startswith(p) for p in PATH_PREFIX_BLACKLIST
        ):
            logger.debug("Skipping blacklisted drive '{}'".format(path))
            continue

        # skip if we don't have read access to the drive
        if not os.access(path, os.R_OK):
            continue

        # attempt to get some additional metadata about the drive
        try:
            usage = _get_drive_usage(path)
        except OSError:
            # skip if we don't have access to get drive usage
            continue

        dbus_drive_info = _try_to_get_drive_info_from_dbus(drive["device"])
        diskutil_info = _try_to_get_drive_info_from_diskutil(drive["device"])

        # combine the various metadata sources to construct the overall drive metadata
        drives.append(
            {
                "path": path,
                "name": dbus_drive_info.get("name")
                or diskutil_info.get("name")
                or path,
                "filesystem": drive["filesystem"],
                "freespace": usage["free"],
                "totalspace": usage["total"],
                "drivetype": dbus_drive_info.get("drivetype")
                or diskutil_info.get("drivetype")
                or "",
                "guid": dbus_drive_info.get("guid")
                or diskutil_info.get("guid")
                or drive["device"],
            }
        )

    return drives


def _get_drive_usage(path):
    """
    Use Python libraries to get drive space/usage statistics. Prior to v3.3, use `os.statvfs`;
    on v3.3+, use the more accurate `shutil.disk_usage`.
    """
    if sys.version_info >= (3, 3):
        usage = shutil.disk_usage(path)
        return {"total": usage.total, "used": usage.used, "free": usage.free}
    if on_android():
        from jnius import autoclass

        StatFs = autoclass("android.os.StatFs")
        AndroidString = autoclass("java.lang.String")
        stats = StatFs(AndroidString(path))
        return {
            "total": stats.getBlockCountLong() * stats.getBlockSizeLong(),
            "free": stats.getAvailableBlocksLong() * stats.getBlockSizeLong(),
        }
    # with os.statvfs, we need to multiple block sizes by block counts to get bytes
    stats = os.statvfs(path)
    total = stats.f_frsize * stats.f_blocks
    free = stats.f_frsize * stats.f_bavail
    return {"total": total, "free": free, "used": total - free}


def _try_to_get_drive_info_from_dbus(device):
    """
    One of the only ways to access a lot of useful information about drives, without requiring root/sudo,
    is through DBUS. The Python library for DBUS is not always installed, but use it if available.
    """

    # ensure the device is under /dev, and extract the block device name
    path_components = os.path.split(device)
    if path_components[0] != "/dev":
        return {}
    block_device_name = path_components[-1]

    # try importing dbus, and exit gracefully if it fails
    try:
        import dbus
    except ImportError:
        return {}

    try:

        bus = dbus.SystemBus()

        # get the block object based on the block device name
        block_obj = bus.get_object(
            "org.freedesktop.UDisks2",
            "/org/freedesktop/UDisks2/block_devices/" + block_device_name,
        )
        block_iface = dbus.Interface(block_obj, "org.freedesktop.DBus.Properties")
        block = block_iface.GetAll("org.freedesktop.UDisks2.Block")

        # get the drive object, based on the drive identifier from the block object
        drive_path = block.get("Drive")
        drive_obj = bus.get_object("org.freedesktop.UDisks2", drive_path)
        drive_iface = dbus.Interface(drive_obj, "org.freedesktop.DBus.Properties")
        drive = drive_iface.GetAll("org.freedesktop.UDisks2.Drive")

        # extract the name and guid from the block and drive properties, calculate drivetype, and return
        return {
            "name": str(
                block.get("IdLabel")
                or " ".join([drive.get("Vendor"), drive.get("Model")]).strip()
            ),
            "guid": str(block.get("IdUUID") or drive.get("Serial") or drive.get("Id")),
            "drivetype": _get_drivetype_from_dbus_drive_properties(drive),
        }

    except ValueError:
        return {}
    except dbus.exceptions.DBusException:
        return {}


def _get_drivetype_from_dbus_drive_properties(drive_props):
    """
    Read the block and drive properties from dbus drive props object to determine our best guess at the drive type.
    """
    if (
        drive_props.get("ConnectionBus") == "sdio"
        or drive_props.get("Media") == "flash_sd"
    ):
        return drivetypes.SD_CARD
    if drive_props.get("ConnectionBus") == "usb" or drive_props.get("Media") == "thumb":
        return drivetypes.USB_DEVICE
    if drive_props.get("Optical"):
        return drivetypes.OPTICAL_DRIVE
    if drive_props.get("Removable") or drive_props.get("MediaRemovable"):
        return drivetypes.USB_DEVICE
    return drivetypes.UNKNOWN


def _try_to_get_drive_info_from_diskutil(device):
    """
    On OSX, the best way to get disk info is with `diskutil`.
    """
    # we only use diskutil on OSX
    if sys.platform != "darwin":
        return {}

    # skip non-device mounts
    if not device.startswith("/dev/"):
        return {}

    # run the command and read the results
    diskutilp = subprocess.Popen(
        "diskutil info {}".format(device), shell=True, stdout=subprocess.PIPE
    )
    diskutil_output, err = diskutilp.communicate()

    rows = [
        line.split(":", 1)
        for line in diskutil_output.decode().split("\n")
        if ":" in line
    ]
    metadata = dict([(key.strip(), val.strip()) for key, val in rows])

    # determine what type of drive it is (not sure what an optical drive shows up as, but OSX + optical is now uncommon)
    if metadata.get("Protocol") == "USB":
        drivetype = drivetypes.USB_DEVICE
    elif metadata.get("Internal") == "Yes":
        drivetype = drivetypes.INTERNAL_DRIVE
    else:
        drivetype = drivetypes.UNKNOWN

    # extract the name and guid from the diskutil drive metadata, and return
    return {
        "drivetype": drivetype,
        "name": metadata.get("Volume Name")
        or metadata.get("Device / Media Name")
        or "",
        "guid": metadata.get("Volume UUID") or "",
    }
