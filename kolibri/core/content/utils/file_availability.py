import hashlib
import json
import os
import re
from itertools import compress

from django.utils.text import compress_string

from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.paths import get_content_storage_dir_path
from kolibri.core.content.utils.paths import get_file_checksums_url
from kolibri.core.discovery.models import NetworkLocation
from kolibri.core.discovery.utils.network.client import NetworkClient
from kolibri.core.discovery.utils.network.errors import NetworkLocationResponseFailure
from kolibri.core.utils.cache import process_cache

checksum_regex = re.compile("^([a-f0-9]{32})$")


class LocationError(Exception):
    """
    An exception raised when an import location is invalid.
    """

    pass


def generate_checksum_integer_mask(checksums, available_checksums):
    return sum(
        int(checksum in available_checksums) << i
        for i, checksum in enumerate(checksums)
    )


def _generate_mask_from_integer(integer_mask):
    while integer_mask:
        yield bool(integer_mask % 2)
        integer_mask //= 2


def get_available_checksums_from_remote(channel_id, peer_id):
    """
    The current implementation prioritizes minimising requests to the remote server.
    In order to achieve this, it caches based on the baseurl and the channel_id.
    Also, it POSTs the complete list of non-supplementary files to the rmeote endpoint,
    and thus can keep this representation cached regardless of how the availability on
    the local server has changed in the interim.
    """
    try:
        baseurl = NetworkLocation.objects.values_list("base_url", flat=True).get(
            id=peer_id
        )
    except NetworkLocation.DoesNotExist:
        raise LocationError("Peer with id {} does not exist".format(peer_id))

    CACHE_KEY = "PEER_AVAILABLE_CHECKSUMS_{baseurl}_{channel_id}".format(
        baseurl=baseurl, channel_id=channel_id
    )
    if CACHE_KEY not in process_cache:

        channel_checksums = (
            LocalFile.objects.filter(
                files__contentnode__channel_id=channel_id, files__supplementary=False
            )
            .values_list("id", flat=True)
            .distinct()
        )
        client = NetworkClient.build_for_address(baseurl)
        try:
            response = client.post(
                get_file_checksums_url(channel_id, baseurl),
                data=compress_string(
                    bytes(json.dumps(list(channel_checksums)).encode("utf-8"))
                ),
                headers={"content-type": "application/gzip"},
            )
        except NetworkLocationResponseFailure as e:
            response = e.response

        checksums = None

        # Do something if we got a successful return
        if response.status_code == 200:
            try:
                integer_mask = int(response.content)

                # Filter to avoid passing in bad checksums
                checksums = set(
                    compress(
                        channel_checksums, _generate_mask_from_integer(integer_mask)
                    )
                )
                process_cache.set(CACHE_KEY, checksums, 3600)
            except (ValueError, TypeError):
                # Bad JSON parsing will throw ValueError
                # If the result of the json.loads is not iterable, a TypeError will be thrown
                # If we end up here, just set checksums to None to allow us to cleanly continue
                pass
    else:
        checksums = process_cache.get(CACHE_KEY)
    return checksums


def _max_mtime_in_immediate_subdirs(content_dir, max_mtime):
    if not content_dir:
        return max_mtime
    try:
        with os.scandir(content_dir) as entries:
            for entry in entries:
                if entry.is_dir(follow_symlinks=False):
                    try:
                        max_mtime = max(
                            max_mtime,
                            entry.stat(follow_symlinks=False).st_mtime_ns,
                        )
                    except (FileNotFoundError, PermissionError, OSError):
                        pass
    except (FileNotFoundError, PermissionError, OSError):
        pass
    return max_mtime


def _content_dir_version(content_dir):
    # Fingerprint using max mtime across content dir and its immediate subdirectories.
    if not content_dir:
        return 0
    try:
        max_mtime = os.stat(content_dir).st_mtime_ns
    except (FileNotFoundError, NotADirectoryError, PermissionError, OSError):
        return 0
    return _max_mtime_in_immediate_subdirs(content_dir, max_mtime)


def _collect_disk_checksums(content_dir):

    checksums = set()
    if not content_dir:
        return checksums

    try:
        for _, _, files in os.walk(content_dir):
            for name in files:
                checksum = os.path.splitext(name)[0]
                if checksum_regex.match(checksum):
                    checksums.add(checksum)
    except (FileNotFoundError, PermissionError, OSError):
        return set()
    return checksums


def get_available_checksums_from_disk(channel_id, drive_id):
    """
    Version cache keys by a content-dir fingerprint so changes
    on disk invalidate both per-disk and per-channel caches.
    """
    try:
        basepath = get_mounted_drive_by_id(drive_id).datafolder
    except KeyError:
        raise LocationError("Drive with id {} does not exist".format(drive_id))

    try:
        content_dir = get_content_storage_dir_path(datafolder=basepath)
    except Exception:
        content_dir = None

    key_base = hashlib.sha1(str(basepath).encode("utf-8")).hexdigest()[:16]
    version = _content_dir_version(content_dir)

    PER_DISK_CACHE_KEY = f"DISK_AVAILABLE_CHECKSUMS_{key_base}_{version}"
    PER_DISK_PER_CHANNEL_CACHE_KEY = (
        f"DISK_AVAILABLE_CHECKSUMS_{key_base}_{channel_id}_{version}"
    )

    if PER_DISK_PER_CHANNEL_CACHE_KEY not in process_cache:
        if PER_DISK_CACHE_KEY not in process_cache:
            try:
                content_dir = get_content_storage_dir_path(datafolder=basepath)
            except Exception:
                content_dir = None

            # Cache as frozenset to avoid repeated conversions
            disk_checksums = _collect_disk_checksums(content_dir)
            process_cache.set(PER_DISK_CACHE_KEY, frozenset(disk_checksums), 3600)
        else:
            disk_checksums = set(process_cache.get(PER_DISK_CACHE_KEY))

        checksums = set(
            LocalFile.objects.filter(files__contentnode__channel_id=channel_id)
            .values_list("id", flat=True)
            .distinct()
        ).intersection(disk_checksums)

        process_cache.set(PER_DISK_PER_CHANNEL_CACHE_KEY, checksums, 3600)
    else:
        checksums = process_cache.get(PER_DISK_PER_CHANNEL_CACHE_KEY)

    return checksums
