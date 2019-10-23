import json
import os
import re

import requests
from django.core.cache import cache

from kolibri.core.content.models import LocalFile
from kolibri.core.content.utils.paths import get_content_storage_dir_path
from kolibri.core.content.utils.paths import get_file_checksums_url


checksum_regex = re.compile("^([a-f0-9]{32})$")


def get_available_checksums_from_remote(channel_id, baseurl):
    CACHE_KEY = "PEER_AVAILABLE_CHECKSUMS_{baseurl}_{channel_id}".format(
        baseurl=baseurl, channel_id=channel_id
    )
    if CACHE_KEY not in cache:
        response = requests.get(get_file_checksums_url(channel_id, baseurl))

        checksums = None

        # Do something if we got a successful return
        if response.status_code == 200:
            try:
                checksums = json.loads(response.content)
                # Filter to avoid passing in bad checksums
                checksums = [
                    checksum for checksum in checksums if checksum_regex.match(checksum)
                ]
                cache.set(CACHE_KEY, checksums, 3600)
            except (ValueError, TypeError):
                # Bad JSON parsing will throw ValueError
                # If the result of the json.loads is not iterable, a TypeError will be thrown
                # If we end up here, just set checksums to None to allow us to cleanly continue
                pass
    return cache.get(CACHE_KEY)


def get_available_checksums_from_disk(channel_id, basepath):
    PER_DISK_CACHE_KEY = "DISK_AVAILABLE_CHECKSUMS_{basepath}".format(basepath=basepath)
    PER_DISK_PER_CHANNEL_CACHE_KEY = "DISK_AVAILABLE_CHECKSUMS_{basepath}_{channel_id}".format(
        basepath=basepath, channel_id=channel_id
    )
    if PER_DISK_PER_CHANNEL_CACHE_KEY not in cache:
        if PER_DISK_CACHE_KEY not in cache:
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
            cache.set(PER_DISK_CACHE_KEY, disk_checksums, 3600)
        disk_checksums = set(cache.get(PER_DISK_CACHE_KEY))
        channel_checksums = set(
            LocalFile.objects.filter(
                files__contentnode__channel_id=channel_id
            ).values_list("id", flat=True)
        )
        cache.set(
            PER_DISK_PER_CHANNEL_CACHE_KEY,
            channel_checksums.intersection(disk_checksums),
            3600,
        )
    return cache.get(PER_DISK_PER_CHANNEL_CACHE_KEY)
