import json
import os
import re
from itertools import compress

import requests
from django.utils.text import compress_string

from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.channels import get_mounted_drive_by_id
from kolibri.core.content.utils.paths import get_content_storage_dir_path
from kolibri.core.content.utils.paths import get_file_checksums_url
from kolibri.core.discovery.models import NetworkLocation
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

        response = requests.post(
            get_file_checksums_url(channel_id, baseurl),
            data=compress_string(
                bytes(json.dumps(list(channel_checksums)).encode("utf-8"))
            ),
            headers={"content-type": "application/gzip"},
        )

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


def get_available_checksums_from_disk(channel_id, drive_id):
    try:
        basepath = get_mounted_drive_by_id(drive_id).datafolder
    except KeyError:
        raise LocationError("Drive with id {} does not exist".format(drive_id))
    PER_DISK_CACHE_KEY = "DISK_AVAILABLE_CHECKSUMS_{basepath}".format(basepath=basepath)
    PER_DISK_PER_CHANNEL_CACHE_KEY = (
        "DISK_AVAILABLE_CHECKSUMS_{basepath}_{channel_id}".format(
            basepath=basepath, channel_id=channel_id
        )
    )
    if PER_DISK_PER_CHANNEL_CACHE_KEY not in process_cache:
        if PER_DISK_CACHE_KEY not in process_cache:
            content_dir = get_content_storage_dir_path(datafolder=basepath)

            disk_checksums = []

            for _, _, files in os.walk(content_dir):
                for name in files:
                    checksum = os.path.splitext(name)[0]
                    # Only add valid checksums formatted according to our standard filename
                    if checksum_regex.match(checksum):
                        disk_checksums.append(checksum)
            # Cache is per device, so a relatively long lived one should
            # be fine.
            process_cache.set(PER_DISK_CACHE_KEY, disk_checksums, 3600)
        else:
            disk_checksums = process_cache.get(PER_DISK_CACHE_KEY)
        checksums = set(
            LocalFile.objects.filter(
                files__contentnode__channel_id=channel_id
            ).values_list("id", flat=True)
        ).intersection(set(disk_checksums))
        process_cache.set(PER_DISK_PER_CHANNEL_CACHE_KEY, checksums, 3600)
    else:
        checksums = process_cache.get(PER_DISK_PER_CHANNEL_CACHE_KEY)
    return checksums
